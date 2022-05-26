const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const sizeOf = promisify(require('image-size'));
const { getAssetDestinationPath } = require('./asset-destination');

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

const assetLoaderPlugin = ({
  extensions,
  scalableExtensions,
  platform,
  rootdir,
  outdir,
  dev = false,
  publicPath = '/',
  assetRegistryPath = '@react-native/assets/registry.js',
  aliases = {},
} = {}) => ({
  name: 'react-native-asset-loader',
  setup(build) {
    const filter = new RegExp(`(${extensions.map(escapeRegex).join('|')})$`);
    const assets = new Map();
    const dirCache = new Map();
    const priority = (queryPlatform) =>
      ['native', platform].indexOf(queryPlatform);

    const resolveWithAliases = (args) => {
      for (const alias in aliases) {
        if (args.path.startsWith(`${alias}/`)) {
          return path.join(aliases[alias], args.path.substr(alias.length + 1));
        }
      }
      return path.join(args.resolveDir, args.path);
    };

    build.onResolve({ filter }, async (args) => {
      const absolutePath = resolveWithAliases(args);
      const dirPath = path.dirname(absolutePath);
      const extension = path.extname(absolutePath);
      const relativePath = path.relative(rootdir, absolutePath);

      const suffix = `(@(\\d+(\\.\\d+)?)x)?(\\.(${platform}|native))?${escapeRegex(
        extension
      )}$`;
      const filename = path
        .basename(absolutePath)
        .replace(new RegExp(suffix), '');
      if (!dirCache.has(dirPath)) {
        dirCache.set(dirPath, await fs.readdir(dirPath));
      }
      const files = dirCache.get(dirPath);
      const pattern = scalableExtensions.includes(extension)
        ? new RegExp(`^${escapeRegex(filename)}${suffix}`)
        : new RegExp(
            `^${escapeRegex(filename)}(\\.(${platform}|native))?${escapeRegex(
              extension
            )}$`
          );
      const scales = {};
      let found = false;
      for (const file of files) {
        const match = pattern.exec(file);
        if (match) {
          let [, scale, , , platformExtension] = match;
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
      assets.set(absolutePath, {
        relativePath,
        basename: filename,
        extension,
        scales,
        httpServerLocation: path.join(publicPath, path.dirname(relativePath)),
      });
      return { path: absolutePath, namespace: 'react-native-asset' };
    });

    build.onLoad(
      { filter: /./, namespace: 'react-native-asset' },
      async (args) => {
        const asset = assets.get(args.path);
        if (!asset) {
          throw new Error(`Unable to find scales for "${args.path}"`);
        }
        const {
          scales,
          basename,
          extension,
          relativePath,
          httpServerLocation,
        } = asset;
        const baseScale = scales['1'];
        if (!baseScale) {
          throw new Error(`Base scale not found for "${relativePath}"`);
        }
        const dirPath = path.dirname(args.path);
        const dimensions = scalableExtensions.includes(extension) // TODO: this should include .svg in some manner – consider making this more complicated
          ? await sizeOf(path.join(dirPath, baseScale.name))
          : {};
        const files = Object.values(scales)
          .map((scale) => path.join(dirPath, scale.name))
          .sort();
        const hash = await getFilesHash(files);

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
      build.onEnd(async () => {
        const iterator = assets.entries();
        let entry;
        while ((entry = iterator.next().value)) {
          const [absolutePath, asset] = entry;
          const { scales, basename, extension, relativePath } = asset;
          const sourceDir = path.dirname(absolutePath);
          await Promise.all(
            Object.entries(scales).map(async ([scale, { name }]) => {
              const source = path.join(sourceDir, name);
              const destination = path.join(
                outdir,
                getAssetDestinationPath(asset, scale, platform)
              );
              await fs.mkdir(path.dirname(destination), { recursive: true });
              await fs.copy(source, destination);
            })
          );
        }
      });
    }
  },
});

module.exports = { assetLoaderPlugin };
