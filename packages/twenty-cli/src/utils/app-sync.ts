import chalk from 'chalk';
import { ApiService } from '../services/api.service';
import { loadManifest } from './app-manifest-loader';

export const syncApp = async (
  appPath: string,
  apiService: ApiService,
): Promise<any> => {
  const { manifest, packageJson, yarnLock, assetsWithContent } =
    await loadManifest(appPath);

  try {
    const result = await apiService.syncApplication({
      manifest,
      packageJson,
      yarnLock,
    });

    if (!result.success) {
      console.error(chalk.red('❌ Sync failed:'), result.error);

      return result;
    }

    const missingAssets = result.data?.missingAssets || [];

    if (missingAssets.length > 0) {
      console.log(
        chalk.yellow(
          `📦 Uploading ${missingAssets.length} missing asset(s)...`,
        ),
      );

      const assetsByHash = new Map(
        assetsWithContent.map((asset) => [asset.hash, asset]),
      );

      for (const assetHash of missingAssets) {
        const asset = assetsByHash.get(assetHash);

        if (!asset) {
          console.error(
            chalk.red(
              `⚠️  Asset with hash ${assetHash} not found in local assets`,
            ),
          );

          continue;
        }

        const uploadResult = await apiService.upsertAsset({
          applicationUniversalIdentifier: manifest.universalIdentifier,
          assetName: asset.name,
          assetHash: asset.hash,
          assetContent: asset.content,
          mimeType: asset.mimeType,
        });

        if (!uploadResult.success) {
          console.error(
            chalk.red(`❌ Failed to upload asset ${asset.name}:`),
            uploadResult.error,
          );

          return uploadResult;
        }

        console.log(chalk.green(`  ✓ Uploaded ${asset.name}`));
      }

      console.log(chalk.green('✅ All assets uploaded successfully'));
    }

    console.log(chalk.green('✅ Application synced successfully'));

    return result;
  } catch (error) {
    console.error(
      chalk.red('Sync error:'),
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
};
