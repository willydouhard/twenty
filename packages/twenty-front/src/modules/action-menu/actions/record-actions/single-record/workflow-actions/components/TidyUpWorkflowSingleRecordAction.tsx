import { Action } from '@/action-menu/actions/components/Action';
import { useTidyUpWorkflowVersion } from '@/workflow/workflow-version/hooks/useTidyUpWorkflowVersion';

export const TidyUpWorkflowSingleRecordAction = () => {
  const { tidyUpWorkflowVersion } = useTidyUpWorkflowVersion();

  const onClick = async () => {
    await tidyUpWorkflowVersion();
  };

  return <Action onClick={onClick} />;
};
