import { Action } from '@/action-menu/actions/components/Action';
import { useSelectedRecordIdOrThrow } from '@/action-menu/actions/record-actions/single-record/hooks/useSelectedRecordIdOrThrow';
import { useRecoilComponentValue } from '@/ui/utilities/state/component-state/hooks/useRecoilComponentValue';
import { useWorkflowWithCurrentVersion } from '@/workflow/hooks/useWorkflowWithCurrentVersion';
import { VERTICAL_DISTANCE_BETWEEN_TWO_NODES } from '@/workflow/workflow-diagram/constants/VerticalDistanceBetweenTwoNodes';
import { useStartNodeCreation } from '@/workflow/workflow-diagram/hooks/useStartNodeCreation';
import { workflowDiagramComponentState } from '@/workflow/workflow-diagram/states/workflowDiagramComponentState';
import { isDefined } from 'twenty-shared/utils';

export const AddNodeWorkflowSingleRecordAction = () => {
  const recordId = useSelectedRecordIdOrThrow();
  const workflowWithCurrentVersion = useWorkflowWithCurrentVersion(recordId);
  const { startNodeCreation } = useStartNodeCreation();

  const workflowDiagram = useRecoilComponentValue(
    workflowDiagramComponentState,
  );

  const onClick = () => {
    if (!isDefined(workflowWithCurrentVersion)) {
      return;
    }

    const steps = workflowWithCurrentVersion.currentVersion.steps ?? [];

    // If there are no steps, add node under the trigger
    if (steps.length === 0) {
      startNodeCreation({
        parentStepId: undefined,
        nextStepId: undefined,
      });
      return;
    }

    // Get the last step from the steps array
    const lastStep = steps[steps.length - 1];

    // Find the last step's position in the workflow diagram
    const lastStepNode = workflowDiagram?.nodes.find(
      (node) =>
        node.data.nodeType !== 'empty-trigger' &&
        node.data.stepId === lastStep.id,
    );

    if (!isDefined(lastStepNode)) {
      // Fallback: if we can't find the position, just pass the parent step ID
      startNodeCreation({
        parentStepId: lastStep.id,
        nextStepId: undefined,
      });
      return;
    }

    // Calculate position for the new node
    const newNodePosition = {
      x: lastStepNode.position.x,
      y: lastStepNode.position.y + VERTICAL_DISTANCE_BETWEEN_TWO_NODES,
    };

    startNodeCreation({
      parentStepId: lastStep.id,
      nextStepId: undefined,
      position: newNodePosition,
    });
  };

  return <Action onClick={onClick} />;
};
