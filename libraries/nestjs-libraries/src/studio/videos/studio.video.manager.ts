import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  StudioVideoAbstract,
  StudioVideoParams,
} from '@gitroom/nestjs-libraries/studio/videos/studio.video.interface';

@Injectable()
export class StudioVideoManager {
  constructor(private _moduleRef: ModuleRef) {}

  getAllProviders(): StudioVideoParams[] {
    return (
      Reflect.getMetadata('studio:video', StudioVideoAbstract) || []
    ).map((p: any) => ({
      identifier: p.identifier,
      title: p.title,
      description: p.description,
      mode: p.mode,
      keys: p.keys,
      fields: p.fields,
    }));
  }

  getProviderByName(
    identifier: string
  ): (StudioVideoParams & { instance: StudioVideoAbstract }) | undefined {
    const provider = (
      Reflect.getMetadata('studio:video', StudioVideoAbstract) || []
    ).find((p: any) => p.identifier === identifier);

    if (!provider) {
      return undefined;
    }

    return {
      ...provider,
      instance: this._moduleRef.get(provider.target, { strict: false }),
    };
  }
}
