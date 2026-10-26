import Parser from 'rss-parser';
import {
  rankScore,
  splitList,
  TrendContext,
  TrendItem,
  TrendSource,
  TrendSourceAbstract,
} from '@gitroom/nestjs-libraries/studio/trends/trend.interface';

const parser = new Parser();

@TrendSource({
  identifier: 'google-news',
  title: 'Google News',
  description: 'Latest news stories matching the niche keywords',
  fields: [
    {
      name: 'query',
      description: 'Search terms, comma separated (empty uses the niche keywords)',
      placeholder: 'ai tools, startups',
    },
  ],
})
export class GoogleNewsTrends extends TrendSourceAbstract {
  async fetch(
    settings: Record<string, string>,
    context: TrendContext
  ): Promise<TrendItem[]> {
    const queries = splitList(settings.query).length
      ? splitList(settings.query)
      : context.keywords;
    const region = (context.region || 'US').toUpperCase();
    const language = context.language || 'en';

    const results: TrendItem[] = [];
    for (const query of queries.slice(0, 5)) {
      const { items } = await parser.parseURL(
        `https://news.google.com/rss/search?q=${encodeURIComponent(
          `${query} when:1d`
        )}&hl=${language}-${region}&gl=${region}&ceid=${region}:${language}`
      );

      results.push(
        ...items.slice(0, 20).map((item, index) => ({
          externalId: item.guid || item.link || item.title || '',
          title: item.title || '',
          description: item.contentSnippet,
          url: item.link,
          score: rankScore(index, Math.min(items.length, 20)),
        }))
      );
    }

    return results;
  }
}
