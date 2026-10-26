import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  pollUntil,
  StudioVideo,
  StudioVideoAbstract,
  StudioVideoInput,
  StudioVideoResult,
} from '@gitroom/nestjs-libraries/studio/videos/studio.video.interface';

@StudioVideo({
  identifier: 'openai-sora',
  title: 'OpenAI Sora',
  description: 'Sora video with synced audio, directly from OpenAI',
  mode: 'ai',
  keys: ['openai'],
  fields: [
    {
      name: 'model',
      title: 'Model',
      type: 'select',
      options: [
        { value: 'sora-2', label: 'Sora 2' },
        { value: 'sora-2-pro', label: 'Sora 2 Pro' },
      ],
      default: 'sora-2',
    },
    {
      name: 'seconds',
      title: 'Duration',
      type: 'select',
      options: [
        { value: '4', label: '4 seconds' },
        { value: '8', label: '8 seconds' },
        { value: '12', label: '12 seconds' },
      ],
      default: '8',
    },
  ],
})
export class OpenaiSoraVideo extends StudioVideoAbstract {
  async generate(input: StudioVideoInput): Promise<StudioVideoResult> {
    const client = new OpenAI({ apiKey: await input.key('openai') });

    const video = await client.videos.create({
      model: input.settings.model || 'sora-2',
      prompt: input.script.videoPrompt,
      seconds: input.settings.seconds || '8',
      size: input.output === 'vertical' ? '720x1280' : '1280x720',
    });

    await pollUntil(async () => {
      const current = await client.videos.retrieve(video.id);
      if (current.status === 'completed') {
        return true;
      }
      if (current.status === 'failed') {
        throw new Error(
          `Sora: ${current.error?.message || 'video generation failed'}`
        );
      }
      return undefined;
    });

    const content = await client.videos.downloadContent(video.id);
    const file = join(tmpdir(), `sora-${makeId(12)}.mp4`);
    await writeFile(file, Buffer.from(await content.arrayBuffer()));

    return { file };
  }
}
