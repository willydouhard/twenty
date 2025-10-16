import assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  AppManifest,
  AssetManifest,
  CoreEntityManifest,
  PackageJson,
} from '../types/config.types';
import { parseJsoncFile } from './jsonc-parser';
import { validateSchema } from '../utils/schema-validator';

type Sources = { [key: string]: string | Sources };

const findPathFile = async (
  appPath: string,
  fileName: string,
): Promise<string> => {
  const jsonPath = path.join(appPath, fileName);

  if (await fs.pathExists(jsonPath)) {
    return jsonPath;
  }

  throw new Error(`${fileName} not found in ${appPath}`);
};

const loadCoreEntity = async (
  coreEntityPath: string,
  validator: (manifest: CoreEntityManifest, path: string) => Promise<void>,
): Promise<CoreEntityManifest[]> => {
  const coreEntities: CoreEntityManifest[] = [];

  if (await fs.pathExists(coreEntityPath)) {
    const entities = await fs.readdir(coreEntityPath);

    for (const entity of entities) {
      const entityPath = path.join(coreEntityPath, entity);
      const entityResources = await fs.readdir(entityPath);

      const entityManifests = entityResources.filter(
        (file) =>
          file.endsWith('.manifest.jsonc') || file.endsWith('.manifest.json'),
      );

      assert(
        entityManifests.length === 1,
        'Entity should have strictly one manifest file',
      );

      const entityManifest = entityManifests[0];

      const coreEntityManifest = await parseJsoncFile(
        path.join(coreEntityPath, entity, entityManifest),
      );

      const entitySources = entityResources.filter(
        (folder) => folder === 'src',
      );

      assert(
        entitySources.length <= 1,
        'Entity should have less than one src folder or file',
      );

      if (entitySources.length === 1) {
        const entitySourcePath = path.join(
          coreEntityPath,
          entity,
          entitySources[0],
        );

        const sources = await loadFolderContentIntoJson(entitySourcePath);

        coreEntityManifest['code'] = { src: sources };
      }

      await validator(coreEntityManifest, coreEntityPath);

      coreEntities.push(coreEntityManifest);
    }
  }

  return coreEntities;
};

const loadFolderContentIntoJson = async (
  sourcePath: string,
): Promise<Sources> => {
  const sources: Sources = {};

  const resources = await fs.readdir(sourcePath);

  for (const resource of resources) {
    const resourcePath = path.join(sourcePath, resource);
    const stats = await fs.stat(resourcePath);
    if (stats.isFile()) {
      sources[resource] = await fs.readFile(resourcePath, 'utf8');
    } else {
      sources[resource] = await loadFolderContentIntoJson(resourcePath);
    }
  }

  return sources;
};

const loadAssets = async (appPath: string): Promise<AssetManifest[]> => {
  const assets: AssetManifest[] = [];
  const assetsPath = path.join(appPath, 'assets');

  if (await fs.pathExists(assetsPath)) {
    const assetFiles = await fs.readdir(assetsPath);

    for (const assetFile of assetFiles) {
      const assetFilePath = path.join(assetsPath, assetFile);
      const stats = await fs.stat(assetFilePath);

      if (stats.isFile()) {
        const fileBuffer = await fs.readFile(assetFilePath);
        const hash = crypto
          .createHash('sha256')
          .update(fileBuffer)
          .digest('hex');

        assets.push({
          path: assetFile,
          hash,
        });
      }
    }
  }

  return assets;
};

export const loadManifest = async (
  appPath: string,
): Promise<{
  packageJson: PackageJson;
  yarnLock: string;
  manifest: AppManifest;
}> => {
  const packageJsonPath = await findPathFile(appPath, 'package.json');
  const rawPackageJson = await parseJsoncFile(packageJsonPath);

  const yarnLockPath = await findPathFile(appPath, 'yarn.lock');
  const rawYarnLock = await fs.readFile(yarnLockPath, 'utf8');

  await validateSchema('appManifest', rawPackageJson, packageJsonPath);

  const agents = await loadCoreEntity(
    path.join(appPath, 'agents'),
    (manifest, path) => validateSchema('agent', manifest, path),
  );

  const objects = await loadCoreEntity(
    path.join(appPath, 'objects'),
    (manifest, path) => validateSchema('object', manifest, path),
  );

  const serverlessFunctions = await loadCoreEntity(
    path.join(appPath, 'serverlessFunctions'),
    (manifest, path) => validateSchema('serverlessFunction', manifest, path),
  );

  const assets = await loadAssets(appPath);

  return {
    packageJson: rawPackageJson,
    yarnLock: rawYarnLock,
    manifest: {
      ...rawPackageJson,
      agents,
      objects,
      serverlessFunctions,
      assets: assets.length > 0 ? assets : undefined,
    },
  };
};
