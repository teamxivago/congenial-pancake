import {
  parseExtra,
  pollUntil,
  readError,
  StudioVideo,
  StudioVideoAbstract,
  StudioVideoInput,
  StudioVideoResult,
} from '@gitroom/nestjs-libraries/studio/videos/studio.video.interface';

@StudioVideo({
  identifier: 'replicate',
  title: 'Replicate (Veo, Kling, Seedance, Wan, Hailuo...)',
  description:
    'Any video model hosted on Replicate, the list comes live from the text-to-video collection',
  mode: 'ai',
  keys: ['replicate'],
  fields: [
    {
      name: 'model',
      title: 'Model',
      description: 'owner/name of the model',
      type: 'model',
      default: 'kwaivgi/kling-v2.1',
    },
    {
      name: 'duration',
      title: 'Duration',
      description: 'Seconds, sent as the model "duration" input (empty uses the model default)',
      type: 'number',
    },
    {
      name: 'extra',
      title: 'Extra model inputs (JSON)',
      description: 'Merged into the input, see the model page on replicate.com',
      type: 'json',
    },
  ],
})
export class ReplicateVideo extends StudioVideoAbstract {
  async models(apiKey?: string) {
    if (!apiKey) {
      return [];
    }
    const response = await fetch(
      'https://api.replicate.com/v1/collections/text-to-video',
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30000),
      }
    );
    if (!response.ok) {
      return [];
    }
    const { models = [] } = await response.json();
    return models.map((m: any) => ({
      value: `${m.owner}/${m.name}`,
      label: `${m.owner}/${m.name}`,
    }));
  }

  async generate(input: StudioVideoInput): Promise<StudioVideoResult> {
    const apiKey = await input.key('replicate');
    const model = input.settings.model || 'kwaivgi/kling-v2.1';
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const create = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input: {
            prompt: input.script.videoPrompt,
            aspect_ratio: input.output === 'vertical' ? '9:16' : '16:9',
            ...(input.settings.duration
              ? { duration: +input.settings.duration }
              : {}),
            ...parseExtra(input.settings.extra),
          },
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!create.ok) {
      throw new Error(await readError(create, 'Replicate'));
    }

    const prediction = await create.json();

    const output = await pollUntil(async () => {
      const current = await (
        await fetch(prediction.urls.get, {
          headers,
          signal: AbortSignal.timeout(30000),
        })
      ).json();
      if (current.status === 'succeeded') {
        return current.output;
      }
      if (current.status === 'failed' || current.status === 'canceled') {
        throw new Error(`Replicate: ${current.error || current.status}`);
      }
      return undefined;
    });

    const url = [output].flat().find((p: any) => typeof p === 'string');
    if (!url) {
      throw new Error('Replicate finished without a video url');
    }

    return { url };
  }
}
