import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { ApplicationSyncService } from 'src/engine/core-modules/application/application-sync.service';
import { ApplicationInput } from 'src/engine/core-modules/application/dtos/application.input';
import { SyncApplicationResponse } from 'src/engine/core-modules/application/dtos/sync-application-response.output';
import { UpsertAssetInput } from 'src/engine/core-modules/application/dtos/upsert-asset.input';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';

@UseGuards(WorkspaceAuthGuard)
@Resolver()
export class ApplicationResolver {
  constructor(
    private readonly applicationSyncService: ApplicationSyncService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Mutation(() => SyncApplicationResponse)
  async syncApplication(
    @Args() { manifest, packageJson, yarnLock }: ApplicationInput,
    @AuthWorkspace() { id: workspaceId }: Workspace,
  ): Promise<SyncApplicationResponse> {
    const result = await this.applicationSyncService.synchronizeFromManifest({
      workspaceId,
      manifest,
      yarnLock,
      packageJson,
    });

    return result;
  }

  @Mutation(() => Boolean)
  async upsertAsset(
    @Args() { applicationId, assetHash, assetContent }: UpsertAssetInput,
    @AuthWorkspace() _workspace: Workspace,
  ): Promise<boolean> {
    const assetFolderPath = `applications/${applicationId}/assets`;
    const assetBuffer = Buffer.from(assetContent, 'base64');

    await this.fileStorageService.write({
      file: assetBuffer,
      name: assetHash,
      folder: assetFolderPath,
      mimeType: undefined,
    });

    return true;
  }
}
