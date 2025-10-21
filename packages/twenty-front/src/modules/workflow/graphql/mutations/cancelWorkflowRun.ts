import { gql } from '@apollo/client';

export const CANCEL_WORKFLOW_RUN = gql`
  mutation CancelWorkflowRun($input: CancelWorkflowRunInput!) {
    cancelWorkflowRun(input: $input)
  }
`;
