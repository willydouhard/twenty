import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class UpsertAssetInput {
  @Field(() => String, { nullable: false })
  applicationUniversalIdentifier: string;

  @Field(() => String, { nullable: false })
  assetName: string;

  @Field(() => String, { nullable: false })
  assetHash: string;

  @Field(() => String, { nullable: false })
  assetContent: string;

  @Field(() => String, { nullable: false })
  mimeType: string;
}
