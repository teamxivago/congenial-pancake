import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createReadStream } from 'fs';
import { rm, stat } from 'fs/promises';
import { Readable } from 'stream';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { StudioRepository } from '@gitroom/nestjs-libraries/database/prisma/studio/studio.repository';
import {
  StudioAutomationDto,
  StudioContentDto,
} from '@gitroom/nestjs-libraries/dtos/studio/studio.dto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { studioKeys } from '@gitroom/nestjs-libraries/studio/studio.keys';
import { TrendManager } from '@gitroom/nestjs-libraries/studio/trends/trend.manager';
import { StudioVideoManager } from '@gitroom/nestjs-libraries/studio/videos/studio.video.manager';
import { StudioScriptService } from '@gitroom/nestjs-libraries/studio/script/studio.script.service';
import {
  StudioScript,
  studioScriptSchema,
} from '@gitroom/nestjs-libraries/studio/script/studio.script';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { getValidationSchemas } from '@gitroom/nestjs-libraries/chat/validation.schemas.helper';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { uploadStreamToStorage } from '@gitroom/nestjs-libraries/upload/custom.upload.validation';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { organizationId } from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';

dayjs.extend(utc);

@Injectable()
export class StudioService {
  private storage = UploadFactory.createStorage();

  constructor(
    private _studioRepository: StudioRepository,
    private _temporalService: TemporalService,
    private _trendManager: TrendManager,
    private _studioVideoManager: StudioVideoManager,
    private _studioScriptService: StudioScriptService,
    private _mediaService: MediaService,
    private _postsService: PostsService,
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager
  ) {}

  // ---------- keys

  async getKeys(orgId: string) {
    const saved = await this._studioRepository.getKeys(orgId);
    const shared = process.env.STUDIO_SHARED_KEYS === 'true';
    return studioKeys.map((key) => ({
      identifier: key.identifier,
      title: key.title,
      description: key.description,
      url: key.url,
      connected: saved.some((p) => p.provider === key.identifier),
      shared: shared && !!process.env[key.env],
    }));
  }

  saveKey(orgId: string, provider: string, apiKey: string) {
    return this._studioRepository.saveKey(
      orgId,
      provider,
      AuthService.fixedEncryption(apiKey.trim())
    );
  }

  deleteKey(orgId: string, provider: string) {
    return this._studioRepository.deleteKey(orgId, provider);
  }

  // the organization's own key first, the server key only when it shares them
  async getKey(orgId: string, provider: string) {
    const saved = await this._studioRepository.getKey(orgId, provider);
    if (saved?.apiKey) {
      return AuthService.fixedDecryption(saved.apiKey);
    }

    const env = studioKeys.find((p) => p.identifier === provider)?.env;
    if (process.env.STUDIO_SHARED_KEYS === 'true' && env && process.env[env]) {
      return process.env[env];
    }

    return undefined;
  }

  private async requireKey(orgId: string, provider: string) {
    const key = await this.getKey(orgId, provider);
    if (!key) {
      const title =
        studioKeys.find((p) => p.identifier === provider)?.title || provider;
      throw new Error(`Add your ${title} API key in Studio > API keys`);
    }
    return key;
  }

  // ---------- catalog

  getSources() {
    return this._trendManager.getAllSources();
  }

  getVideoProviders() {
    return this._studioVideoManager.getAllProviders();
  }

  async getVideoModels(orgId: string, identifier: string) {
    const provider = this._studioVideoManager.getProviderByName(identifier);
    if (!provider?.instance.models) {
      return [];
    }

    try {
      return await provider.instance.models(
        provider.keys[0] ? await this.getKey(orgId, provider.keys[0]) : undefined
      );
    } catch (err) {
      return [];
    }
  }

  // ---------- automations

  getAutomations(orgId: string) {
    return this._studioRepository.getAutomations(orgId);
  }

