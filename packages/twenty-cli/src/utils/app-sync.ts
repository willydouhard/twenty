import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ApiService } from '../services/api.service';
import { loadManifest } from './app-manifest-loader';

export const syncApp = async (
  appPath: string,
  apiService: ApiService,
): Promise<any> => {
  const { manifest, packageJson, yarnLock } = await loadManifest(appPath);

  try {
    const result = await apiService.syncApplication({
      manifest,
      packageJson,
      yarnLock,
    });

    if (result.success) {
      console.log(chalk.green('✅ Application synced successfully'));

      if (result.data?.missingAssets && result.data.missingAssets.length > 0) {
        console.log(
          chalk.yellow(
            `⚠️  Found ${result.data.missingAssets.length} missing asset(s), uploading...`,
          ),
        );

        await uploadMissingAssets({
          appPath,
          applicationId: manifest.universalIdentifier,
          missingAssets: result.data.missingAssets,
          manifest,
          apiService,
        });

        console.log(chalk.green('✅ All assets uploaded successfully'));
      }
    } else {
      console.error(chalk.red('❌ Sync failed:'), result.error);
    }

    return result;
  } catch (error) {
    console.error(
      chalk.red('Sync error:'),
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
};

const uploadMissingAssets = async ({
  appPath,
  applicationId,
  missingAssets,
  manifest,
  apiService,
}: {
  appPath: string;
  applicationId: string;
  missingAssets: string[];
  manifest: any;
  apiService: ApiService;
}) => {
  const assetsPath = path.join(appPath, 'assets');

  if (!manifest.assets || manifest.assets.length === 0) {
    return;
  }

  for (const missingAssetHash of missingAssets) {
    const asset = manifest.assets.find((a: any) => a.hash === missingAssetHash);

    if (!asset) {
      console.warn(
        chalk.yellow(
          `⚠️  Asset with hash ${missingAssetHash} not found in manifest`,
        ),
      );
      continue;
    }

    const assetFilePath = path.join(assetsPath, asset.path);

    if (!(await fs.pathExists(assetFilePath))) {
      console.warn(
        chalk.yellow(
          `⚠️  Asset file ${asset.path} not found at ${assetFilePath}`,
        ),
      );
      continue;
    }

    const assetBuffer = await fs.readFile(assetFilePath);
    const assetContent = assetBuffer.toString('base64');

    const uploadResult = await apiService.upsertAsset({
      applicationId,
      assetHash: missingAssetHash,
      assetContent,
    });

    if (uploadResult.success) {
      console.log(chalk.green(`  ✓ Uploaded ${asset.path}`));
    } else {
      console.error(
        chalk.red(`  ✗ Failed to upload ${asset.path}:`),
        uploadResult.error,
      );
    }
  }
};
