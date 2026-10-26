import {
  continueAsNew,
  ParentClosePolicy,
  proxyActivities,
  sleep,
  startChild,
  workflowInfo,
} from '@temporalio/workflow';
import type { StudioActivity } from '@gitroom/orchestrator/activities/studio.activity';
import { studioContentWorkflow } from './studio.content.workflow';

const { studioRunAutomation } = proxyActivities<StudioActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

export async function studioAutomationWorkflow({
  id,
  immediately,
}: {
  id: string;
  immediately: boolean;
}) {
  let loops = 0;
  let intervalHours = 24;
  while (true) {
    if (immediately) {
      try {
        const run = await studioRunAutomation(id);
        if (run.stop) {
          return;
        }
        intervalHours = run.intervalHours || intervalHours;

        // each content runs on its own, a slow render never blocks the next run
        for (const contentId of run.contentIds) {
          await startChild(studioContentWorkflow, {
            workflowId: `studio-content-${contentId}`,
            args: [{ contentId }],
            parentClosePolicy: ParentClosePolicy.ABANDON,
          });
        }
      } catch (err) {}
    }
    immediately = true;
    await sleep(intervalHours * 3600000);

    // Keep the history small
    if (++loops >= 24 || workflowInfo().historyLength > 1000) {
      return await continueAsNew<typeof studioAutomationWorkflow>({
        id,
        immediately: true,
      });
    }
  }
}
