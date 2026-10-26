import { Injectable } from '@nestjs/common';
import { StudioScript } from '@gitroom/nestjs-libraries/studio/script/studio.script';

export interface StudioVideoInput {
  output: 'vertical' | 'horizontal';
  script: StudioScript;
  settings: Record<string, any>;
  // resolves an API key of the organization (studio.keys.ts identifiers)
  key: (identifier: string) => Promise<string | undefined>;
}

// a remote url (downloaded into the storage) or a local file (moved into it)
export type StudioVideoResult = { url: string } | { file: string };

export interface StudioVideoField {
  name: string;
  title: string;
  description?: string;
  // model: a select whose options are loaded live from the provider's models()
  type: 'text' | 'number' | 'select' | 'model' | 'json';
  options?: { value: string; label: string }[];
  default?: string;
}

export abstract class StudioVideoAbstract {
  abstract generate(input: StudioVideoInput): Promise<StudioVideoResult>;

  // live list of the models the provider offers right now
  models?(apiKey?: string): Promise<{ value: string; label: string }[]>;
}

export interface StudioVideoParams {
  identifier: string;
  title: string;
  description: string;
  mode: 'cheap' | 'ai';
  // studio keys (studio.keys.ts) the provider can't run without
  keys: string[];
  fields: StudioVideoField[];
}

export function StudioVideo(params: StudioVideoParams) {
  return function (target: any) {
    // Apply @Injectable decorator to the target class
    Injectable()(target);

    const existingMetadata =
      Reflect.getMetadata('studio:video', StudioVideoAbstract) || [];

    existingMetadata.push({ target, ...params });

    Reflect.defineMetadata(
      'studio:video',
      existingMetadata,
      StudioVideoAbstract
    );
  };
}

// Polls until check() returns a value, check() throws to stop on failures
export async function pollUntil<T>(
  check: () => Promise<T | undefined>,
  intervalMs = 10000,
  maxMinutes = 30
): Promise<T> {
  const deadline = Date.now() + maxMinutes * 60000;
  while (Date.now() < deadline) {
    const value = await check();
    if (value !== undefined) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Video generation timed out');
}

export function parseExtra(value?: string): Record<string, any> {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    throw new Error('Extra parameters must be valid JSON');
  }
}

export async function readError(response: Response, name: string) {
  const text = await response.text().catch(() => '');
  let message = text;
  try {
    const json = JSON.parse(text);
    message =
      json?.detail?.[0]?.msg ||
      json?.detail ||
      json?.error?.message ||
      json?.error ||
      json?.message ||
      text;
  } catch (err) {
    /** not json **/
  }
  return `${name} ${response.status}: ${
    typeof message === 'string' ? message : JSON.stringify(message)
  }`.slice(0, 500);
}
