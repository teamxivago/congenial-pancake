import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  TrendSourceAbstract,
  TrendSourceParams,
} from '@gitroom/nestjs-libraries/studio/trends/trend.interface';

@Injectable()
export class TrendManager {
  constructor(private _moduleRef: ModuleRef) {}

  getAllSources(): Omit<TrendSourceParams, 'target'>[] {
    return (Reflect.getMetadata('trend:source', TrendSourceAbstract) || []).map(
      (p: any) => ({
        identifier: p.identifier,
        title: p.title,
        description: p.description,
        key: p.key,
        fields: p.fields,
      })
    );
  }

  getSourceByName(
    identifier: string
  ): (TrendSourceParams & { instance: TrendSourceAbstract }) | undefined {
    const source = (
      Reflect.getMetadata('trend:source', TrendSourceAbstract) || []
    ).find((p: any) => p.identifier === identifier);

    if (!source) {
      return undefined;
    }

    return {
      ...source,
      instance: this._moduleRef.get(source.target, { strict: false }),
    };
  }
}
