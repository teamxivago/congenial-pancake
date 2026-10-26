import {
  rankScore,
  TrendContext,
  TrendItem,
  TrendSource,
  TrendSourceAbstract,
} from '@gitroom/nestjs-libraries/studio/trends/trend.interface';

@TrendSource({
  identifier: 'x',
  title: 'X (Twitter) trends',
  description: 'Trending topics of a location on X, needs a paid X API plan',
  key: 'x',
  fields: [
    {
      name: 'woeid',
      description: 'Where On Earth ID of the location (1 worldwide, 23424977 USA, 23424975 UK, 23424848 India)',
      placeholder: '1',
    },
  ],
})
export class XTrends extends TrendSourceAbstract {
  async fetch(
    settings: Record<string, string>,
    context: TrendContext
  ): Promise<TrendItem[]> {
    const woeid = settings.woeid || '1';
    const response = await fetch(
      `https://api.x.com/2/trends/by/woeid/${encodeURIComponent(
        woeid
      )}?max_trends=30`,
      {
        headers: { Authorization: `Bearer ${context.apiKey}` },
        signal: AbortSignal.timeout(30000),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `X ${response.status}: ${data?.detail || data?.title || 'error'}`
      );
    }

    const trends = data?.data || [];
    return trends.map((trend: any, index: number) => ({
      externalId: `${woeid}:${trend.trend_name}`,
      title: trend.trend_name,
      description: trend.tweet_count ? `${trend.tweet_count} posts` : '',
      url: `https://x.com/search?q=${encodeURIComponent(trend.trend_name)}`,
      score: rankScore(index, trends.length),
    }));
  }
}
