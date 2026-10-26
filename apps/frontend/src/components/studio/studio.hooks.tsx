'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export interface StudioField {
  name: string;
  title: string;
  description?: string;
  type: 'text' | 'number' | 'select' | 'model' | 'json';
  options?: { value: string; label: string }[];
  default?: string;
}

export interface StudioVideoProvider {
  identifier: string;
  title: string;
  description: string;
  mode: 'cheap' | 'ai';
  keys: string[];
  fields: StudioField[];
}

export interface StudioSource {
  identifier: string;
  title: string;
  description: string;
  key?: string;
  fields: { name: string; description: string; placeholder: string }[];
}

export const useStudioCatalog = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/studio/catalog')).json() as Promise<{
      sources: StudioSource[];
      videoProviders: StudioVideoProvider[];
    }>;
  }, []);
  return useSWR('studio-catalog', load, { revalidateOnFocus: false });
};

export const useStudioKeys = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/studio/keys')).json();
  }, []);
  return useSWR('studio-keys', load);
};

export const useStudioAutomations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/studio/automations')).json();
  }, []);
  return useSWR('studio-automations', load);
};

export const useStudioContents = (status: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (
      await fetch(`/studio/contents?status=${encodeURIComponent(status)}`)
    ).json();
  }, [status]);
  // contents move on their own (scripts, renders), keep the list fresh
  return useSWR(`studio-contents-${status}`, load, { refreshInterval: 10000 });
};

export const useStudioContent = (id: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/studio/contents/${id}`)).json();
  }, [id]);
  return useSWR(`studio-content-${id}`, load, { revalidateOnFocus: false });
};

export const useStudioTrends = (automationId: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (
      await fetch(
        `/studio/trends${
          automationId ? `?automationId=${encodeURIComponent(automationId)}` : ''
        }`
      )
    ).json();
  }, [automationId]);
  return useSWR(`studio-trends-${automationId}`, load);
};

export const useStudioModels = (identifier: string, enabled: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (
      await fetch(`/studio/video-providers/${identifier}/models`)
    ).json() as Promise<{ value: string; label: string }[]>;
  }, [identifier]);
  return useSWR(enabled ? `studio-models-${identifier}` : null, load, {
    revalidateOnFocus: false,
  });
};

export const useStudioIntegrations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, []);
  return useSWR('studio-integrations', load, { revalidateOnFocus: false });
};
