import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SyncApplicationResponse {
  @Field(() => [String], { nullable: true })
  missingAssets?: string[];
}
