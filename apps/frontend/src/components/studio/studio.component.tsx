'use client';

import React, { FC, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import { StudioContents } from '@gitroom/frontend/components/studio/studio.contents';
import { StudioAutomations } from '@gitroom/frontend/components/studio/studio.automations';
import { StudioTrends } from '@gitroom/frontend/components/studio/studio.trends';
import { StudioCreate } from '@gitroom/frontend/components/studio/studio.create';
import { StudioKeys } from '@gitroom/frontend/components/studio/studio.keys';

export const StudioComponent: FC = () => {
  const t = useT();
  const tabs = [
    { tab: 'approvals', label: t('studio_approvals', 'Needs approval') },
    { tab: 'contents', label: t('studio_all_content', 'All content') },
    { tab: 'create', label: t('studio_create', 'Create a video') },
    { tab: 'automations', label: t('studio_automations', 'Automations') },
    { tab: 'trends', label: t('studio_trends', 'Trends') },
    { tab: 'keys', label: t('studio_api_keys', 'API keys') },
  ];
  const [tab, setTab] = useState('approvals');

  return (
    <>
      <div className="bg-newBgColorInner p-[20px] mobile:p-[12px] flex flex-col transition-all w-[260px] mobile:w-full">
        <div className="flex flex-1 flex-col gap-[15px] mobile:flex-row mobile:gap-[8px] mobile:overflow-x-auto mobile:pb-[6px] scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
          {tabs.map(({ tab: tabKey, label }) => (
            <div
              key={tabKey}
              className={clsx(
                'cursor-pointer flex items-center gap-[12px] group/profile hover:bg-boxHover rounded-e-[8px] mobile:shrink-0 mobile:whitespace-nowrap mobile:rounded-[8px] mobile:px-[12px] mobile:py-[8px]',
                tabKey === tab && 'bg-boxHover'
              )}
              onClick={() => setTab(tabKey)}
            >
              <div
                className={clsx(
                  'h-full w-[4px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity mobile:hidden',
                  tabKey === tab && 'opacity-100'
                )}
              >
                <SVGLine />
              </div>
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[20px] mobile:p-[12px] gap-[12px] overflow-y-auto">
        {tab === 'approvals' && (
          <StudioContents
            key="approvals"
            status="awaiting_script_approval,awaiting_post_approval"
            title={t('studio_approvals', 'Needs approval')}
            description={t(
              'studio_approvals_description',
              'Scripts and videos waiting for you. Approve, edit or reject them.'
            )}
          />
        )}
        {tab === 'contents' && (
          <StudioContents
            key="contents"
            status=""
            title={t('studio_all_content', 'All content')}
            description={t(
              'studio_all_content_description',
              'Everything Studio produced, from the first script to the scheduled post.'
            )}
          />
        )}
        {tab === 'create' && <StudioCreate onCreated={() => setTab('contents')} />}
        {tab === 'automations' && <StudioAutomations />}
        {tab === 'trends' && <StudioTrends onCreated={() => setTab('contents')} />}
        {tab === 'keys' && <StudioKeys />}
      </div>
    </>
  );
};
