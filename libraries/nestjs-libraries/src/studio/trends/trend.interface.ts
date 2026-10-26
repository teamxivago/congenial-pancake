import { Injectable } from '@nestjs/common';

export interface TrendItem {
  // stable id at the source, used to never store the same trend twice
  externalId: string;
  title: string;
  description?: string;
  url?: string;
  // 0-100, how hot the item is at its source
  score: number;
}

export interface TrendContext {
  keywords: string[];
  region: string;
  language: string;
  apiKey?: string;
}

export interface TrendSourceField {
  name: string;
  description: string;
  placeholder: string;
}

export abstract class TrendSourceAbstract {
  abstract fetch(
    settings: Record<string, string>,
    context: TrendContext
  ): Promise<TrendItem[]>;
}

export interface TrendSourceParams {
  identifier: string;
  title: string;
  description: string;
  // a studio key identifier (studio.keys.ts) the source can't run without
  key?: string;
  fields: TrendSourceField[];
}

export function TrendSource(params: TrendSourceParams) {
  return function (target: any) {
    // Apply @Injectable decorator to the target class
    Injectable()(target);

    const existingMetadata =
      Reflect.getMetadata('trend:source', TrendSourceAbstract) || [];

    existingMetadata.push({ target, ...params });

    Reflect.defineMetadata(
      'trend:source',
      existingMetadata,
      TrendSourceAbstract
    );
  };
}

// rank based score: the first item of a list gets 100, the last one close to 0
export function rankScore(index: number, total: number) {
  return total ? Math.round(((total - index) / total) * 100) : 0;
}

export function splitList(value?: string) {
  return (value || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}
