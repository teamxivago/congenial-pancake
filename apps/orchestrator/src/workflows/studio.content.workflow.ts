import { ApplicationFailure, proxyActivities } from '@temporalio/workflow';
import type { StudioActivity } from '@gitroom/orchestrator/activities/studio.activity';

const { studioGenerateScript, studioFinishContent, studioFailContent } =
  proxyActivities<StudioActivity>({
    startToCloseTimeout: '10 minute',
    taskQueue: 'main',
    retry: {
      maximumAttempts: 2,
      initialInterval: '1 minute',
    },
  });

// A paid generation is never retried on its own, the creator retries it
const { studioRenderVideo } = proxyActivities<StudioActivity>({
  startToCloseTimeout: '45 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 1,
  },
});

export async function studioContentWorkflow({
  contentId,
}: {
  contentId: string;
}) {
  try {
    const status = await studioGenerateScript(contentId);
    if (status !== 'rendering') {
      return status;
    }

    await studioRenderVideo(contentId);
    await studioFinishContent(contentId);
    return 'done';
  } catch (err) {
    const failure = err as ApplicationFailure & { cause?: Error };
    await studioFailContent(
      contentId,
      failure.cause?.message || failure.message || 'Unknown error'
    );
    return 'failed';
  }
}
