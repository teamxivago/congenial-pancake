'use client';

import React, { FC, useCallback, useMemo } from 'react';
import { Select } from '@gitroom/react/form/select';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { PickPlatforms } from '@gitroom/frontend/components/launches/helpers/pick.platform.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  StudioField,
  StudioVideoProvider,
  useStudioCatalog,
  useStudioIntegrations,
  useStudioKeys,
  useStudioModels,
} from '@gitroom/frontend/components/studio/studio.hooks';

export interface StudioVideoOptions {
  videoMode: 'cheap' | 'ai' | 'none';
  videoProvider?: string;
  videoSettings: Record<string, any>;
  output: 'vertical' | 'horizontal';
  integrations: string[];
  approveScript: boolean;
  approvePost: boolean;
}

export const defaultVideoOptions: StudioVideoOptions = {
  videoMode: 'cheap',
  videoProvider: 'ffmpeg-slideshow',
  videoSettings: {},
  output: 'vertical',
  integrations: [],
  approveScript: false,
  approvePost: true,
};

const ModelField: FC<{
  provider: StudioVideoProvider;
  field: StudioField;
  value: string;
  onChange: (value: string) => void;
}> = ({ provider, field, value, onChange }) => {
  const t = useT();
  const { data: models, isLoading } = useStudioModels(provider.identifier, true);
  const listId = `studio-models-${provider.identifier}`;
  return (
    <div className="flex flex-col">
      <Input
        label={field.title}
        name={field.name}
        disableForm={true}
        list={listId}
        value={value}
        placeholder={field.default}
        onChange={(e) => onChange(e.target.value)}
        removeError={true}
      />
      <datalist id={listId}>
        {(models || []).map((model) => (
          <option key={model.value} value={model.value}>
            {model.label}
          </option>
        ))}
      </datalist>
      <div className="text-[12px] text-customColor18 mt-[4px] mb-[12px]">
        {isLoading
          ? t('studio_loading_models', 'Loading the current models...')
          : models?.length
          ? t(
              'studio_models_available',
              `${models.length} models available right now, start typing to search, or paste any model id`,
              { count: models.length }
            )
          : t(
              'studio_models_paste',
              'Paste any model id of this provider (add its API key to load the list)'
            )}
      </div>
    </div>
  );
};

