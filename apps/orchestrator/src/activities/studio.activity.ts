import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { StudioService } from '@gitroom/nestjs-libraries/database/prisma/studio/studio.service';

@Injectable()
@Activity()
export class StudioActivity {
  constructor(private _studioService: StudioService) {}

  @ActivityMethod()
  async studioRunAutomation(id: string) {
    return this._studioService.runAutomation(id);
  }

  @ActivityMethod()
  async studioGenerateScript(contentId: string) {
    return this._studioService.generateScript(contentId);
  }

  @ActivityMethod()
  async studioRenderVideo(contentId: string) {
    return this._studioService.renderVideo(contentId);
  }

  @ActivityMethod()
  async studioFinishContent(contentId: string) {
    return this._studioService.finishContent(contentId);
  }

  @ActivityMethod()
  async studioFailContent(contentId: string, error: string) {
    return this._studioService.failContent(contentId, error);
  }
}
