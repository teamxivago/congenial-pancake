import { z } from 'zod';

export const studioScriptSchema = z.object({
  title: z.string().describe('Short catchy title of the video, max 90 chars'),
  hook: z
    .string()
    .describe('The first sentence said in the video, it must stop the scroll'),
  scenes: z
    .array(
      z.object({
        voiceover: z
          .string()
          .describe('What the narrator says in this scene, 1-2 short sentences'),
        visual: z
          .string()
          .describe(
            'Detailed description of the image shown during this scene, for an image generator or stock photo search, no text in the image'
          ),
      })
    )
    .describe('4 to 8 scenes, the first scene voiceover starts with the hook'),
  videoPrompt: z
    .string()
    .describe(
      'One detailed cinematic prompt for an AI video generator describing a single 5-10 seconds shot that tells the story: subject, action, camera movement, lighting, style, mood, and any line of dialogue in quotes'
    ),
  caption: z
    .string()
    .describe('Social media caption for the post, with emojis, no hashtags'),
  hashtags: z
    .array(z.string())
    .describe('5 to 10 relevant hashtags without the # sign'),
});

export type StudioScript = z.infer<typeof studioScriptSchema>;
