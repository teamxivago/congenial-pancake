import Parser from 'rss-parser';
import {
  rankScore,
  splitList,
  TrendContext,
  TrendItem,
  TrendSource,
  TrendSourceAbstract,
} from '@gitroom/nestjs-libraries/studio/trends/trend.interface';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';

const parser = new Parser();

@TrendSource({
  identifier: 'rss',
  title: 'RSS feeds',
  description: 'Latest items of any blogs or news sites of your niche',
  fields: [
    {
      name: 'urls',
      description: 'Feed URLs, comma separated',
      placeholder: 'https://example.com/feed.xml',
    },
  ],
})
export class RssTrends extends TrendSourceAbstract {
  async fetch(
    settings: Record<string, string>,
    context: TrendContext
  ): Promise<TrendItem[]> {
    const results: TrendItem[] = [];
    for (const url of splitList(settings.urls).slice(0, 10)) {
      if (!(await isSafePublicHttpsUrl(url))) {
        throw new Error(`Feed URL must be a public HTTPS URL: ${url}`);
      }

      const { items } = await parser.parseURL(url);
      const latest = items.slice(0, 15);
      results.push(
        ...latest.map((item, index) => ({
          externalId: item.guid || item.link || item.title || '',
          title: item.title || '',
          description: (item.contentSnippet || '').slice(0, 1000),
          url: item.link,
          score: rankScore(index, latest.length),
        }))
      );
    }

    return results;
  }
}
