'use client';

import React, { FC, Fragment, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Textarea } from '@gitroom/react/form/textarea';
import { Slider } from '@gitroom/react/form/slider';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useStudioAutomations,
  useStudioCatalog,
  useStudioKeys,
} from '@gitroom/frontend/components/studio/studio.hooks';
import {
  defaultVideoOptions,
  StudioVideoOptions,
  StudioVideoOptionsForm,
} from '@gitroom/frontend/components/studio/studio.video.options';

export const StudioAutomations: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const { data, mutate } = useStudioAutomations();

  const edit = useCallback(
    (automation?: any) => () => {
      modal.openModal({
        title: automation
          ? t('studio_edit_automation', 'Edit automation')
          : t('studio_new_automation', 'New automation'),
        withCloseButton: true,
        children: <StudioAutomationForm data={automation} reload={mutate} />,
      });
    },
    [mutate]
  );

  const remove = useCallback(
    (automation: any) => async () => {
      if (
        await deleteDialog(
          t('studio_delete_automation', `Delete ${automation.name}?`, {
            name: automation.name,
          })
        )
      ) {
        await fetch(`/studio/automations/${automation.id}`, { method: 'DELETE' });
        mutate();
        toaster.show(t('studio_automation_deleted', 'Automation deleted'), 'success');
      }
    },
    [mutate]
  );

  const changeActive = useCallback(
    (automation: any) => async (value: 'on' | 'off') => {
      await fetch(`/studio/automations/${automation.id}/active`, {
        method: 'POST',
        body: JSON.stringify({ active: value === 'on' }),
      });
      mutate();
    },
    [mutate]
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('studio_automations', 'Automations')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'studio_automations_description',
          'An automation watches the trends of a niche, writes a story about the best one, makes the video and schedules it on your channels, on repeat.'
        )}
      </div>
      <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
        {!!data?.length && (
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr,auto,auto,auto] gap-x-[16px] gap-y-[12px] items-center">
            <div>{t('studio_name', 'Name')}</div>
            <div>{t('studio_video', 'Video')}</div>
            <div>{t('studio_schedule', 'Schedule')}</div>
            <div>{t('studio_last_run', 'Last run')}</div>
            <div />
            <div />
            <div>{t('active', 'Active')}</div>
            {data.map((automation: any) => (
              <Fragment key={automation.id}>
                <div className="flex flex-col">
                  <span>{automation.name}</span>
                  <span className="text-[12px] text-customColor18">
                    {automation.niche}
                  </span>
                  {!!automation.lastError && (
                    <span className="text-[12px] text-red-400 whitespace-pre-line">
                      {automation.lastError}
                    </span>
                  )}
                </div>
                <div className="text-[13px]">
                  {automation.videoMode === 'none'
                    ? t('studio_text_only', 'Text only')
                    : automation.videoProvider || 'ffmpeg-slideshow'}
                </div>
                <div className="text-[13px]">
                  {t('studio_every_hours', `every ${automation.intervalHours}h`, {
                    hours: automation.intervalHours,
                  })}
                  {', '}
                  {t('studio_max_per_day', `max ${automation.maxPerDay}/day`, {
                    count: automation.maxPerDay,
                  })}
                </div>
                <div className="text-[13px]">
                  {automation.lastRunAt
                    ? dayjs(automation.lastRunAt).format('MMM D, HH:mm')
                    : '-'}
                </div>
                <Button onClick={edit(automation)}>{t('edit', 'Edit')}</Button>
                <Button secondary={true} onClick={remove(automation)}>
                  {t('delete', 'Delete')}
                </Button>
                <Slider
                  value={automation.active ? 'on' : 'off'}
                  onChange={changeActive(automation)}
                  fill={true}
                />
              </Fragment>
            ))}
          </div>
        )}
        <div>
          <Button onClick={edit()}>
            {t('studio_add_automation', 'Add an automation')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const languages = [
  ['en', 'English'],
  ['es', 'Spanish'],
  ['pt', 'Portuguese'],
  ['fr', 'French'],
  ['de', 'German'],
  ['it', 'Italian'],
  ['hi', 'Hindi'],
  ['ar', 'Arabic'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['zh', 'Chinese'],
  ['ru', 'Russian'],
  ['tr', 'Turkish'],
  ['id', 'Indonesian'],
  ['nl', 'Dutch'],
  ['pl', 'Polish'],
];

const regions = [
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['IN', 'India'],
  ['CA', 'Canada'],
  ['AU', 'Australia'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['BR', 'Brazil'],
  ['MX', 'Mexico'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['ID', 'Indonesia'],
  ['NG', 'Nigeria'],
  ['ZA', 'South Africa'],
  ['AE', 'United Arab Emirates'],
  ['PK', 'Pakistan'],
  ['PH', 'Philippines'],
  ['TR', 'Turkey'],
];

export const StudioAutomationForm: FC<{
  data?: any;
  reload: () => void;
}> = ({ data, reload }) => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const { data: catalog } = useStudioCatalog();
  const { data: keys } = useStudioKeys();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => ({
    name: data?.name || '',
    niche: data?.niche || '',
    keywords: data?.keywords || '',
    language: data?.language || 'en',
    region: data?.region || 'US',
    instructions: data?.instructions || '',
    intervalHours: data?.intervalHours || 24,
    maxPerDay: data?.maxPerDay || 1,
    active: data ? data.active : true,
    sources: (data
      ? JSON.parse(data.sources || '[]')
      : [
          { identifier: 'google-trends', settings: {} },
          { identifier: 'google-news', settings: {} },
        ]) as { identifier: string; settings: Record<string, string> }[],
  }));
  const [video, setVideo] = useState<StudioVideoOptions>(() =>
    data
      ? {
          videoMode: data.videoMode,
          videoProvider: data.videoProvider || undefined,
          videoSettings: JSON.parse(data.videoSettings || '{}'),
          output: data.output,
          integrations: JSON.parse(data.integrations || '[]'),
          approveScript: data.approveScript,
          approvePost: data.approvePost,
        }
      : defaultVideoOptions
  );

  const set = useCallback(
    (change: Partial<typeof form>) => setForm((f) => ({ ...f, ...change })),
    []
  );

  const toggleSource = useCallback(
    (identifier: string) => {
      set({
        sources: form.sources.some((s) => s.identifier === identifier)
          ? form.sources.filter((s) => s.identifier !== identifier)
          : [...form.sources, { identifier, settings: {} }],
      });
    },
    [form.sources]
  );

  const setSourceSetting = useCallback(
    (identifier: string, name: string, value: string) => {
      set({
        sources: form.sources.map((s) =>
          s.identifier === identifier
            ? { ...s, settings: { ...s.settings, [name]: value } }
            : s
        ),
      });
    },
    [form.sources]
  );

  const save = useCallback(async () => {
    if (!form.name || !form.niche || !form.sources.length) {
      toaster.show(
        t('studio_fill_required', 'Add a name, a niche and at least one trend source'),
        'warning'
      );
      return;
    }
    if (!video.integrations.length) {
      toaster.show(t('studio_pick_channel', 'Pick at least one channel'), 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        data ? `/studio/automations/${data.id}` : '/studio/automations',
        {
          method: data ? 'PUT' : 'POST',
          body: JSON.stringify({
            ...form,
            intervalHours: +form.intervalHours,
            maxPerDay: +form.maxPerDay,
            ...video,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toaster.show(
          [error?.message].flat().join(', ') || t('studio_error', 'Something went wrong'),
          'warning'
        );
        return;
      }
      toaster.show(t('studio_automation_saved', 'Automation saved'), 'success');
      modal.closeAll();
      reload();
    } finally {
      setLoading(false);
    }
  }, [form, video, data]);

  return (
    <div className="flex flex-col w-[760px] max-w-full">
      <Input
        label={t('studio_name', 'Name')}
        name="name"
        disableForm={true}
        placeholder="Daily AI news shorts"
        value={form.name}
        onChange={(e) => set({ name: e.target.value })}
      />
      <Input
        label={t('studio_niche', 'Niche')}
        name="niche"
        disableForm={true}
        placeholder="fitness for busy parents, crypto, true crime stories, cooking..."
        value={form.niche}
        onChange={(e) => set({ niche: e.target.value })}
      />
      <Input
        label={t('studio_keywords', 'Keywords (comma separated, trends matching them rank higher)')}
        name="keywords"
        disableForm={true}
        placeholder="workout, protein, home gym"
        value={form.keywords}
        onChange={(e) => set({ keywords: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-[12px]">
        <Select
          label={t('studio_language', 'Language')}
          name="language"
          disableForm={true}
          value={form.language}
          onChange={(e) => set({ language: e.target.value })}
        >
          {languages.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          label={t('studio_region', 'Country of the trends')}
          name="region"
          disableForm={true}
          value={form.region}
          onChange={(e) => set({ region: e.target.value })}
        >
          {regions.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <div className="text-[14px] mb-[6px]">{t('studio_sources', 'Trend sources')}</div>
      <div className="flex flex-col gap-[8px] mb-[16px]">
        {catalog?.sources.map((source) => {
          const selected = form.sources.find(
            (s) => s.identifier === source.identifier
          );
          const keyMissing =
            !!source.key &&
            !(keys || []).some(
              (k: any) => k.identifier === source.key && (k.connected || k.shared)
            );
          return (
            <div
              key={source.identifier}
              className="border border-fifth rounded-[4px] p-[10px]"
            >
              <label className="flex items-center gap-[8px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={() => toggleSource(source.identifier)}
                />
                <span className="font-[600]">{source.title}</span>
                {keyMissing && (
                  <span className="text-[12px] text-red-400">
                    {t('studio_needs_key', 'needs an API key')}
                  </span>
                )}
              </label>
              <div className="text-[12px] text-customColor18 ms-[22px]">
                {source.description}
              </div>
              {!!selected &&
                source.fields.map((field) => (
                  <div key={field.name} className="ms-[22px] mt-[8px]">
                    <Input
                      label={field.description}
                      name={field.name}
                      disableForm={true}
                      removeError={true}
                      placeholder={field.placeholder}
                      value={selected.settings?.[field.name] || ''}
                      onChange={(e) =>
                        setSourceSetting(source.identifier, field.name, e.target.value)
                      }
                    />
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      <Textarea
        label={t('studio_instructions', 'Style instructions for the scripts (optional)')}
        name="instructions"
        disableForm={true}
        className="!min-h-[80px]"
        placeholder="Funny tone, speak to beginners, end every video with a question to the viewers"
        value={form.instructions}
        onChange={(e) => set({ instructions: e.target.value })}
      />

      <StudioVideoOptionsForm value={video} onChange={setVideo} />

      <div className="grid grid-cols-2 gap-[12px] mt-[16px]">
        <Input
          label={t('studio_interval', 'Check trends every (hours)')}
          name="intervalHours"
          type="number"
          min={1}
          max={168}
          disableForm={true}
          value={form.intervalHours}
          onChange={(e) => set({ intervalHours: +e.target.value })}
        />
        <Input
          label={t('studio_per_day', 'Videos per day (max)')}
          name="maxPerDay"
          type="number"
          min={1}
          max={20}
          disableForm={true}
          value={form.maxPerDay}
          onChange={(e) => set({ maxPerDay: +e.target.value })}
        />
      </div>
      <label className="flex items-center gap-[8px] cursor-pointer text-[14px] mb-[16px]">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set({ active: e.target.checked })}
        />
        {t('studio_start_now', 'Active (starts right away)')}
      </label>
      <div>
        <Button onClick={save} loading={loading}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};
