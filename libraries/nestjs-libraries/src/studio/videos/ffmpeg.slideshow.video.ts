import OpenAI from 'openai';
import { spawn } from 'child_process';
import { mkdtemp, rename, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseFile } from 'music-metadata';
import { stringifySync } from 'subtitle';
import pLimit from 'p-limit';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  readError,
  StudioVideo,
  StudioVideoAbstract,
  StudioVideoInput,
  StudioVideoResult,
} from '@gitroom/nestjs-libraries/studio/videos/studio.video.interface';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';

const limit = pLimit(3);

function ffmpeg(args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, { cwd });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-2000);
    });
    child.on('error', (err) =>
      reject(new Error(`FFmpeg could not start (${err.message}), is it installed?`))
    );
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`FFmpeg failed: ${stderr}`))
    );
  });
}

// short caption groups, timed proportionally to their length inside the scene
function captionCues(text: string, start: number, end: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const groups: string[] = [];
  for (let i = 0; i < words.length; i += 4) {
    groups.push(words.slice(i, i + 4).join(' '));
  }
  const totalChars = groups.reduce((all, g) => all + g.length, 0) || 1;
  let cursor = start;
  return groups.map((group) => {
    const length = ((end - start) * group.length) / totalChars;
    const cue = { start: cursor, end: cursor + length, text: group };
    cursor += length;
    return cue;
  });
}

