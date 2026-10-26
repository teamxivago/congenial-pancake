// API keys an organization can connect for Studio. When STUDIO_SHARED_KEYS=true
// the server's own env key is used for organizations that did not add theirs.
export interface StudioKeyParams {
  identifier: string;
  title: string;
  description: string;
  url: string;
  env: string;
}

export const studioKeys: StudioKeyParams[] = [
  {
    identifier: 'openai',
    title: 'OpenAI',
    description: 'Script writing, images and voiceover (cheap mode) and Sora videos',
    url: 'https://platform.openai.com/api-keys',
    env: 'OPENAI_API_KEY',
  },
  {
    identifier: 'fal',
    title: 'fal.ai',
    description: 'One key for Veo, Kling, Hailuo, Luma, Wan, Seedance, Pika and more',
    url: 'https://fal.ai/dashboard/keys',
    env: 'FAL_KEY',
  },
  {
    identifier: 'replicate',
    title: 'Replicate',
    description: 'One key for hundreds of open and commercial video models',
    url: 'https://replicate.com/account/api-tokens',
    env: 'REPLICATE_API_TOKEN',
  },
  {
    identifier: 'google',
    title: 'Google AI (Gemini API)',
    description: 'Veo video generation',
    url: 'https://aistudio.google.com/apikey',
    env: 'GEMINI_API_KEY',
  },
  {
    identifier: 'runway',
    title: 'Runway',
    description: 'Runway Gen-4 video generation',
    url: 'https://dev.runwayml.com',
    env: 'RUNWAYML_API_SECRET',
  },
  {
    identifier: 'luma',
    title: 'Luma AI',
    description: 'Luma Ray video generation',
    url: 'https://lumalabs.ai/api/keys',
    env: 'LUMAAI_API_KEY',
  },
  {
    identifier: 'elevenlabs',
    title: 'ElevenLabs',
    description: 'Natural voiceovers for cheap mode videos',
    url: 'https://elevenlabs.io/app/settings/api-keys',
    env: 'ELEVENSLABS_API_KEY',
  },
  {
    identifier: 'pexels',
    title: 'Pexels',
    description: 'Free stock photos for cheap mode videos instead of AI images',
    url: 'https://www.pexels.com/api/',
    env: 'PEXELS_API_KEY',
  },
  {
    identifier: 'youtube',
    title: 'YouTube Data API',
    description: 'Trending videos as a trend source',
    url: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    env: 'YOUTUBE_DATA_API_KEY',
  },
  {
    identifier: 'x',
    title: 'X API (Bearer token)',
    description: 'X trends as a trend source (paid X API plan)',
    url: 'https://developer.x.com/en/portal/dashboard',
    env: 'X_BEARER_TOKEN',
  },
];
