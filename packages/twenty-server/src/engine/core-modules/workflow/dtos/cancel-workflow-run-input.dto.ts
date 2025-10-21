import { Field, InputType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class CancelWorkflowRunInput {
  @Field(() => UUIDScalarType, {
    description: 'ID of the workflow run to cancel',
  })
  workflowRunId: string;
}
