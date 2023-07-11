const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const imageSize = require('image-size');
const sizeOf = promisify(imageSize);
const { getAssetDestinationPath } = require('./asset-destination');
const { ASSETS_PUBLIC_PATH } = require('../config');

function escapeRegex(string) {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

async function getFilesHash(files) {
  const hash = crypto.createHash('md5');
  for (const file of files) {
    hash.update(await fs.readFile(file));
  }
  return hash.digest('hex');
}

function getAssetType(extension) {
  switch (extension) {
    case '.jpeg':
      return 'jpg';
    case '.tif':
      return 'tiff';
    default:
      return extension.slice(1);
  }
}

const assetLoaderPlugin = ({
  extensions,
  scalableExtensions,
  platform,
  rootdir,
  outdir,
  dev = false,
  publicPath = ASSETS_PUBLIC_PATH,
  assetRegistryPath = '@react-native/assets-registry/registry.js',
} = {}) => ({
  name: 'react-native-asset-loader',
  setup(build) {
    const filter = new RegExp(`(${extensions.map(escapeRegex).join('|')})$`);
    const assets = [];
    const dirCache = new Map();
    const priority = (queryPlatform) =>
      ['native', platform].indexOf(queryPlatform);

    const resolveWithSuffix = async (args, suffix) => {
      const extension = path.extname(args.path);
      const basename = args.path.substr(0, args.path.length - extension.length);
      return build.resolve(`${basename}${suffix}${extension}`, {
        resolveDir: args.resolveDir,
        importer: args.importer,
        kind: args.kind,
        namespace: args.namespace,
        pluginData: { skipReactNativeAssetLoader: true },
      });
    };

    const resolveBaseScale = async (args) => {
      const suffixlessResult = await resolveWithSuffix(args, '');
      if (suffixlessResult.errors.length !== 0) {
        const result = await resolveWithSuffix(args, '@1x');
        if (result.errors.length === 0) {
          return result;
        }
      }
      return suffixlessResult;
    };

    build.onResolve({ filter }, async (args) => {
      if (
        args.pluginData &&
        args.pluginData.skipReactNativeAssetLoader === true
      ) {
        // Avoid recursive calls
        return null;
      }

      const result = await resolveBaseScale(args);
      if (result.errors.length > 0) {
        return { errors: result.errors };
      }

      return { path: result.path, namespace: 'react-native-asset' };
    });

    build.onLoad(
      { filter: /./, namespace: 'react-native-asset' },
      async (args) => {
        const dirPath = path.dirname(args.path);
        const extension = path.extname(args.path);
        const relativePath = path.relative(rootdir, args.path);

        const suffix = `(@(\\d+(\\.\\d+)?)x)?(\\.(${platform}|native))?${escapeRegex(
          extension
        )}$`;
        const basename = path
          .basename(args.path)
          .replace(new RegExp(suffix), '');
        if (!dirCache.has(dirPath)) {
          dirCache.set(dirPath, await fs.readdir(dirPath));
        }
        const files = dirCache.get(dirPath);
        const pattern = scalableExtensions.includes(extension)
          ? new RegExp(`^${escapeRegex(basename)}${suffix}`)
          : new RegExp(
              `^${escapeRegex(basename)}(\\.(${platform}|native))?${escapeRegex(
                extension
              )}$`
            );
        const scales = {};
        let found = false;
        for (const file of files) {
          const match = pattern.exec(file);
          if (match) {
            let [, , scale, , , platformExtension] = match;
            scale = scale || '1';
            if (
              !scales[scale] ||
              priority(platformExtension) > priority(scales[scale].platform)
            ) {
              scales[scale] = { platform: platformExtension, name: file };
              found = true;
            }
          }
        }
        if (!found) {
          throw new Error(`Unable to resolve "${args.path}"`);
        }
        const httpServerLocation = path.join(
          publicPath,
          path.dirname(relativePath)
        );
        assets.push({
          relativePath,
          basename,
          extension,
          scales,
          httpServerLocation,
        });
        const baseScale = scales['1'];
        if (!baseScale) {
          throw new Error(`Base scale not found for "${relativePath}"`);
        }
        const assetType = getAssetType(extension);
        const dimensions = imageSize.types.includes(assetType)
          ? await sizeOf(path.join(dirPath, baseScale.name))
          : {};
        const hash = await getFilesHash(
          Object.values(scales)
            .map((scale) => path.join(dirPath, scale.name))
            .sort()
        );

        return {
          contents: `module.exports = require('${assetRegistryPath}').registerAsset(${JSON.stringify(
            {
              __packager_asset: true,
              scales: Object.keys(scales)
                .map((scale) => Number.parseFloat(scale))
                .sort(),
              name: basename,
              type: extension.substr(1),
              hash,
              httpServerLocation,
              fileSystemLocation: dev ? path.dirname(relativePath) : undefined,
              height: dimensions.height,
              width: dimensions.width,
            }
          )})`,
          loader: 'js',
          resolveDir: dirPath,
        };
      }
    );

    if (outdir) {
      build.onEnd(() => {
        assets.map(async (asset) => {
          const { scales, relativePath } = asset;
          const sourceDir = path.dirname(path.join(rootdir, relativePath));
          return Promise.all(
            Object.entries(scales).map(async ([scale, { name }]) => {
              const source = path.join(sourceDir, name);
              const destination = path.join(
                outdir,
                getAssetDestinationPath(asset, scale, platform)
              );
              await fs.mkdir(path.dirname(destination), {
                recursive: true,
              });
              await fs.copy(source, destination);
            })
          );
        });
      });
    }
  },
});

module.exports = { assetLoaderPlugin };
