import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  pollUntil,
  readError,
  StudioVideo,
  StudioVideoAbstract,
  StudioVideoInput,
  StudioVideoResult,
} from '@gitroom/nestjs-libraries/studio/videos/studio.video.interface';

@StudioVideo({
  identifier: 'google',
  title: 'Google Gemini Omni',
  description: 'Video with audio from Google, directly through the Gemini API',
  mode: 'ai',
  keys: ['google'],
  fields: [
    {
      name: 'model',
      title: 'Model',
      type: 'text',
      default: 'gemini-omni-1.1-flash',
    },
    {
      name: 'resolution',
      title: 'Resolution',
      type: 'select',
      options: [
        { value: '720p', label: '720p' },
        { value: '1080p', label: '1080p (upscaled)' },
      ],
      default: '720p',
    },
  ],
})
export class GoogleVideo extends StudioVideoAbstract {
  async generate(input: StudioVideoInput): Promise<StudioVideoResult> {
    const apiKey = (await input.key('google'))!;
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model: input.settings.model || 'gemini-omni-1.1-flash',
          input: input.script.videoPrompt,
          response_format: {
            type: 'video',
            aspect_ratio: input.output === 'vertical' ? '9:16' : '16:9',
            resolution: input.settings.resolution || '720p',
          },
        }),
        signal: AbortSignal.timeout(15 * 60000),
      }
    );

    if (!response.ok) {
      throw new Error(await readError(response, 'Google'));
    }

    const data = await response.json();
    const video = (data.steps || [])
      .flatMap((step: any) => [step.content].flat())
      .find((content: any) => content?.type === 'video');

    if (!video) {
      throw new Error('Google finished without a video');
    }

    const file = join(tmpdir(), `google-${makeId(12)}.mp4`);
    if (video.data) {
      await writeFile(file, Buffer.from(video.data, 'base64'));
      return { file };
    }

    // uri delivery: wait for the file to be processed, then download it
    const fileId = String(video.uri).split('/files/').pop()!.split(/[:?]/)[0];
    await pollUntil(async () => {
      const state = await (
        await fetch(
          `https://generativelanguage.googleapis.com/v1beta/files/${fileId}`,
          { headers: { 'x-goog-api-key': apiKey } }
        )
      ).json();
      if (state.state === 'FAILED') {
        throw new Error('Google video processing failed');
      }
      return state.state === 'ACTIVE' ? true : undefined;
    }, 5000);

    const download = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media`,
      { headers: { 'x-goog-api-key': apiKey } }
    );
    if (!download.ok) {
      throw new Error(await readError(download, 'Google'));
    }
    await writeFile(file, Buffer.from(await download.arrayBuffer()));
    return { file };
  }
}
