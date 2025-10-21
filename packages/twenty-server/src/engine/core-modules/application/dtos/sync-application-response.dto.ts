import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SyncApplicationResponse {
  @Field(() => Boolean, { nullable: false })
  success: boolean;

  @Field(() => [String], { nullable: false })
  missingAssets: string[];
}
