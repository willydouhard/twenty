import { ActionModal } from '@/action-menu/actions/components/ActionModal';
import { useSelectedRecordIdOrThrow } from '@/action-menu/actions/record-actions/single-record/hooks/useSelectedRecordIdOrThrow';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useCancelWorkflowRun } from '@/workflow/hooks/useCancelWorkflowRun';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { useRecoilValue } from 'recoil';
import { isDefined } from 'twenty-shared/utils';

export const CancelRunWorkflowRunSingleRecordAction = () => {
  const recordId = useSelectedRecordIdOrThrow();
  const workflowRun = useRecoilValue(recordStoreFamilyState(recordId));
  const { cancelWorkflowRun } = useCancelWorkflowRun();
  const [isLoading, setIsLoading] = useState(false);

  if (
    !isDefined(workflowRun) ||
    (workflowRun.status !== 'RUNNING' && workflowRun.status !== 'ENQUEUED')
  ) {
    return null;
  }

  const handleCancelClick = async () => {
    setIsLoading(true);
    try {
      await cancelWorkflowRun({
        workflowRunId: recordId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ActionModal
      title="Cancel Run"
      subtitle={t`Are you sure you want to cancel this workflow run? This action cannot be undone.`}
      onConfirmClick={handleCancelClick}
      confirmButtonText="Cancel Run"
      confirmButtonAccent="danger"
      isLoading={isLoading}
    />
  );
};
