import dayjs from 'dayjs';
import {
  rankScore,
  TrendContext,
  TrendItem,
  TrendSource,
  TrendSourceAbstract,
} from '@gitroom/nestjs-libraries/studio/trends/trend.interface';

@TrendSource({
  identifier: 'hackernews',
  title: 'Hacker News',
  description: 'Front page stories, or the top stories of the last day for the niche keywords',
  fields: [],
})
export class HackerNewsTrends extends TrendSourceAbstract {
  async fetch(
    settings: Record<string, string>,
    context: TrendContext
  ): Promise<TrendItem[]> {
    const urls = context.keywords.length
      ? context.keywords
          .slice(0, 5)
          .map(
            (keyword) =>
              `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=20&numericFilters=created_at_i>${dayjs()
                .subtract(1, 'day')
                .unix()}&query=${encodeURIComponent(keyword)}`
          )
      : ['https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30'];

    const results: TrendItem[] = [];
    for (const url of urls) {
      const { hits = [] } = await (
        await fetch(url, { signal: AbortSignal.timeout(30000) })
      ).json();

      const sorted = [...hits].sort(
        (a: any, b: any) => (b.points || 0) - (a.points || 0)
      );
      results.push(
        ...sorted.map((hit: any, index: number) => ({
          externalId: hit.objectID,
          title: hit.title,
          description: hit.story_text?.slice(0, 1000),
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          score: rankScore(index, sorted.length),
        }))
      );
    }

    return results;
  }
}
