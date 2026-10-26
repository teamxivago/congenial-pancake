import dayjs from 'dayjs';
import {
  rankScore,
  TrendContext,
  TrendItem,
  TrendSource,
  TrendSourceAbstract,
} from '@gitroom/nestjs-libraries/studio/trends/trend.interface';

@TrendSource({
  identifier: 'youtube',
  title: 'YouTube',
  description:
    'Most popular videos of a country (optionally a category), or the most viewed videos of the last 2 days for the niche keywords',
  key: 'youtube',
  fields: [
    {
      name: 'categoryId',
      description:
        'Category id for most popular videos (10 music, 17 sports, 20 gaming, 24 entertainment, 25 news, 26 howto, 28 tech). Empty searches the niche keywords',
      placeholder: '28',
    },
  ],
})
export class YoutubeTrends extends TrendSourceAbstract {
  async fetch(
    settings: Record<string, string>,
    context: TrendContext
  ): Promise<TrendItem[]> {
    const region = (context.region || 'US').toUpperCase();
    if (settings.categoryId || !context.keywords.length) {
      const data = await this.load(
        `videos?part=snippet,statistics&chart=mostPopular&maxResults=25&regionCode=${region}${
          settings.categoryId
            ? `&videoCategoryId=${encodeURIComponent(settings.categoryId)}`
            : ''
        }`,
        context.apiKey!
      );

      return (data.items || []).map((video: any, index: number) =>
        this.toTrend(video.id, video.snippet, index, data.items.length)
      );
    }

    const results: TrendItem[] = [];
    for (const keyword of context.keywords.slice(0, 3)) {
      const data = await this.load(
        `search?part=snippet&type=video&order=viewCount&maxResults=15&regionCode=${region}&relevanceLanguage=${
          context.language || 'en'
        }&publishedAfter=${dayjs()
          .subtract(2, 'days')
          .toISOString()}&q=${encodeURIComponent(keyword)}`,
        context.apiKey!
      );

      results.push(
        ...(data.items || []).map((video: any, index: number) =>
          this.toTrend(video.id.videoId, video.snippet, index, data.items.length)
        )
      );
    }

    return results;
  }

  private toTrend(id: string, snippet: any, index: number, total: number) {
    return {
      externalId: id,
      title: snippet.title,
      description: (snippet.description || '').slice(0, 1000),
      url: `https://www.youtube.com/watch?v=${id}`,
      score: rankScore(index, total),
    };
  }

  private async load(path: string, apiKey: string) {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/${path}&key=${encodeURIComponent(
        apiKey
      )}`,
      { signal: AbortSignal.timeout(30000) }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`YouTube ${response.status}: ${data?.error?.message}`);
    }

    return data;
  }
}
