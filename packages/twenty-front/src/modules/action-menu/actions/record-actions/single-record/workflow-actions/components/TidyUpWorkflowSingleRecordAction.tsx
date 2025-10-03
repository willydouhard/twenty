import { Action } from '@/action-menu/actions/components/Action';
import { useSelectedRecordIdOrThrow } from '@/action-menu/actions/record-actions/single-record/hooks/useSelectedRecordIdOrThrow';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useWorkflowWithCurrentVersion } from '@/workflow/hooks/useWorkflowWithCurrentVersion';
import { getWorkflowVersionDiagram } from '@/workflow/workflow-diagram/utils/getWorkflowVersionDiagram';
import { getOrganizedDiagram } from '@/workflow/workflow-diagram/utils/getOrganizedDiagram';
import { UPDATE_WORKFLOW_VERSION_POSITIONS } from '@/workflow/workflow-version/graphql/mutations/updateWorkflowVersionPositions';
import { useMutation } from '@apollo/client';
import { isDefined } from 'twenty-shared/utils';
import {
  type UpdateWorkflowVersionPositionsMutation,
  type UpdateWorkflowVersionPositionsMutationVariables,
} from '~/generated-metadata/graphql';

export const TidyUpWorkflowSingleRecordAction = () => {
  const recordId = useSelectedRecordIdOrThrow();
  const workflowWithCurrentVersion = useWorkflowWithCurrentVersion(recordId);
  const apolloCoreClient = useApolloCoreClient();

  const [mutate] = useMutation<
    UpdateWorkflowVersionPositionsMutation,
    UpdateWorkflowVersionPositionsMutationVariables
  >(UPDATE_WORKFLOW_VERSION_POSITIONS, { client: apolloCoreClient });

  const onClick = async () => {
    if (!isDefined(workflowWithCurrentVersion)) {
      return;
    }

    const workflowDiagram = getWorkflowVersionDiagram({
      workflowVersion: workflowWithCurrentVersion.currentVersion,
      workflowContext: 'workflow',
    });

    const tidiedUpDiagram = getOrganizedDiagram(workflowDiagram);

    const positions = tidiedUpDiagram.nodes.map((node) => ({
      id: node.id,
      position: node.position,
    }));

    await mutate({
      variables: {
        input: {
          workflowVersionId: workflowWithCurrentVersion.currentVersion.id,
          positions,
        },
      },
    });
  };

  return <Action onClick={onClick} />;
};