  async createAutomation(orgId: string, body: StudioAutomationDto, id?: string) {
    this.validateVideoOptions(body);
    for (const source of body.sources) {
      if (!this._trendManager.getSourceByName(source.identifier)) {
        throw new BadRequestException(`Unknown trend source ${source.identifier}`);
      }
    }

    const data = await this._studioRepository.createAutomation(orgId, body, id);
    await this.processCron(data.active, orgId, data.id);
    return data;
  }

  async changeActive(orgId: string, id: string, active: boolean) {
    const data = await this._studioRepository.changeActive(orgId, id, active);
    await this.processCron(active, orgId, id);
    return data;
  }

  async deleteAutomation(orgId: string, id: string) {
    const data = await this._studioRepository.deleteAutomation(orgId, id);
    await this.processCron(false, orgId, id);
    return data;
  }

  async processCron(active: boolean, orgId: string, id: string) {
    if (active) {
      try {
        return await this._temporalService.client
          .getRawClient()
          ?.workflow.start('studioAutomationWorkflow', {
            workflowId: `studio-automation-${id}`,
            taskQueue: 'main',
            args: [{ id, immediately: true }],
            // Keep a running workflow, it reads the automation on every run
            workflowIdConflictPolicy: 'USE_EXISTING',
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: organizationId,
                value: orgId,
              },
            ]),
          });
      } catch (err) {
        // Don't fall through and terminate an active automation
        return false;
      }
    }

    try {
      return await this._temporalService.terminateWorkflow(
        `studio-automation-${id}`
      );
    } catch (err) {
      return false;
    }
  }

  private validateVideoOptions(body: {
    videoMode: string;
    videoProvider?: string;
  }) {
    if (body.videoMode === 'none') {
      return;
    }

    const provider = this._studioVideoManager.getProviderByName(
      this.videoProviderOf(body)
    );
    if (!provider || provider.mode !== body.videoMode) {
      throw new BadRequestException('Pick a video generator for this mode');
    }
  }

  private videoProviderOf(body: { videoMode: string; videoProvider?: string | null }) {
    return body.videoProvider || (body.videoMode === 'cheap' ? 'ffmpeg-slideshow' : '');
  }

  // ---------- trends

  getTrends(orgId: string, automationId?: string) {
    return this._studioRepository.getTrends(orgId, automationId);
  }

  async collectTrends(automationId: string) {
    const automation = await this._studioRepository.getAutomationById(automationId);
    if (!automation) {
      return [];
    }

    const keywords = automation.keywords
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    const sources: { identifier: string; settings: Record<string, string> }[] =
      JSON.parse(automation.sources || '[]');

    const errors: string[] = [];
    for (const source of sources) {
      const trendSource = this._trendManager.getSourceByName(source.identifier);
      if (!trendSource) {
        continue;
      }

      try {
        const apiKey = trendSource.key
          ? await this.requireKey(automation.organizationId, trendSource.key)
          : undefined;

        const items = await trendSource.instance.fetch(source.settings || {}, {
          keywords,
          region: automation.region,
          language: automation.language,
          apiKey,
        });

        // a trend of the niche beats a bigger trend that is off topic
        const scored = items.map((item) => {
          const text = `${item.title} ${item.description || ''}`.toLowerCase();
          const matches = keywords.filter((k) => text.includes(k)).length;
          return { ...item, score: item.score + Math.min(60, matches * 30) };
        });

        await this._studioRepository.saveTrends(
          automation.organizationId,
          automation.id,
          source.identifier,
          scored
        );
      } catch (err) {
        errors.push(`${trendSource.title}: ${(err as Error).message}`);
      }
    }

    return errors;
  }

  // One run of an automation: fresh trends, then new contents up to the daily
  // limit. Returns the contents to produce and when to run again.
  async runAutomation(automationId: string) {
    const automation = await this._studioRepository.getAutomationById(automationId);
    if (!automation || !automation.active) {
      return { contentIds: [] as string[], intervalHours: 0, stop: true };
    }

    const errors = await this.collectTrends(automation.id);
    await this._studioRepository.setLastRun(automation.id, errors);

    const createdToday = await this._studioRepository.countContentsSince(
      automation.id,
      dayjs().startOf('day').toDate()
    );
    const missing = Math.max(0, automation.maxPerDay - createdToday);

    // spread the daily quota over the runs of the day
    const runsPerDay = Math.max(1, Math.floor(24 / automation.intervalHours));
    const toCreate = Math.min(missing, Math.ceil(automation.maxPerDay / runsPerDay));

    const trends = await this._studioRepository.getBestUnusedTrends(
      automation.id,
      toCreate
    );

    const contentIds: string[] = [];
    for (const trend of trends) {
      await this._studioRepository.markTrendUsed(trend.id);
      const { id } = await this._studioRepository.createContent(
        automation.organizationId,
        {
          topic: [trend.title, trend.description, trend.url]
            .filter(Boolean)
            .join('\n'),
          trendId: trend.id,
          niche: automation.niche,
          language: automation.language,
          instructions: automation.instructions || undefined,
          videoMode: automation.videoMode as any,
          videoProvider: automation.videoProvider || undefined,
          videoSettings: JSON.parse(automation.videoSettings || '{}'),
          output: automation.output as any,
          integrations: JSON.parse(automation.integrations || '[]'),
          approveScript: automation.approveScript,
          approvePost: automation.approvePost,
        },
        automation.id
      );
      contentIds.push(id);
    }

    return { contentIds, intervalHours: automation.intervalHours, stop: false };
  }

  // ---------- contents

  getContents(orgId: string, status?: string, page = 0) {
    return this._studioRepository.getContents(orgId, status, page);
  }

  async getContent(orgId: string, id: string) {
    const content = await this._studioRepository.getContent(orgId, id);
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    return content;
  }

  async createContent(orgId: string, body: StudioContentDto) {
    this.validateVideoOptions(body);
    if (body.trendId) {
      const trend = await this._studioRepository.getTrend(orgId, body.trendId);
      if (!trend) {
        throw new NotFoundException('Trend not found');
      }
      await this._studioRepository.markTrendUsed(trend.id);
    }

    const content = await this._studioRepository.createContent(orgId, body);
    await this.startContentWorkflow(orgId, content.id);
    return content;
  }

  async startContentWorkflow(orgId: string, contentId: string) {
    const client = this._temporalService.client.getRawClient();
    if (!client) {
      throw new BadRequestException('Background jobs are not available');
    }

    await client.workflow.start('studioContentWorkflow', {
      workflowId: `studio-content-${contentId}-${makeId(6)}`,
      taskQueue: 'main',
      args: [{ contentId }],
      typedSearchAttributes: new TypedSearchAttributes([
        {
          key: organizationId,
          value: orgId,
        },
      ]),
    });
  }

  async failContent(contentId: string, error: string) {
    await this._studioRepository.updateContent(contentId, {
      status: 'failed',
      error: error.slice(0, 2000),
    });
  }

  // Step 1: write the script, then wait for approval or go on to the video
  async generateScript(contentId: string) {
    const content = await this._studioRepository.getContentById(contentId);
    if (!content || !['pending', 'rendering'].includes(content.status)) {
      return content?.status || 'missing';
    }

    if (!content.script) {
      const apiKey = await this.requireKey(content.organizationId, 'openai');
      const script = await this._studioScriptService.generateScript(apiKey, {
        topic: content.topic,
        niche: content.niche || 'general',
        language: content.language,
        instructions: content.instructions || undefined,
        mode: content.videoMode,
      });

      await this._studioRepository.updateContent(content.id, {
        script: JSON.stringify(script),
        title: script.title,
        caption: this.captionOf(script),
      });

      if (content.approveScript) {
        await this._studioRepository.updateContent(content.id, {
          status: 'awaiting_script_approval',
        });
        return 'awaiting_script_approval';
      }
    }

    await this._studioRepository.updateContent(content.id, {
      status: 'rendering',
      error: null,
    });
    return 'rendering';
  }

  private captionOf(script: StudioScript) {
    return `${script.caption}\n\n${script.hashtags
      .map((p) => `#${p.replace(/^#/, '').replace(/\s+/g, '')}`)
      .join(' ')}`;
  }

  // Step 2: produce the video and put it in the media library
  async renderVideo(contentId: string) {
    const content = await this._studioRepository.getContentById(contentId);
    if (!content || content.status !== 'rendering' || content.mediaId) {
      return;
    }

    if (content.videoMode === 'none') {
      return;
    }

    const provider = this._studioVideoManager.getProviderByName(
      this.videoProviderOf(content)
    );
    if (!provider) {
      throw new Error(`Video generator ${content.videoProvider} is not available`);
    }

    for (const key of provider.keys) {
      await this.requireKey(content.organizationId, key);
    }

    const result = await provider.instance.generate({
      output: content.output as 'vertical' | 'horizontal',
      script: studioScriptSchema.parse(JSON.parse(content.script!)),
      settings: JSON.parse(content.videoSettings || '{}'),
      key: (identifier) => this.getKey(content.organizationId, identifier),
    });

    const media =
      'url' in result
        ? await this._mediaService.uploadFromUrl(content.organizationId, result.url)
        : await this.saveLocalVideo(content.organizationId, result.file);

    await this._studioRepository.updateContent(content.id, {
      mediaId: media.id,
      videoPath: media.path,
    });
  }

  private async saveLocalVideo(orgId: string, file: string) {
    try {
      const { size } = await stat(file);
      const uploaded = await uploadStreamToStorage(
        this.storage,
        Readable.toWeb(createReadStream(file)) as ReadableStream,
        size
      );
      return await this._mediaService.saveFile(
        orgId,
        uploaded.originalname,
        uploaded.path
      );
    } finally {
      await rm(file, { force: true }).catch(() => {});
    }
  }

  // Step 3: schedule the posts, or wait for the creator to approve them
  async finishContent(contentId: string) {
    const content = await this._studioRepository.getContentById(contentId);
    if (!content || content.status !== 'rendering') {
      return;
    }

    if (content.approvePost) {
      await this._studioRepository.updateContent(content.id, {
        status: 'awaiting_post_approval',
      });
      return;
    }

    await this.schedulePosts(content.id);
  }

  async schedulePosts(contentId: string, publishDate?: string) {
    const content = await this._studioRepository.getContentById(contentId);
    if (!content) {
      return;
    }

    if (
      !(await this._studioRepository.moveContent(
        content.id,
        ['rendering', 'awaiting_post_approval'],
        { status: 'scheduling' }
      ))
    ) {
      return;
    }

    try {
      const script = studioScriptSchema.parse(JSON.parse(content.script!));
      const apiKey = await this.requireKey(content.organizationId, 'openai');
      const schemas = getValidationSchemas();
      const rules = this._integrationManager.getAllRulesDescription();

      const integrations = (
        await Promise.all(
          (JSON.parse(content.integrations || '[]') as string[]).map((id) =>
            this._integrationService.getIntegrationById(content.organizationId, id)
          )
        )
      ).filter((f) => f && !f.deletedAt && !f.disabled);

      if (!integrations.length) {
        throw new Error('None of the selected channels is connected anymore');
      }

      const date = publishDate || content.publishDate?.toISOString();
      const warnings: string[] = [];
      for (const integration of integrations) {
        try {
          const provider = this._integrationManager.getSocialIntegration(
            integration!.providerIdentifier
          );

          // settings the platform needs (title, privacy...) are filled from
          // the provider's own settings schema, drafts when they don't validate
          let settings: Record<string, any> = {};
          let type: 'schedule' | 'draft' = 'schedule';
          if (provider?.dto && schemas[provider.dto.name]) {
            settings = await this._studioScriptService.generateSettings(
              apiKey,
              schemas[provider.dto.name],
              script,
              rules[provider.identifier]
            );
            const errors = await validate(plainToInstance(provider.dto, settings));
            if (errors.length) {
              type = 'draft';
              warnings.push(
                `${integration!.name}: saved as a draft, check its settings (${errors
                  .map((e) => e.property)
                  .join(', ')})`
              );
            }
          }

          let maxLength = 0;
          try {
            maxLength = provider?.maxLength?.() || 0;
          } catch (err) {
            /** no limit known **/
          }
          const text =
            maxLength && content.caption!.length > maxLength
              ? script.caption.slice(0, maxLength)
              : content.caption!;

          await this._postsService.createPost(
            content.organizationId,
            {
              date: date
                ? dayjs.utc(date).format('YYYY-MM-DDTHH:mm:ss') + 'Z'
                : (await this._postsService.findFreeDateTime(
                    content.organizationId,
                    integration!.id
                  )) + 'Z',
              order: makeId(10),
              shortLink: false,
              type,
              tags: [],
              posts: [
                {
                  settings: {
                    ...settings,
                    __type: integration!.providerIdentifier as any,
                  },
                  group: makeId(10),
                  integration: { id: integration!.id },
                  value: [
                    {
                      id: makeId(10),
                      delay: 0,
                      content: text,
                      image: content.mediaId
                        ? [{ id: content.mediaId, path: content.videoPath! }]
                        : [],
                    },
                  ],
                },
              ],
            } as any,
            'AUTOPOST'
          );
        } catch (err) {
          warnings.push(`${integration!.name}: ${(err as Error).message}`);
        }
      }

      await this._studioRepository.updateContent(content.id, {
        status: 'scheduled',
        ...(date ? { publishDate: new Date(date) } : {}),
        error: warnings.length ? warnings.join('\n') : null,
      });
    } catch (err) {
      await this.failContent(content.id, (err as Error).message);
    }
  }

  // ---------- approvals

  async updateScript(orgId: string, id: string, script: Record<string, any>) {
    const content = await this.getContent(orgId, id);
    if (!['awaiting_script_approval', 'failed'].includes(content.status)) {
      throw new BadRequestException('The script can only change before the video is made');
    }

    const parsed = studioScriptSchema.safeParse(script);
    if (!parsed.success) {
      throw new BadRequestException('The script is missing fields');
    }

    return this._studioRepository.updateContent(content.id, {
      script: JSON.stringify(parsed.data),
      title: parsed.data.title,
      caption: this.captionOf(parsed.data),
    });
  }

  async approveScript(orgId: string, id: string) {
    const content = await this.getContent(orgId, id);
    if (
      !(await this._studioRepository.moveContent(
        content.id,
        ['awaiting_script_approval'],
        { status: 'rendering', error: null }
      ))
    ) {
      throw new BadRequestException('This content is not waiting for a script approval');
    }

    await this.startContentWorkflow(orgId, content.id);
    return { id: content.id };
  }

  async approvePost(orgId: string, id: string, publishDate?: string) {
    const content = await this.getContent(orgId, id);
    if (content.status !== 'awaiting_post_approval') {
      throw new BadRequestException('This content is not waiting for a post approval');
    }

    await this.schedulePosts(content.id, publishDate);
    return this._studioRepository.getContent(orgId, id);
  }

  async rejectContent(orgId: string, id: string) {
    const content = await this.getContent(orgId, id);
    if (
      !(await this._studioRepository.moveContent(
        content.id,
        ['awaiting_script_approval', 'awaiting_post_approval', 'failed', 'pending'],
        { status: 'rejected' }
      ))
    ) {
      throw new BadRequestException('This content can not be rejected anymore');
    }
    return { id: content.id };
  }

  // runs the failed step again, keeping what was already produced
  async retryContent(orgId: string, id: string) {
    const content = await this.getContent(orgId, id);
    if (
      !(await this._studioRepository.moveContent(
        content.id,
        ['failed'],
        { status: content.script ? 'rendering' : 'pending', error: null }
      ))
    ) {
      throw new BadRequestException('Only failed contents can be retried');
    }

    await this.startContentWorkflow(orgId, content.id);
    return { id: content.id };
  }

  deleteContent(orgId: string, id: string) {
    return this._studioRepository.deleteContent(orgId, id);
  }
}
