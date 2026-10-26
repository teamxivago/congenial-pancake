'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useStudioContent,
  useStudioContents,
} from '@gitroom/frontend/components/studio/studio.hooks';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-500',
  awaiting_script_approval: 'bg-yellow-600',
  rendering: 'bg-blue-600',
  awaiting_post_approval: 'bg-yellow-600',
  scheduling: 'bg-blue-600',
  scheduled: 'bg-green-600',
  failed: 'bg-red-600',
  rejected: 'bg-gray-600',
};

export const useStatusLabel = () => {
  const t = useT();
  return useCallback(
    (status: string) =>
      ({
        pending: t('studio_status_pending', 'Writing script'),
        awaiting_script_approval: t('studio_status_script', 'Script to approve'),
        rendering: t('studio_status_rendering', 'Making the video'),
        awaiting_post_approval: t('studio_status_post', 'Video to approve'),
        scheduling: t('studio_status_scheduling', 'Scheduling'),
        scheduled: t('studio_status_scheduled', 'Scheduled'),
        failed: t('studio_status_failed', 'Failed'),
        rejected: t('studio_status_rejected', 'Rejected'),
      }[status] || status),
    [t]
  );
};

export const StudioContents: FC<{
  status: string;
  title: string;
  description: string;
}> = ({ status, title, description }) => {
  const t = useT();
  const modal = useModals();
  const label = useStatusLabel();
  const { data, mutate } = useStudioContents(status);

  const open = useCallback(
    (content: any) => () => {
      modal.openModal({
        title: content.title || t('studio_content', 'Content'),
        withCloseButton: true,
        children: <StudioContentDetails id={content.id} reload={mutate} />,
      });
    },
    [mutate]
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{title}</h3>
      <div className="text-customColor18 mt-[4px] mb-[16px]">{description}</div>
      {!data?.length && (
        <div className="bg-sixth border-fifth border rounded-[4px] p-[24px] text-customColor18">
          {t('studio_nothing_here', 'Nothing here yet.')}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[16px]">
        {data?.map((content: any) => (
          <div
            key={content.id}
            onClick={open(content)}
            className="cursor-pointer bg-sixth border-fifth border rounded-[8px] p-[16px] flex flex-col gap-[10px] hover:bg-boxHover"
          >
            <div className="flex items-center justify-between gap-[8px]">
              <span
                className={clsx(
                  'text-[12px] text-white px-[8px] py-[2px] rounded-[4px]',
                  statusColors[content.status] || 'bg-gray-500'
                )}
              >
                {label(content.status)}
              </span>
              <span className="text-[12px] text-customColor18">
                {dayjs(content.createdAt).format('MMM D, HH:mm')}
              </span>
            </div>
            <div className="font-[600] line-clamp-2">
              {content.title || content.topic.split('\n')[0]}
            </div>
            {!!content.videoPath && (
              <video
                src={content.videoPath}
                className="w-full max-h-[240px] rounded-[4px] bg-black"
                muted={true}
                preload="metadata"
              />
            )}
            <div className="text-[12px] text-customColor18">
              {content.automation?.name || t('studio_manual', 'Created manually')}
              {' · '}
              {content.videoMode === 'none'
                ? t('studio_text_only', 'Text only')
                : content.videoProvider || 'ffmpeg-slideshow'}
            </div>
            {!!content.error && (
              <div className="text-[12px] text-red-400 line-clamp-3 whitespace-pre-line">
                {content.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const StudioContentDetails: FC<{
  id: string;
  reload: () => void;
}> = ({ id, reload }) => {
  const t = useT();
  const { data: content } = useStudioContent(id);

  if (!content) {
    return <div className="p-[20px]">{t('loading', 'Loading...')}</div>;
  }

  return <StudioContentEditor content={content} reload={reload} />;
};

const StudioContentEditor: FC<{
  content: any;
  reload: () => void;
}> = ({ content, reload }) => {
  const id = content.id;
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useModals();
  const label = useStatusLabel();
  const [script, setScript] = useState<any>(() =>
    content.script ? JSON.parse(content.script) : null
  );
  const [publishDate, setPublishDate] = useState('');
  const [loading, setLoading] = useState(false);

  const editable = useMemo(
    () => ['awaiting_script_approval', 'failed'].includes(content?.status),
    [content]
  );

  const action = useCallback(
    async (path: string, body?: any, success?: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/studio/contents/${id}/${path}`, {
          method: path === 'script' ? 'PUT' : 'POST',
          body: JSON.stringify(body || {}),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          toaster.show(error?.message || t('studio_error', 'Something went wrong'), 'warning');
          return false;
        }
        if (success) {
          toaster.show(success, 'success');
        }
        reload();
        return true;
      } finally {
        setLoading(false);
      }
    },
    [id, reload]
  );

  const saveScript = useCallback(
    () => action('script', { script }, t('studio_script_saved', 'Script saved')),
    [script, action]
  );

  const approveScript = useCallback(async () => {
    if (!(await saveScript())) {
      return;
    }
    if (await action('approve-script', {}, t('studio_video_started', 'The video is being made'))) {
      modal.closeAll();
    }
  }, [saveScript, action]);

  const approvePost = useCallback(async () => {
    if (
      await action(
        'approve-post',
        publishDate ? { publishDate: dayjs(publishDate).toISOString() } : {},
        t('studio_post_scheduled', 'Scheduled! Find it in your calendar')
      )
    ) {
      modal.closeAll();
    }
  }, [publishDate, action]);

  const reject = useCallback(async () => {
    if (await action('reject', {}, t('studio_rejected', 'Rejected'))) {
      modal.closeAll();
    }
  }, [action]);

  const retry = useCallback(async () => {
    if (editable && script) {
      await saveScript();
    }
    if (await action('retry', {}, t('studio_retrying', 'Trying again'))) {
      modal.closeAll();
    }
  }, [action, editable, script, saveScript]);

  const remove = useCallback(async () => {
    if (!(await deleteDialog(t('studio_delete_content', 'Delete this content?')))) {
      return;
    }
    await fetch(`/studio/contents/${id}`, { method: 'DELETE' });
    reload();
    modal.closeAll();
  }, [id, reload]);

  return (
    <div className="flex flex-col gap-[12px] w-[800px] max-w-full">
      <div className="flex items-center gap-[8px] text-[14px]">
        <span className="font-[600]">{label(content.status)}</span>
        {!!content.publishDate && (
          <span className="text-customColor18">
            {t('studio_publish_on', 'Publish on')}{' '}
            {dayjs(content.publishDate).format('MMM D, YYYY HH:mm')}
          </span>
        )}
      </div>
      <div className="text-[13px] text-customColor18 whitespace-pre-line bg-sixth border-fifth border rounded-[4px] p-[12px]">
        <div className="font-[600] mb-[4px]">{t('studio_topic', 'Trending topic')}</div>
        {content.topic}
      </div>
      {!!content.error && (
        <div className="text-[13px] text-red-400 whitespace-pre-line">{content.error}</div>
      )}

      {!!content.videoPath && (
        <video
          src={content.videoPath}
          controls={true}
          className={clsx(
            'rounded-[8px] bg-black mx-auto',
            content.output === 'vertical' ? 'max-h-[520px]' : 'w-full'
          )}
        />
      )}

      {!!script && (
        <div className="flex flex-col">
          <Input
            label={t('studio_title', 'Title')}
            name="title"
            disableForm={true}
            disabled={!editable}
            value={script.title}
            onChange={(e) => setScript({ ...script, title: e.target.value })}
          />
          {content.videoMode === 'ai' && (
            <Textarea
              label={t('studio_video_prompt', 'Video prompt')}
              name="videoPrompt"
              disableForm={true}
              disabled={!editable}
              className="!min-h-[100px]"
              value={script.videoPrompt}
              onChange={(e) =>
                setScript({ ...script, videoPrompt: e.target.value })
              }
            />
          )}
          {content.videoMode === 'cheap' &&
            script.scenes.map((scene: any, index: number) => (
              <div
                key={index}
                className="grid grid-cols-2 mobile:grid-cols-1 gap-[8px]"
              >
                <Textarea
                  label={`${t('studio_scene', 'Scene')} ${index + 1} - ${t(
                    'studio_voiceover',
                    'voiceover'
                  )}`}
                  name={`voiceover${index}`}
                  disableForm={true}
                  disabled={!editable}
                  className="!min-h-[80px]"
                  value={scene.voiceover}
                  onChange={(e) => {
                    const scenes = [...script.scenes];
                    scenes[index] = { ...scene, voiceover: e.target.value };
                    setScript({ ...script, scenes });
                  }}
                />
                <Textarea
                  label={t('studio_visual', 'Image')}
                  name={`visual${index}`}
                  disableForm={true}
                  disabled={!editable}
                  className="!min-h-[80px]"
                  value={scene.visual}
                  onChange={(e) => {
                    const scenes = [...script.scenes];
                    scenes[index] = { ...scene, visual: e.target.value };
                    setScript({ ...script, scenes });
                  }}
                />
              </div>
            ))}
          <Textarea
            label={t('studio_caption', 'Caption')}
            name="caption"
            disableForm={true}
            disabled={!editable}
            className="!min-h-[80px]"
            value={script.caption}
            onChange={(e) => setScript({ ...script, caption: e.target.value })}
          />
          <Input
            label={t('studio_hashtags', 'Hashtags (comma separated)')}
            name="hashtags"
            disableForm={true}
            disabled={!editable}
            value={script.hashtags.join(', ')}
            onChange={(e) =>
              setScript({
                ...script,
                hashtags: e.target.value
                  .split(',')
                  .map((p: string) => p.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}

      {content.status === 'awaiting_post_approval' && (
        <Input
          label={t(
            'studio_publish_date',
            'Publish date (empty = next free slot of each channel)'
          )}
          name="publishDate"
          type="datetime-local"
          disableForm={true}
          value={publishDate}
          onChange={(e) => setPublishDate(e.target.value)}
        />
      )}

      <div className="flex flex-wrap gap-[10px]">
        {content.status === 'awaiting_script_approval' && (
          <Button onClick={approveScript} loading={loading}>
            {t('studio_approve_make_video', 'Approve and make the video')}
          </Button>
        )}
        {content.status === 'awaiting_post_approval' && (
          <Button onClick={approvePost} loading={loading}>
            {t('studio_approve_schedule', 'Approve and schedule')}
          </Button>
        )}
        {editable && (
          <Button secondary={true} onClick={saveScript} loading={loading}>
            {t('studio_save_script', 'Save script')}
          </Button>
        )}
        {content.status === 'failed' && (
          <Button onClick={retry} loading={loading}>
            {t('studio_retry', 'Try again')}
          </Button>
        )}
        {[
          'awaiting_script_approval',
          'awaiting_post_approval',
          'failed',
          'pending',
        ].includes(content.status) && (
          <Button secondary={true} onClick={reject} loading={loading}>
            {t('studio_reject', 'Reject')}
          </Button>
        )}
        <Button secondary={true} onClick={remove}>
          {t('delete', 'Delete')}
        </Button>
      </div>
    </div>
  );
};
