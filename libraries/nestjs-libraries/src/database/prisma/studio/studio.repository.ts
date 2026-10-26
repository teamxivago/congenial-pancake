import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  StudioAutomationDto,
  StudioContentDto,
} from '@gitroom/nestjs-libraries/dtos/studio/studio.dto';
import { TrendItem } from '@gitroom/nestjs-libraries/studio/trends/trend.interface';

@Injectable()
export class StudioRepository {
  constructor(
    private _automation: PrismaRepository<'studioAutomation'>,
    private _trend: PrismaRepository<'studioTrend'>,
    private _content: PrismaRepository<'studioContent'>,
    private _key: PrismaRepository<'studioProviderKey'>
  ) {}

  getAutomations(orgId: string) {
    return this._automation.model.studioAutomation.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  getAutomation(orgId: string, id: string) {
    return this._automation.model.studioAutomation.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  getAutomationById(id: string) {
    return this._automation.model.studioAutomation.findUnique({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async createAutomation(orgId: string, body: StudioAutomationDto, id?: string) {
    const data = {
      name: body.name,
      niche: body.niche,
      keywords: body.keywords || '',
      language: body.language,
      region: body.region,
      sources: JSON.stringify(body.sources || []),
      instructions: body.instructions || null,
      videoMode: body.videoMode,
      videoProvider: body.videoProvider || null,
      videoSettings: JSON.stringify(body.videoSettings || {}),
      output: body.output,
      integrations: JSON.stringify(body.integrations || []),
      approveScript: body.approveScript,
      approvePost: body.approvePost,
      intervalHours: body.intervalHours,
      maxPerDay: body.maxPerDay,
      active: body.active,
    };

    return this._automation.model.studioAutomation.upsert({
      where: {
        id: id || uuidv4(),
        organizationId: orgId,
        deletedAt: null,
      },
      create: {
        organizationId: orgId,
        ...data,
      },
      update: data,
      select: {
        id: true,
        active: true,
      },
    });
  }

  changeActive(orgId: string, id: string, active: boolean) {
    return this._automation.model.studioAutomation.update({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
      data: {
        active,
      },
      select: {
        id: true,
        active: true,
      },
    });
  }

  deleteAutomation(orgId: string, id: string) {
    return this._automation.model.studioAutomation.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
        active: false,
      },
      select: {
        id: true,
      },
    });
  }

  setLastRun(id: string, errors: string[]) {
    return this._automation.model.studioAutomation.update({
      where: {
        id,
      },
      data: {
        lastRunAt: new Date(),
        lastError: errors.length ? errors.join('\n').slice(0, 2000) : null,
      },
    });
  }

  saveTrends(
    orgId: string,
    automationId: string | null,
    source: string,
    items: TrendItem[]
  ) {
    return this._trend.model.studioTrend.createMany({
      data: items
        .filter((p) => p.externalId && p.title)
        .map((item) => ({
          organizationId: orgId,
          automationId,
          source,
          externalId: item.externalId.slice(0, 500),
          title: item.title.slice(0, 500),
          description: item.description?.slice(0, 2000) || null,
          url: item.url?.slice(0, 1000) || null,
          score: item.score,
        })),
      skipDuplicates: true,
    });
  }

  getTrends(orgId: string, automationId?: string) {
    return this._trend.model.studioTrend.findMany({
      where: {
        organizationId: orgId,
        ...(automationId ? { automationId } : {}),
        createdAt: {
          gte: dayjs().subtract(7, 'days').toDate(),
        },
      },
      orderBy: [{ createdAt: 'desc' }, { score: 'desc' }],
      take: 200,
    });
  }

  getTrend(orgId: string, id: string) {
    return this._trend.model.studioTrend.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });
  }

  getBestUnusedTrends(automationId: string, take: number) {
    return this._trend.model.studioTrend.findMany({
      where: {
        automationId,
        usedAt: null,
        createdAt: {
          gte: dayjs().subtract(3, 'days').toDate(),
        },
      },
      orderBy: {
        score: 'desc',
      },
      take,
    });
  }

  markTrendUsed(id: string) {
    return this._trend.model.studioTrend.update({
      where: {
        id,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  countContentsSince(automationId: string, since: Date) {
    return this._content.model.studioContent.count({
      where: {
        automationId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  createContent(
    orgId: string,
    body: StudioContentDto,
    automationId?: string
  ) {
    return this._content.model.studioContent.create({
      data: {
        organizationId: orgId,
        automationId: automationId || null,
        trendId: body.trendId || null,
        topic: body.topic,
        niche: body.niche || '',
        language: body.language || 'en',
        instructions: body.instructions || null,
        videoMode: body.videoMode,
        videoProvider: body.videoProvider || null,
        videoSettings: JSON.stringify(body.videoSettings || {}),
        output: body.output,
        integrations: JSON.stringify(body.integrations || []),
        approveScript: body.approveScript,
        approvePost: body.approvePost,
      },
      select: {
        id: true,
      },
    });
  }

  getContents(orgId: string, status?: string, page = 0) {
    return this._content.model.studioContent.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(status ? { status: { in: status.split(',') } } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        automation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip: page * 30,
      take: 30,
    });
  }

  getContent(orgId: string, id: string) {
    return this._content.model.studioContent.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  getContentById(id: string) {
    return this._content.model.studioContent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  updateContent(id: string, data: Prisma.StudioContentUpdateInput) {
    return this._content.model.studioContent.update({
      where: {
        id,
      },
      data,
      select: {
        id: true,
        status: true,
      },
    });
  }

  // only moves the content when it is still in the expected status, so a double
  // click or two workers never run the same step twice
  async moveContent(id: string, from: string[], data: Prisma.StudioContentUpdateInput) {
    const { count } = await this._content.model.studioContent.updateMany({
      where: {
        id,
        status: { in: from },
        deletedAt: null,
      },
      data,
    });
    return count > 0;
  }

  deleteContent(orgId: string, id: string) {
    return this._content.model.studioContent.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: {
        id: true,
      },
    });
  }

  getKeys(orgId: string) {
    return this._key.model.studioProviderKey.findMany({
      where: {
        organizationId: orgId,
      },
      select: {
        provider: true,
        updatedAt: true,
      },
    });
  }

  getKey(orgId: string, provider: string) {
    return this._key.model.studioProviderKey.findUnique({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider,
        },
      },
      select: {
        apiKey: true,
      },
    });
  }

  saveKey(orgId: string, provider: string, apiKey: string) {
    return this._key.model.studioProviderKey.upsert({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider,
        },
      },
      create: {
        organizationId: orgId,
        provider,
        apiKey,
      },
      update: {
        apiKey,
      },
      select: {
        provider: true,
      },
    });
  }

  deleteKey(orgId: string, provider: string) {
    return this._key.model.studioProviderKey.deleteMany({
      where: {
        organizationId: orgId,
        provider,
      },
    });
  }
}