@StudioVideo({
  identifier: 'ffmpeg-slideshow',
  title: 'Cheap: voiceover slideshow (rendered on your server)',
  description:
    'AI voiceover + AI images or free stock photos + burned captions, rendered with FFmpeg on the VPS. Costs a few cents per video',
  mode: 'cheap',
  keys: ['openai'],
  fields: [
    {
      name: 'images',
      title: 'Images',
      type: 'select',
      options: [
        { value: 'ai', label: 'AI generated (OpenAI)' },
        { value: 'pexels', label: 'Free stock photos (Pexels key)' },
      ],
      default: 'ai',
    },
    {
      name: 'imageModel',
      title: 'Image model',
      type: 'text',
      default: 'chatgpt-image-latest',
    },
    {
      name: 'voiceProvider',
      title: 'Voice',
      type: 'select',
      options: [
        { value: 'openai', label: 'OpenAI text to speech' },
        { value: 'elevenlabs', label: 'ElevenLabs (key needed)' },
      ],
      default: 'openai',
    },
    {
      name: 'voice',
      title: 'Voice name / ElevenLabs voice id',
      description:
        'OpenAI: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse. ElevenLabs: the voice id',
      type: 'text',
      default: 'onyx',
    },
    {
      name: 'captions',
      title: 'Burned captions',
      type: 'select',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      default: 'yes',
    },
    {
      name: 'musicUrl',
      title: 'Background music URL (mp3, optional)',
      description: 'A public HTTPS link to a track you have the rights to use',
      type: 'text',
    },
  ],
})
export class FfmpegSlideshowVideo extends StudioVideoAbstract {
  async generate(input: StudioVideoInput): Promise<StudioVideoResult> {
    const vertical = input.output === 'vertical';
    const [width, height] = vertical ? [1080, 1920] : [1920, 1080];
    const scenes = input.script.scenes.filter((s) => s.voiceover?.trim());
    if (!scenes.length) {
      throw new Error('The script has no scenes to render');
    }

    const openai = new OpenAI({ apiKey: await input.key('openai') });
    const dir = await mkdtemp(join(tmpdir(), 'studio-'));

    try {
      const assets = await Promise.all(
        scenes.map((scene, index) =>
          limit(async () => {
            const voice = join(dir, `voice${index}.mp3`);
            const image = join(dir, `image${index}.png`);
            await Promise.all([
              this.voice(input, openai, scene.voiceover, voice),
              this.image(input, openai, scene.visual, vertical, image),
            ]);
            const { format } = await parseFile(voice);
            return { voice, image, duration: (format.duration || 3) + 0.35 };
          })
        )
      );

      // one clip per scene: the image slowly zooms in while the voice plays
      for (const [index, asset] of assets.entries()) {
        const frames = Math.ceil(asset.duration * 30);
        await ffmpeg(
          [
            '-y',
            '-i',
            asset.image,
            '-i',
            asset.voice,
            '-filter_complex',
            `[0:v]scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,crop=${width * 2}:${height * 2},zoompan=z='min(zoom+0.0007,1.12)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=30,format=yuv420p[v];[1:a]apad[a]`,
            '-map',
            '[v]',
            '-map',
            '[a]',
            '-t',
            asset.duration.toFixed(2),
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-crf',
            '18',
            '-c:a',
            'aac',
            '-ar',
            '44100',
            '-b:a',
            '160k',
            `scene${index}.mp4`,
          ],
          dir
        );
      }

      await writeFile(
        join(dir, 'scenes.txt'),
        assets.map((_, index) => `file 'scene${index}.mp4'`).join('\n')
      );

      let cursor = 0;
      const cues = scenes.flatMap((scene, index) => {
        const start = cursor;
        cursor += assets[index].duration;
        return captionCues(scene.voiceover, start * 1000, (cursor - 0.35) * 1000);
      });
      await writeFile(
        join(dir, 'captions.srt'),
        stringifySync(
          cues.map((data) => ({ type: 'cue', data })),
          { format: 'SRT' }
        )
      );

      const music =
        input.settings.musicUrl &&
        (await isSafePublicHttpsUrl(input.settings.musicUrl))
          ? input.settings.musicUrl
          : '';
      if (music) {
        const track = await fetch(music, {
          signal: AbortSignal.timeout(60000),
          // @ts-ignore — undici option, not in lib.dom fetch types
          dispatcher: ssrfSafeDispatcher,
        });
        if (!track.ok) {
          throw new Error(await readError(track, 'Background music'));
        }
        await writeFile(
          join(dir, 'music.mp3'),
          Buffer.from(await track.arrayBuffer())
        );
      }

      const captions =
        input.settings.captions === 'no'
          ? ''
          : `subtitles=captions.srt:force_style='FontName=DejaVu Sans,FontSize=${
              vertical ? 13 : 20
            },Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=${
              vertical ? 70 : 30
            }'`;

      await ffmpeg(
        [
          '-y',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          'scenes.txt',
          ...(music ? ['-stream_loop', '-1', '-i', 'music.mp3'] : []),
          '-filter_complex',
          [
            `[0:v]${captions || 'null'}[v]`,
            music
              ? '[1:a]volume=0.12[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]'
              : '[0:a]anull[a]',
          ].join(';'),
          '-map',
          '[v]',
          '-map',
          '[a]',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '22',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '160k',
          '-movflags',
          '+faststart',
          'final.mp4',
        ],
        dir
      );

      const file = join(tmpdir(), `slideshow-${makeId(12)}.mp4`);
      await rename(join(dir, 'final.mp4'), file);
      return { file };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async voice(
    input: StudioVideoInput,
    openai: OpenAI,
    text: string,
    path: string
  ) {
    if (input.settings.voiceProvider === 'elevenlabs') {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
          input.settings.voice || ''
        )}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': (await input.key('elevenlabs')) || '',
          },
          body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
          signal: AbortSignal.timeout(120000),
        }
      );
      if (!response.ok) {
        throw new Error(await readError(response, 'ElevenLabs'));
      }
      return writeFile(path, Buffer.from(await response.arrayBuffer()));
    }

    const speech = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: input.settings.voice || 'onyx',
      input: text,
      response_format: 'mp3',
    });
    return writeFile(path, Buffer.from(await speech.arrayBuffer()));
  }

  private async image(
    input: StudioVideoInput,
    openai: OpenAI,
    prompt: string,
    vertical: boolean,
    path: string
  ) {
    if (input.settings.images === 'pexels') {
      const search = await fetch(
        `https://api.pexels.com/v1/search?per_page=5&orientation=${
          vertical ? 'portrait' : 'landscape'
        }&query=${encodeURIComponent(prompt.split(/[,.]/)[0].slice(0, 80))}`,
        {
          headers: { Authorization: (await input.key('pexels')) || '' },
          signal: AbortSignal.timeout(30000),
        }
      );
      if (!search.ok) {
        throw new Error(await readError(search, 'Pexels'));
      }
      const { photos = [] } = await search.json();
      const photo = photos[Math.floor(Math.random() * photos.length)];
      if (photo) {
        const file = await fetch(photo.src.large2x || photo.src.original, {
          signal: AbortSignal.timeout(60000),
        });
        return writeFile(path, Buffer.from(await file.arrayBuffer()));
      }
      // nothing found for this scene, an AI image keeps the video going
    }

    const generated = await openai.images.generate({
      model: input.settings.imageModel || 'chatgpt-image-latest',
      prompt: `${prompt}. No text, no letters, no watermark.`,
      size: vertical ? '1024x1536' : '1536x1024',
      quality: 'low',
    } as any);

    const image = generated.data?.[0];
    if (image?.b64_json) {
      return writeFile(path, Buffer.from(image.b64_json, 'base64'));
    }
    if (image?.url) {
      const file = await fetch(image.url, { signal: AbortSignal.timeout(60000) });
      return writeFile(path, Buffer.from(await file.arrayBuffer()));
    }
    throw new Error('The image generator returned no image');
  }
}
