import {
  rankScore,
  splitList,
  TrendContext,
  TrendItem,
  TrendSource,
  TrendSourceAbstract,
} from '@gitroom/nestjs-libraries/studio/trends/trend.interface';

@TrendSource({
  identifier: 'reddit',
  title: 'Reddit',
  description:
    'Hot posts of subreddits, or a search of the niche keywords. Uses REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET of the server, Reddit blocks most anonymous server requests',
  fields: [
    {
      name: 'subreddits',
      description: 'Subreddits, comma separated (empty searches the niche keywords)',
      placeholder: 'fitness, nutrition',
    },
  ],
})
export class RedditTrends extends TrendSourceAbstract {
  private async token() {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      return '';
    }

    const { access_token } = await (
      await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'postiz-studio/1.0',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(30000),
      })
    ).json();

    return access_token || '';
  }

  async fetch(
    settings: Record<string, string>,
    context: TrendContext
  ): Promise<TrendItem[]> {
    const token = await this.token();
    const base = token ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
    const subreddits = splitList(settings.subreddits).map((p) =>
      p.replace(/^\/?r\//, '')
    );

    const paths = subreddits.length
      ? subreddits.map((sub) => `/r/${encodeURIComponent(sub)}/hot.json?limit=25`)
      : context.keywords
          .slice(0, 5)
          .map(
            (keyword) =>
              `/search.json?q=${encodeURIComponent(
                keyword
              )}&sort=hot&t=day&limit=25`
          );

    const results: TrendItem[] = [];
    for (const path of paths) {
      const response = await fetch(base + path, {
        headers: {
          'User-Agent': 'postiz-studio/1.0',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Reddit ${response.status} on ${path}`);
      }

      const children = ((await response.json())?.data?.children || [])
        .map((p: any) => p.data)
        .filter((p: any) => !p.stickied && !p.over_18);

      results.push(
        ...children.map((post: any, index: number) => ({
          externalId: post.name,
          title: post.title,
          description: (post.selftext || '').slice(0, 1000),
          url: `https://www.reddit.com${post.permalink}`,
          score: Math.min(
            100,
            rankScore(index, children.length) * 0.7 +
              Math.min(30, Math.log10((post.ups || 0) + 1) * 6)
          ),
        }))
      );
    }

    return results;
  }
}
