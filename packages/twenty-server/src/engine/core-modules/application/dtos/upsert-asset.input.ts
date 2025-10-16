import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class UpsertAssetInput {
  @Field(() => String, { nullable: false })
  applicationId: string;

  @Field(() => String, { nullable: false })
  assetHash: string;

  @Field(() => String, { nullable: false })
  assetContent: string;
}
