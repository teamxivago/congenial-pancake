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
  identifier: 'fal',
  title: 'fal.ai (Kling, Veo, Seedance, Hailuo, Wan, Luma, Grok, LTX...)',
  description:
    'Any text-to-video model hosted on fal.ai, the list is loaded live so new models show up automatically',
  mode: 'ai',
  keys: ['fal'],
  fields: [
    {
      name: 'model',
      title: 'Model',
      type: 'model',
      default: 'fal-ai/kling-video/v3/standard/text-to-video',
    },
    {
      name: 'duration',
      title: 'Duration',
      description: 'Seconds, sent as the model "duration" input (empty uses the model default)',
      type: 'text',
    },
    {
      name: 'extra',
      title: 'Extra model inputs (JSON)',
      description: 'Merged into the request, see the model page on fal.ai',
      type: 'json',
    },
  ],
})
export class FalVideo extends StudioVideoAbstract {
  async models() {
    const list: { value: string; label: string }[] = [];
    let cursor = '';
    for (let page = 0; page < 3; page++) {
      const response = await fetch(
        `https://api.fal.ai/v1/models?category=text-to-video&status=active&limit=100${
          cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
        }`,
        { signal: AbortSignal.timeout(30000) }
      );
      if (!response.ok) {
        break;
      }
      const data = await response.json();
      list.push(
        ...(data.models || []).map((m: any) => ({
          value: m.endpoint_id,
          label: m.metadata?.display_name || m.endpoint_id,
        }))
      );
      if (!data.has_more || !data.next_cursor) {
        break;
      }
      cursor = data.next_cursor;
    }
    return list;
  }

  async generate(input: StudioVideoInput): Promise<StudioVideoResult> {
    const apiKey = await input.key('fal');
    const model = (
      input.settings.model || 'fal-ai/kling-video/v3/standard/text-to-video'
    ).replace(/^\/+|\/+$/g, '');
    const headers = {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const submit = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: input.script.videoPrompt,
        aspect_ratio: input.output === 'vertical' ? '9:16' : '16:9',
        ...(input.settings.duration
          ? { duration: String(input.settings.duration) }
          : {}),
        ...parseExtra(input.settings.extra),
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!submit.ok) {
      throw new Error(await readError(submit, 'fal.ai'));
    }

    const { status_url, response_url } = await submit.json();

    await pollUntil(async () => {
      const status = await (
        await fetch(status_url, { headers, signal: AbortSignal.timeout(30000) })
      ).json();
      if (status.status === 'COMPLETED') {
        if (status.error) {
          throw new Error(`fal.ai: ${status.error}`);
        }
        return true;
      }
      return undefined;
    });

    const result = await fetch(response_url, {
      headers,
      signal: AbortSignal.timeout(60000),
    });
    if (!result.ok) {
      throw new Error(await readError(result, 'fal.ai'));
    }

    const data = await result.json();
    const url = data?.video?.url || data?.videos?.[0]?.url || data?.url;
    if (!url) {
      throw new Error('fal.ai finished without a video url');
    }

    return { url };
  }
}
