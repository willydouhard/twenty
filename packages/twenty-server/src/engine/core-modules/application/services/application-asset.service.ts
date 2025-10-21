import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';

@Injectable()
export class ApplicationAssetService {
  private readonly logger = new Logger(ApplicationAssetService.name);

  constructor(private readonly fileStorageService: FileStorageService) {}

  private createAssetHash(content: string | Buffer): string {
    return createHash('sha512').update(content).digest('hex').substring(0, 32);
  }

  private getAssetFolderPath(
    workspaceId: string,
    applicationId: string,
  ): string {
    return `workspace-${workspaceId}/application-${applicationId}/assets`;
  }

  private getAssetFilename(assetHash: string, mimeType: string): string {
    const extension = this.getExtensionFromMimeType(mimeType);

    return `${assetHash}.${extension}`;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeTypeMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/webp': 'webp',
      'image/x-icon': 'ico',
      'application/json': 'json',
      'text/plain': 'txt',
    };

    return mimeTypeMap[mimeType] || 'bin';
  }

  async checkAssetExists(
    workspaceId: string,
    applicationId: string,
    assetHash: string,
    mimeType: string,
  ): Promise<boolean> {
    const folderPath = this.getAssetFolderPath(workspaceId, applicationId);
    const filename = this.getAssetFilename(assetHash, mimeType);

    return await this.fileStorageService.checkFileExists({
      folderPath,
      filename,
    });
  }

  async storeAsset(
    workspaceId: string,
    applicationId: string,
    assetHash: string,
    assetContent: string,
    mimeType: string,
  ): Promise<void> {
    const buffer = Buffer.from(assetContent, 'base64');
    const computedHash = this.createAssetHash(buffer);

    if (computedHash !== assetHash) {
      throw new ApplicationException(
        `Asset hash mismatch: expected ${assetHash}, computed ${computedHash}`,
        ApplicationExceptionCode.INVALID_ASSET_HASH,
      );
    }

    const folderPath = this.getAssetFolderPath(workspaceId, applicationId);
    const filename = this.getAssetFilename(assetHash, mimeType);

    await this.fileStorageService.write({
      file: buffer,
      name: filename,
      folder: folderPath,
      mimeType,
    });

    this.logger.log(
      `Asset ${filename} stored successfully for application ${applicationId}`,
    );
  }

  async getAsset(
    workspaceId: string,
    applicationId: string,
    assetHash: string,
    mimeType: string,
  ): Promise<Buffer> {
    const folderPath = this.getAssetFolderPath(workspaceId, applicationId);
    const filename = this.getAssetFilename(assetHash, mimeType);

    const readable = await this.fileStorageService.read({
      folderPath,
      filename,
    });

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      readable.on('data', (chunk) => chunks.push(chunk));
      readable.on('end', () => resolve(Buffer.concat(chunks)));
      readable.on('error', reject);
    });
  }
}
