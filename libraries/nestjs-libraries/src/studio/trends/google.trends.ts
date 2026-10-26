import Parser from 'rss-parser';
import {
  rankScore,
  TrendContext,
  TrendItem,
  TrendSource,
  TrendSourceAbstract,
} from '@gitroom/nestjs-libraries/studio/trends/trend.interface';

const parser = new Parser({
  customFields: {
    item: [
      ['ht:approx_traffic', 'traffic'],
      ['ht:news_item', 'news', { keepArray: true }],
    ],
  },
});

@TrendSource({
  identifier: 'google-trends',
  title: 'Google Trends',
  description: 'Daily trending searches of a country',
  fields: [],
})
export class GoogleTrends extends TrendSourceAbstract {
  async fetch(
    settings: Record<string, string>,
    context: TrendContext
  ): Promise<TrendItem[]> {
    const { items } = await parser.parseURL(
      `https://trends.google.com/trending/rss?geo=${encodeURIComponent(
        context.region || 'US'
      )}`
    );

    return items.map((item: any, index) => {
      const news = (item.news || [])[0] || {};
      const traffic = +String(item.traffic || '0').replace(/[^0-9]/g, '');
      return {
        externalId: `${context.region}:${item.title}:${(
          item.pubDate || ''
        ).slice(0, 16)}`,
        title: item.title,
        description: [news['ht:news_item_title'], news['ht:news_item_snippet']]
          .flat()
          .filter((p) => typeof p === 'string' && p)
          .join(' - '),
        url: [news['ht:news_item_url']].flat()[0] || item.link,
        // traffic goes from 100+ to 1M+, keep the rank as the main signal
        score: Math.min(
          100,
          rankScore(index, items.length) * 0.7 +
            Math.min(30, Math.log10(traffic + 1) * 5)
        ),
      };
    });
  }
}
