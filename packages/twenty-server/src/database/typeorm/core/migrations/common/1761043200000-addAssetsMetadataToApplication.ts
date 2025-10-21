import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddAssetsMetadataToApplication1761043200000
  implements MigrationInterface
{
  name = 'AddAssetsMetadataToApplication1761043200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."application" ADD "assetsMetadata" jsonb DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."application" DROP COLUMN "assetsMetadata"`,
    );
  }
}
