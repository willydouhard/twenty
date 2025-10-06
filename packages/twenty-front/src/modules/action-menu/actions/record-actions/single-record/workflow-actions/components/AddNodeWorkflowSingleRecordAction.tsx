import { Action } from '@/action-menu/actions/components/Action';
import { useSelectedRecordIdOrThrow } from '@/action-menu/actions/record-actions/single-record/hooks/useSelectedRecordIdOrThrow';
import { useWorkflowCommandMenu } from '@/command-menu/hooks/useWorkflowCommandMenu';

export const AddNodeWorkflowSingleRecordAction = () => {
  const recordId = useSelectedRecordIdOrThrow();
  const { openWorkflowCreateStepInCommandMenu } = useWorkflowCommandMenu();

  const onClick = () => {
    openWorkflowCreateStepInCommandMenu(recordId);
  };

  return <Action onClick={onClick} />;
};
