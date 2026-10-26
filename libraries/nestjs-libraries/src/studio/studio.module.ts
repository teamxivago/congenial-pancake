import { Global, Module } from '@nestjs/common';
import { TrendManager } from '@gitroom/nestjs-libraries/studio/trends/trend.manager';
import { GoogleTrends } from '@gitroom/nestjs-libraries/studio/trends/google.trends';
import { GoogleNewsTrends } from '@gitroom/nestjs-libraries/studio/trends/google.news.trends';
import { RedditTrends } from '@gitroom/nestjs-libraries/studio/trends/reddit.trends';
import { YoutubeTrends } from '@gitroom/nestjs-libraries/studio/trends/youtube.trends';
import { HackerNewsTrends } from '@gitroom/nestjs-libraries/studio/trends/hackernews.trends';
import { XTrends } from '@gitroom/nestjs-libraries/studio/trends/x.trends';
import { RssTrends } from '@gitroom/nestjs-libraries/studio/trends/rss.trends';
import { StudioVideoManager } from '@gitroom/nestjs-libraries/studio/videos/studio.video.manager';
import { FfmpegSlideshowVideo } from '@gitroom/nestjs-libraries/studio/videos/ffmpeg.slideshow.video';
import { FalVideo } from '@gitroom/nestjs-libraries/studio/videos/fal.video';
import { ReplicateVideo } from '@gitroom/nestjs-libraries/studio/videos/replicate.video';
import { OpenaiSoraVideo } from '@gitroom/nestjs-libraries/studio/videos/openai.sora.video';
import { GoogleVideo } from '@gitroom/nestjs-libraries/studio/videos/google.video';
import { RunwayVideo } from '@gitroom/nestjs-libraries/studio/videos/runway.video';
import { LumaVideo } from '@gitroom/nestjs-libraries/studio/videos/luma.video';
import { StudioScriptService } from '@gitroom/nestjs-libraries/studio/script/studio.script.service';
import { StudioRepository } from '@gitroom/nestjs-libraries/database/prisma/studio/studio.repository';
import { StudioService } from '@gitroom/nestjs-libraries/database/prisma/studio/studio.service';

@Global()
@Module({
  providers: [
    TrendManager,
    GoogleTrends,
    GoogleNewsTrends,
    RedditTrends,
    YoutubeTrends,
    HackerNewsTrends,
    XTrends,
    RssTrends,
    StudioVideoManager,
    FfmpegSlideshowVideo,
    FalVideo,
    ReplicateVideo,
    OpenaiSoraVideo,
    GoogleVideo,
    RunwayVideo,
    LumaVideo,
    StudioScriptService,
    StudioRepository,
    StudioService,
  ],
  get exports() {
    return this.providers;
  },
})
export class StudioModule {}
