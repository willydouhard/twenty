import { createHash } from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { lookup } from 'mime-types';

export type AssetWithContent = {
  name: string;
  hash: string;
  mimeType: string;
  path: string;
  content: string;
};

export type AssetMetadata = {
  name: string;
  hash: string;
  mimeType: string;
  path: string;
};

const createAssetHash = (content: Buffer): string => {
  return createHash('sha512').update(content).digest('hex').substring(0, 32);
};

const getMimeType = (filePath: string): string => {
  const mimeType = lookup(filePath);

  return mimeType || 'application/octet-stream';
};

export const loadAssets = async (
  appPath: string,
): Promise<AssetWithContent[]> => {
  const assetsPath = path.join(appPath, 'assets');

  if (!(await fs.pathExists(assetsPath))) {
    return [];
  }

  const assets: AssetWithContent[] = [];
  const assetFiles = await fs.readdir(assetsPath);

  for (const file of assetFiles) {
    const filePath = path.join(assetsPath, file);
    const stats = await fs.stat(filePath);

    if (stats.isFile()) {
      const buffer = await fs.readFile(filePath);
      const hash = createAssetHash(buffer);
      const content = buffer.toString('base64');
      const mimeType = getMimeType(filePath);

      assets.push({
        name: file,
        hash,
        mimeType,
        path: `assets/${file}`,
        content,
      });
    }
  }

  return assets;
};

export const extractAssetMetadata = (
  assets: AssetWithContent[],
): AssetMetadata[] => {
  return assets.map(({ name, hash, mimeType, path }) => ({
    name,
    hash,
    mimeType,
    path,
  }));
};
