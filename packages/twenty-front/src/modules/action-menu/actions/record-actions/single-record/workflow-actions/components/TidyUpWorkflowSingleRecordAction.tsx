import { Action } from '@/action-menu/actions/components/Action';
import { useSelectedRecordIdOrThrow } from '@/action-menu/actions/record-actions/single-record/hooks/useSelectedRecordIdOrThrow';
import { useTidyUpWorkflowVersion } from '@/workflow/workflow-version/hooks/useTidyUpWorkflowVersion';
import { useWorkflowWithCurrentVersion } from '@/workflow/hooks/useWorkflowWithCurrentVersion';
import { isDefined } from 'twenty-shared/utils';

export const TidyUpWorkflowSingleRecordAction = () => {
  const recordId = useSelectedRecordIdOrThrow();
  const { tidyUpWorkflowVersion } = useTidyUpWorkflowVersion();
  const workflowWithCurrentVersion = useWorkflowWithCurrentVersion(recordId);

  const onClick = async () => {
    if (!isDefined(workflowWithCurrentVersion)) {
      return;
    }

    await tidyUpWorkflowVersion();
  };

  return <Action onClick={onClick} />;
};
