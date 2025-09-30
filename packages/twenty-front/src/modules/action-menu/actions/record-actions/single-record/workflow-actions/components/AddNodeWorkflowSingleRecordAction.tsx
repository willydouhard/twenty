import { Action } from '@/action-menu/actions/components/Action';
import { useSelectedRecordIdOrThrow } from '@/action-menu/actions/record-actions/single-record/hooks/useSelectedRecordIdOrThrow';
import { useWorkflowCommandMenu } from '@/command-menu/hooks/useWorkflowCommandMenu';
import { useWorkflowWithCurrentVersion } from '@/workflow/hooks/useWorkflowWithCurrentVersion';
import { workflowInsertStepIdsComponentState } from '@/workflow/workflow-steps/states/workflowInsertStepIdsComponentState';
import { useRecoilCallback } from 'recoil';
import { isDefined } from 'twenty-shared/utils';

export const AddNodeWorkflowSingleRecordAction = () => {
  const recordId = useSelectedRecordIdOrThrow();
  const workflowWithCurrentVersion = useWorkflowWithCurrentVersion(recordId);
  const { openWorkflowCreateStepInCommandMenu } = useWorkflowCommandMenu();

  const onClick = useRecoilCallback(
    ({ set }) =>
      () => {
        if (!isDefined(workflowWithCurrentVersion)) {
          return;
        }

        const steps = workflowWithCurrentVersion.currentVersion.steps ?? [];

        // Determine parent step ID: undefined for trigger, or last step's ID
        const parentStepId =
          steps.length === 0 ? undefined : steps[steps.length - 1].id;

        // Set the workflow insert step IDs state
        set(workflowInsertStepIdsComponentState.atomFamily({}), {
          parentStepId,
          nextStepId: undefined,
          position: undefined,
          connectionOptions: undefined,
        });

        // Open the workflow create step command menu
        openWorkflowCreateStepInCommandMenu(workflowWithCurrentVersion.id);
      },
    [workflowWithCurrentVersion, openWorkflowCreateStepInCommandMenu],
  );

  return <Action onClick={onClick} />;
};
