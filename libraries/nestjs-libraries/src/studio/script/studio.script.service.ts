import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  StudioScript,
  studioScriptSchema,
} from '@gitroom/nestjs-libraries/studio/script/studio.script';

const model = (apiKey: string) =>
  new ChatOpenAI({
    apiKey,
    model: process.env.STUDIO_SCRIPT_MODEL || 'gpt-4.1',
    temperature: 0.8,
  });

@Injectable()
export class StudioScriptService {
  async generateScript(
    apiKey: string,
    params: {
      topic: string;
      niche: string;
      language: string;
      instructions?: string;
      mode: string;
    }
  ): Promise<StudioScript> {
    return ChatPromptTemplate.fromTemplate(
      `
        You are a viral short-form video writer for the niche "{niche}".
        Turn the trending topic below into a 30-60 seconds vertical video story
        (a story, explainer, list or hot take, whatever fits the topic best).

        Rules:
        - Write everything in this language: {language}
        - The hook must create curiosity in the first 2 seconds
        - Short spoken sentences, no stage directions in the voiceover
        - Never invent facts about real people, stay with what the topic says or keep it general
        - No hashtags or emojis in the voiceover
        - The video is produced as: {mode}
        {instructions}

        Trending topic:
        {topic}
      `
    )
      .pipe(model(apiKey).withStructuredOutput(studioScriptSchema))
      .invoke({
        niche: params.niche,
        language: params.language,
        mode:
          params.mode === 'ai'
            ? 'one AI generated cinematic clip, make the videoPrompt excellent'
            : 'a slideshow of images with a voiceover, make the scenes excellent',
        instructions: params.instructions
          ? `- Extra instructions from the creator: ${params.instructions}`
          : '',
        topic: params.topic,
      });
  }

  // Fills the settings a platform needs to publish (title, privacy, board...)
  // from the JSON schema of the provider's settings DTO
  async generateSettings(
    apiKey: string,
    schema: Record<string, any>,
    script: StudioScript,
    rules: string
  ): Promise<Record<string, any>> {
    const result = await model(apiKey)
      .withStructuredOutput(
        {
          ...schema,
          title: schema.title || 'settings',
          description: 'Settings of the social media post',
        },
        { method: 'jsonMode' }
      )
      .invoke(
        `Return a JSON object of the settings to publish a video post, following this JSON schema exactly:
${JSON.stringify(schema)}

Rules of the platform: ${rules || 'none'}
Prefer public visibility, allow comments, the video is not made for kids, it is AI generated content.
Leave out optional fields you can't fill with a real value (ids of boards, playlists, communities...).

Video title: ${script.title}
Video caption: ${script.caption}
Hashtags: ${script.hashtags.join(', ')}`
      );

    return result || {};
  }
}
