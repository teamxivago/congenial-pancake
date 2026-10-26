'use client';

import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  defaultVideoOptions,
  StudioVideoOptions,
  StudioVideoOptionsForm,
} from '@gitroom/frontend/components/studio/studio.video.options';

export const useCreateContent = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  return useCallback(
    async (body: Record<string, any>) => {
      const response = await fetch('/studio/contents', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toaster.show(
          [error?.message].flat().join(', ') || t('studio_error', 'Something went wrong'),
          'warning'
        );
        return false;
      }
      toaster.show(t('studio_content_started', 'Started! Follow it in All content'), 'success');
      return true;
    },
    []
  );
};

export const StudioCreate: FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const t = useT();
  const toaster = useToaster();
  const create = useCreateContent();
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [instructions, setInstructions] = useState('');
  const [video, setVideo] = useState<StudioVideoOptions>(defaultVideoOptions);

  const submit = useCallback(async () => {
    if (!topic.trim() || !video.integrations.length) {
      toaster.show(
        t('studio_topic_and_channel', 'Write a topic and pick at least one channel'),
        'warning'
      );
      return;
    }
    setLoading(true);
    try {
      if (await create({ topic, niche, instructions, ...video })) {
        onCreated();
      }
    } finally {
      setLoading(false);
    }
  }, [topic, niche, instructions, video]);

  return (
    <div className="flex flex-col max-w-[760px]">
      <h3 className="text-[20px]">{t('studio_create', 'Create a video')}</h3>
      <div className="text-customColor18 mt-[4px] mb-[16px]">
        {t(
          'studio_create_description',
          'Write any idea, story or topic: Studio writes the script, makes the video and schedules it.'
        )}
      </div>
      <Textarea
        label={t('studio_your_topic', 'Topic, story or prompt')}
        name="topic"
        disableForm={true}
        className="!min-h-[100px]"
        placeholder="The real story behind the first iPhone launch, told as a 45 seconds mystery"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />
      <Input
        label={t('studio_niche', 'Niche')}
        name="niche"
        disableForm={true}
        placeholder="tech history"
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
      />
      <Input
        label={t('studio_instructions_short', 'Style instructions (optional)')}
        name="instructions"
        disableForm={true}
        placeholder="Dramatic narrator, short sentences"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />
      <StudioVideoOptionsForm value={video} onChange={setVideo} />
      <div className="mt-[16px]">
        <Button onClick={submit} loading={loading}>
          {t('studio_generate', 'Generate')}
        </Button>
      </div>
    </div>
  );
};
