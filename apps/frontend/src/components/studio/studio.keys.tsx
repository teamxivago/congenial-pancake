'use client';

import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useStudioKeys } from '@gitroom/frontend/components/studio/studio.hooks';

const KeyRow: FC<{ item: any; reload: () => void }> = ({ item, reload }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const save = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/studio/keys', {
        method: 'POST',
        body: JSON.stringify({ provider: item.identifier, apiKey: value }),
      });
      setValue('');
      reload();
      toaster.show(t('studio_key_saved', 'Key saved'), 'success');
    } finally {
      setLoading(false);
    }
  }, [value, item]);

  const remove = useCallback(async () => {
    if (!(await deleteDialog(t('studio_remove_key', `Remove the ${item.title} key?`, { name: item.title })))) {
      return;
    }
    await fetch(`/studio/keys/${item.identifier}`, { method: 'DELETE' });
    reload();
  }, [item]);

  return (
    <div className="bg-sixth border-fifth border rounded-[4px] p-[16px] flex flex-col gap-[8px]">
      <div className="flex items-center gap-[8px]">
        <span className="font-[600]">{item.title}</span>
        {item.connected ? (
          <span className="text-[12px] text-white bg-green-600 px-[8px] rounded-[4px]">
            {t('studio_connected', 'Connected')}
          </span>
        ) : item.shared ? (
          <span className="text-[12px] text-white bg-blue-600 px-[8px] rounded-[4px]">
            {t('studio_shared', 'Provided by the server')}
          </span>
        ) : null}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] underline ms-auto"
        >
          {t('studio_get_key', 'Get a key')}
        </a>
      </div>
      <div className="text-[12px] text-customColor18">{item.description}</div>
      <div className="flex gap-[8px] items-start">
        <div className="flex-1">
          <Input
            label=""
            name={item.identifier}
            type="password"
            autoComplete="off"
            disableForm={true}
            removeError={true}
            placeholder={
              item.connected
                ? t('studio_replace_key', 'Paste a new key to replace it')
                : t('studio_paste_key', 'Paste your API key')
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button onClick={save} loading={loading} disabled={!value.trim()}>
          {t('save', 'Save')}
        </Button>
        {item.connected && (
          <Button secondary={true} onClick={remove}>
            {t('studio_remove', 'Remove')}
          </Button>
        )}
      </div>
    </div>
  );
};

export const StudioKeys: FC = () => {
  const t = useT();
  const { data, mutate } = useStudioKeys();
  return (
    <div className="flex flex-col max-w-[760px]">
      <h3 className="text-[20px]">{t('studio_api_keys', 'API keys')}</h3>
      <div className="text-customColor18 mt-[4px] mb-[16px]">
        {t(
          'studio_keys_description',
          'Studio uses your own accounts, so you only pay the providers for what you generate. Keys are stored encrypted. OpenAI is needed for the scripts.'
        )}
      </div>
      <div className="flex flex-col gap-[12px]">
        {data?.map((item: any) => (
          <KeyRow key={item.identifier} item={item} reload={mutate} />
        ))}
      </div>
    </div>
  );
};