export const StudioVideoOptionsForm: FC<{
  value: StudioVideoOptions;
  onChange: (value: StudioVideoOptions) => void;
}> = ({ value, onChange }) => {
  const t = useT();
  const { data: catalog } = useStudioCatalog();
  const { data: keys } = useStudioKeys();
  const { data: integrations } = useStudioIntegrations();

  const set = useCallback(
    (change: Partial<StudioVideoOptions>) => onChange({ ...value, ...change }),
    [value, onChange]
  );

  const providers = useMemo(
    () =>
      (catalog?.videoProviders || []).filter((p) => p.mode === value.videoMode),
    [catalog, value.videoMode]
  );

  const provider = providers.find((p) => p.identifier === value.videoProvider);

  const missingKeys = useMemo(
    () =>
      (provider?.keys || [])
        .concat('openai')
        .filter(
          (key, index, all) =>
            all.indexOf(key) === index &&
            !(keys || []).some(
              (k: any) => k.identifier === key && (k.connected || k.shared)
            )
        ),
    [provider, keys]
  );

  const changeMode = useCallback(
    (videoMode: StudioVideoOptions['videoMode']) => {
      const first = (catalog?.videoProviders || []).find(
        (p) => p.mode === videoMode
      );
      set({
        videoMode,
        videoProvider: videoMode === 'none' ? undefined : first?.identifier,
        videoSettings: {},
      });
    },
    [catalog, set]
  );

  const setSetting = useCallback(
    (name: string, settingValue: string) =>
      set({ videoSettings: { ...value.videoSettings, [name]: settingValue } }),
    [value, set]
  );

  return (
    <div className="flex flex-col">
      <Select
        label={t('studio_video_style', 'Video style')}
        name="videoMode"
        disableForm={true}
        value={value.videoMode}
        onChange={(e) => changeMode(e.target.value as any)}
      >
        <option value="cheap">
          {t('studio_mode_cheap', 'Cheap - voiceover slideshow rendered on your server')}
        </option>
        <option value="ai">
          {t('studio_mode_ai', 'AI video - paid generator of your choice')}
        </option>
        <option value="none">
          {t('studio_mode_none', 'No video - text posts only')}
        </option>
      </Select>

      {value.videoMode !== 'none' && (
        <>
          <Select
            label={t('studio_generator', 'Generator')}
            name="videoProvider"
            disableForm={true}
            value={value.videoProvider || ''}
            onChange={(e) =>
              set({ videoProvider: e.target.value, videoSettings: {} })
            }
          >
            {providers.map((p) => (
              <option key={p.identifier} value={p.identifier}>
                {p.title}
              </option>
            ))}
          </Select>
          {!!provider && (
            <div className="text-[12px] text-customColor18 -mt-[8px] mb-[12px]">
              {provider.description}
            </div>
          )}
          {provider?.fields.map((field) =>
            field.type === 'model' ? (
              <ModelField
                key={`${provider.identifier}-${field.name}`}
                provider={provider}
                field={field}
                value={value.videoSettings[field.name] || ''}
                onChange={(v) => setSetting(field.name, v)}
              />
            ) : field.type === 'select' ? (
              <Select
                key={`${provider.identifier}-${field.name}`}
                label={field.title}
                name={field.name}
                disableForm={true}
                value={value.videoSettings[field.name] || field.default || ''}
                onChange={(e) => setSetting(field.name, e.target.value)}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : field.type === 'json' ? (
              <Textarea
                key={`${provider.identifier}-${field.name}`}
                label={field.title}
                name={field.name}
                disableForm={true}
                className="!min-h-[80px] font-mono text-[12px]"
                placeholder='{"resolution": "1080p"}'
                value={value.videoSettings[field.name] || ''}
                onChange={(e) => setSetting(field.name, e.target.value)}
              />
            ) : (
              <Input
                key={`${provider.identifier}-${field.name}`}
                label={field.title}
                name={field.name}
                disableForm={true}
                type={field.type === 'number' ? 'number' : 'text'}
                placeholder={field.default || field.description}
                value={value.videoSettings[field.name] || ''}
                onChange={(e) => setSetting(field.name, e.target.value)}
              />
            )
          )}
          <Select
            label={t('studio_format', 'Format')}
            name="output"
            disableForm={true}
            value={value.output}
            onChange={(e) => set({ output: e.target.value as any })}
          >
            <option value="vertical">
              {t('studio_vertical', 'Vertical 9:16 (Reels, Shorts, TikTok)')}
            </option>
            <option value="horizontal">
              {t('studio_horizontal', 'Horizontal 16:9 (YouTube, X, LinkedIn)')}
            </option>
          </Select>
        </>
      )}

      {!!missingKeys.length && (
        <div className="text-[13px] text-red-400 mb-[12px]">
          {t('studio_missing_keys', 'Missing API keys, add them in the API keys tab:')}{' '}
          {missingKeys.join(', ')}
        </div>
      )}

      <div className="text-[14px] mb-[6px]">
        {t('studio_channels', 'Publish to')}
      </div>
      {integrations ? (
        <PickPlatforms
          integrations={integrations.filter((p: any) => !p.disabled)}
          selectedIntegrations={integrations.filter((p: any) =>
            value.integrations.includes(p.id)
          )}
          onChange={(selected: any[]) =>
            set({ integrations: selected.map((p) => p.id) })
          }
          singleSelect={false}
          toolTip={true}
          isMain={true}
        />
      ) : null}
      {!integrations?.length && (
        <div className="text-[12px] text-customColor18">
          {t(
            'studio_no_channels',
            'Connect your channels from the calendar first (Instagram, TikTok, YouTube, X, Facebook...)'
          )}
        </div>
      )}

      <div className="flex flex-col gap-[8px] mt-[16px]">
        <label className="flex items-center gap-[8px] cursor-pointer text-[14px]">
          <input
            type="checkbox"
            checked={value.approveScript}
            onChange={(e) => set({ approveScript: e.target.checked })}
          />
          {t(
            'studio_approve_script',
            'I approve the script before the video is made (saves money on rejected ideas)'
          )}
        </label>
        <label className="flex items-center gap-[8px] cursor-pointer text-[14px]">
          <input
            type="checkbox"
            checked={value.approvePost}
            onChange={(e) => set({ approvePost: e.target.checked })}
          />
          {t(
            'studio_approve_post',
            'I approve the final video before it is scheduled'
          )}
        </label>
        {!value.approveScript && !value.approvePost && (
          <div className="text-[12px] text-customColor18">
            {t(
              'studio_fully_automatic',
              'Fully automatic: videos are produced and scheduled without asking you'
            )}
          </div>
        )}
      </div>
    </div>
  );
};
