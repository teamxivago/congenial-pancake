'use client';

import React, { FC, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '@gitroom/react/form/button';
import { Select } from '@gitroom/react/form/select';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useStudioAutomations,
  useStudioTrends,
} from '@gitroom/frontend/components/studio/studio.hooks';
import {
  defaultVideoOptions,
  StudioVideoOptions,
  StudioVideoOptionsForm,
} from '@gitroom/frontend/components/studio/studio.video.options';
import { useCreateContent } from '@gitroom/frontend/components/studio/studio.create';

const TrendToVideo: FC<{ trend: any; onCreated: () => void }> = ({
  trend,
  onCreated,
}) => {
  const t = useT();
  const modal = useModals();
  const create = useCreateContent();
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<StudioVideoOptions>(defaultVideoOptions);

  const submit = useCallback(async () => {
    setLoading(true);
    try {
      if (
        await create({
          topic: [trend.title, trend.description, trend.url]
            .filter(Boolean)
            .join('\n'),
          trendId: trend.id,
          ...video,
        })
      ) {
        modal.closeAll();
        onCreated();
      }
    } finally {
      setLoading(false);
    }
  }, [trend, video]);

  return (
    <div className="flex flex-col w-[700px] max-w-full">
      <StudioVideoOptionsForm value={video} onChange={setVideo} />
      <div className="mt-[16px]">
        <Button
          onClick={submit}
          loading={loading}
          disabled={!video.integrations.length}
        >
          {t('studio_generate', 'Generate')}
        </Button>
      </div>
    </div>
  );
};

export const StudioTrends: FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const t = useT();
  const modal = useModals();
  const [automationId, setAutomationId] = useState('');
  const { data: automations } = useStudioAutomations();
  const { data } = useStudioTrends(automationId);

  const makeVideo = useCallback(
    (trend: any) => () => {
      modal.openModal({
        title: trend.title,
        withCloseButton: true,
        children: <TrendToVideo trend={trend} onCreated={onCreated} />,
      });
    },
    [onCreated]
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('studio_trends', 'Trends')}</h3>
      <div className="text-customColor18 mt-[4px] mb-[16px]">
        {t(
          'studio_trends_description',
          'What your automations found in the last 7 days, the hottest first. Turn any of them into a video.'
        )}
      </div>
      <div className="max-w-[400px]">
        <Select
          label={t('studio_automation', 'Automation')}
          name="automation"
          disableForm={true}
          value={automationId}
          onChange={(e) => setAutomationId(e.target.value)}
        >
          <option value="">{t('studio_all', 'All')}</option>
          {automations?.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      {!data?.length && (
        <div className="bg-sixth border-fifth border rounded-[4px] p-[24px] text-customColor18">
          {t(
            'studio_no_trends',
            'No trends yet: create an automation, it collects trends on its first run.'
          )}
        </div>
      )}
      <div className="flex flex-col gap-[8px]">
        {[...(data || [])]
          .sort((a: any, b: any) => b.score - a.score)
          .map((trend: any) => (
            <div
              key={trend.id}
              className="bg-sixth border-fifth border rounded-[4px] p-[12px] flex gap-[16px] items-center"
            >
              <div className="w-[48px] text-center text-[18px] font-[600]">
                {Math.round(trend.score)}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <a
                  href={trend.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-[600] truncate hover:underline"
                >
                  {trend.title}
                </a>
                {!!trend.description && (
                  <div className="text-[12px] text-customColor18 line-clamp-2">
                    {trend.description}
                  </div>
                )}
                <div className="text-[12px] text-customColor18">
                  {trend.source} · {dayjs(trend.createdAt).format('MMM D, HH:mm')}
                  {trend.usedAt ? ` · ${t('studio_used', 'used')}` : ''}
                </div>
              </div>
              <div>
                <Button onClick={makeVideo(trend)}>
                  {t('studio_make_video', 'Make a video')}
                </Button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
