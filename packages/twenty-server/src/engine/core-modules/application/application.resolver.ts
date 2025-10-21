import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { ApplicationSyncService } from 'src/engine/core-modules/application/application-sync.service';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { ApplicationAssetService } from 'src/engine/core-modules/application/services/application-asset.service';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { ApplicationInput } from 'src/engine/core-modules/application/dtos/application.input';
import { SyncApplicationResponse } from 'src/engine/core-modules/application/dtos/sync-application-response.dto';
import { UpsertAssetInput } from 'src/engine/core-modules/application/dtos/upsert-asset.input';

@UseGuards(WorkspaceAuthGuard)
@Resolver()
export class ApplicationResolver {
  constructor(
    private readonly applicationSyncService: ApplicationSyncService,
    private readonly applicationService: ApplicationService,
    private readonly applicationAssetService: ApplicationAssetService,
  ) {}

  @Mutation(() => SyncApplicationResponse)
  async syncApplication(
    @Args() { manifest, packageJson, yarnLock }: ApplicationInput,
    @AuthWorkspace() { id: workspaceId }: Workspace,
  ) {
    return await this.applicationSyncService.synchronizeFromManifest({
      workspaceId,
      manifest,
      yarnLock,
      packageJson,
    });
  }

  @Mutation(() => Boolean)
  async upsertAsset(
    @Args()
    {
      applicationUniversalIdentifier,
      assetName: _assetName,
      assetHash,
      assetContent,
      mimeType,
    }: UpsertAssetInput,
    @AuthWorkspace() { id: workspaceId }: Workspace,
  ) {
    const application = await this.applicationService.findByUniversalIdentifier(
      applicationUniversalIdentifier,
      workspaceId,
    );

    if (!application) {
      throw new ApplicationException(
        `Application with universal identifier ${applicationUniversalIdentifier} not found`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    await this.applicationAssetService.storeAsset(
      workspaceId,
      application.id,
      assetHash,
      assetContent,
      mimeType,
    );

    return true;
  }
}
