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
  identifier: 'runway',
  title: 'Runway',
  description: 'Runway Gen-4.5 and the partner models Runway hosts (Veo, Kling, Seedance...)',
  mode: 'ai',
  keys: ['runway'],
  fields: [
    {
      name: 'model',
      title: 'Model',
      description: 'Any model id of Runway text_to_video',
      type: 'select',
      options: [
        { value: 'gen4.5', label: 'Runway Gen-4.5' },
        { value: 'veo3.1', label: 'Google Veo 3.1' },
        { value: 'veo3.1_fast', label: 'Google Veo 3.1 Fast' },
        { value: 'kling3.0_pro', label: 'Kling 3.0 Pro' },
        { value: 'kling3.0_standard', label: 'Kling 3.0 Standard' },
        { value: 'seedance2', label: 'Seedance 2' },
        { value: 'seedance2_fast', label: 'Seedance 2 Fast' },
        { value: 'hailuo3', label: 'Hailuo 3' },
        { value: 'wan3', label: 'Wan 3' },
      ],
      default: 'gen4.5',
    },
    {
      name: 'duration',
      title: 'Duration (seconds)',
      type: 'number',
      default: '8',
    },
    {
      name: 'extra',
      title: 'Extra inputs (JSON)',
      type: 'json',
    },
  ],
})
export class RunwayVideo extends StudioVideoAbstract {
  async generate(input: StudioVideoInput): Promise<StudioVideoResult> {
    const headers = {
      Authorization: `Bearer ${await input.key('runway')}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    };

    const create = await fetch(
      'https://api.dev.runwayml.com/v1/text_to_video',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: input.settings.model || 'gen4.5',
          promptText: input.script.videoPrompt.slice(0, 1000),
          ratio: input.output === 'vertical' ? '720:1280' : '1280:720',
          duration: +(input.settings.duration || 8),
          ...parseExtra(input.settings.extra),
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!create.ok) {
      throw new Error(await readError(create, 'Runway'));
    }

    const { id } = await create.json();

    const url = await pollUntil(async () => {
      const task = await (
        await fetch(`https://api.dev.runwayml.com/v1/tasks/${id}`, {
          headers,
          signal: AbortSignal.timeout(30000),
        })
      ).json();
      if (task.status === 'SUCCEEDED') {
        return task.output?.[0] as string;
      }
      if (task.status === 'FAILED' || task.status === 'CANCELLED') {
        throw new Error(`Runway: ${task.failure || task.status}`);
      }
      return undefined;
    });

    return { url };
  }
}
