import {
  pollUntil,
  readError,
  StudioVideo,
  StudioVideoAbstract,
  StudioVideoInput,
  StudioVideoResult,
} from '@gitroom/nestjs-libraries/studio/videos/studio.video.interface';

@StudioVideo({
  identifier: 'luma',
  title: 'Luma Dream Machine',
  description: 'Luma Ray videos directly from Luma AI',
  mode: 'ai',
  keys: ['luma'],
  fields: [
    {
      name: 'model',
      title: 'Model',
      type: 'text',
      default: 'ray-2',
    },
    {
      name: 'duration',
      title: 'Duration',
      type: 'select',
      options: [
        { value: '5s', label: '5 seconds' },
        { value: '9s', label: '9 seconds' },
      ],
      default: '5s',
    },
    {
      name: 'resolution',
      title: 'Resolution',
      type: 'select',
      options: [
        { value: '540p', label: '540p' },
        { value: '720p', label: '720p' },
        { value: '1080p', label: '1080p' },
      ],
      default: '720p',
    },
  ],
})
export class LumaVideo extends StudioVideoAbstract {
  async generate(input: StudioVideoInput): Promise<StudioVideoResult> {
    const headers = {
      Authorization: `Bearer ${await input.key('luma')}`,
      'Content-Type': 'application/json',
    };

    const create = await fetch(
      'https://api.lumalabs.ai/dream-machine/v1/generations',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: input.script.videoPrompt,
          model: input.settings.model || 'ray-2',
          aspect_ratio: input.output === 'vertical' ? '9:16' : '16:9',
          duration: input.settings.duration || '5s',
          resolution: input.settings.resolution || '720p',
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!create.ok) {
      throw new Error(await readError(create, 'Luma'));
    }

    const { id } = await create.json();

    const url = await pollUntil(async () => {
      const generation = await (
        await fetch(
          `https://api.lumalabs.ai/dream-machine/v1/generations/${id}`,
          { headers, signal: AbortSignal.timeout(30000) }
        )
      ).json();
      if (generation.state === 'completed') {
        return generation.assets?.video as string;
      }
      if (generation.state === 'failed') {
        throw new Error(`Luma: ${generation.failure_reason || 'failed'}`);
      }
      return undefined;
    });

    return { url };
  }
}
