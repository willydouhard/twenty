import { useMutation } from '@apollo/client';

import { triggerUpdateRecordOptimisticEffect } from '@/apollo/optimistic-effect/utils/triggerUpdateRecordOptimisticEffect';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { CoreObjectNameSingular } from '@/object-metadata/types/CoreObjectNameSingular';
import { modifyRecordFromCache } from '@/object-record/cache/utils/modifyRecordFromCache';
import { CANCEL_WORKFLOW_RUN } from '@/workflow/graphql/mutations/cancelWorkflowRun';
import { type WorkflowRun } from '@/workflow/types/Workflow';
import { isDefined } from 'twenty-shared/utils';
import {
  type CancelWorkflowRunMutation,
  type CancelWorkflowRunMutationVariables,
} from '~/generated-metadata/graphql';

export const useCancelWorkflowRun = () => {
  const apolloCoreClient = useApolloCoreClient();
  const [mutate] = useMutation<
    CancelWorkflowRunMutation,
    CancelWorkflowRunMutationVariables
  >(CANCEL_WORKFLOW_RUN, {
    client: apolloCoreClient,
  });

  const { objectMetadataItem: objectMetadataItemWorkflowRun } =
    useObjectMetadataItem({
      objectNameSingular: CoreObjectNameSingular.WorkflowRun,
    });

  const cancelWorkflowRun = async ({
    workflowRunId,
  }: {
    workflowRunId: string;
  }) => {
    await mutate({
      variables: {
        input: {
          workflowRunId,
        },
      },
      update: () => {
        modifyRecordFromCache({
          cache: apolloCoreClient.cache,
          recordId: workflowRunId,
          objectMetadataItem: objectMetadataItemWorkflowRun,
          fieldModifiers: {
            status: () => 'CANCELLED',
          },
        });

        const cacheSnapshot = apolloCoreClient.cache.extract();
        const workflowRun: WorkflowRun | undefined = Object.values(
          cacheSnapshot,
        ).find(
          (item) =>
            item.__typename === 'WorkflowRun' && item.id === workflowRunId,
        );

        if (!isDefined(workflowRun)) {
          return;
        }

        triggerUpdateRecordOptimisticEffect({
          cache: apolloCoreClient.cache,
          objectMetadataItem: objectMetadataItemWorkflowRun,
          currentRecord: workflowRun,
          updatedRecord: {
            ...workflowRun,
            status: 'CANCELLED',
          },
          objectMetadataItems: [objectMetadataItemWorkflowRun],
        });
      },
    });
  };

  return { cancelWorkflowRun };
};
