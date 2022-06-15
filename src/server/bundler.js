const path = require('path');
const esbuild = require('esbuild');
const { SourceMapConsumer } = require('source-map');
const { formatFilePath } = require('../logger');
const chalk = require('chalk');

function createBundler(getBundleConfig, onBuild, logger) {
  const promiseMap = {};
  const outputMap = {};
  const sourceMap = {};

  const getBundleOutputPath = (platform, entryFile) =>
    `${entryFile.substring(
      0,
      entryFile.length - path.extname(entryFile).length
    )}.${platform}.js`;

  const getBundle = async (
    platform,
    entryFile = 'index',
    dev = true,
    minify = false
  ) => {
    const bundleOutput = getBundleOutputPath(platform, entryFile);
    if (!promiseMap[bundleOutput]) {
      let buildResolver = null;
      let buildRejecter = null;
      let buildStart = -1;

      const setupBuildPromise = () => {
        const promise = new Promise((resolve, reject) => {
          buildResolver = resolve;
          buildRejecter = reject;
        });
        buildStart = Date.now();
        // Rejections are generally caught and forwarded to the app
        // but rebuilds aren't being awaited instantly and we don't
        // want to kill the process in those cases.
        promise.catch(() => null);
        promiseMap[bundleOutput] = promise;
      };
      setupBuildPromise();

      const buildStatusPlugin = {
        name: 'build-status',
        setup(build) {
          let localPath = path.relative(
            build.initialOptions.sourceRoot,
            entryFile
          );

          build.onStart(async () => {
            if (!buildResolver) {
              setupBuildPromise();
            }
            const resolved = await build.resolve(
              entryFile.startsWith('/') ? entryFile : `./${localPath}`,
              {
                resolveDir: build.initialOptions.sourceRoot,
              }
            );
            if (resolved.errors.length === 0) {
              localPath = path.relative(
                build.initialOptions.sourceRoot,
                resolved.path
              );
            }
            logger.warn(
              'BUNDLE',
              `${formatFilePath(localPath)}: ${chalk.dim(
                `${platform} building...`
              )}`
            );
          });

          build.onEnd((result) => {
            const { errors, outputFiles } = result;
            outputMap[bundleOutput] = outputFiles;
            sourceMap[bundleOutput] = null;
            if (errors.length === 0) {
              logger.success(
                'BUNDLE',
                `${formatFilePath(localPath)}: ${chalk.dim(
                  `${platform} build completed in ${Date.now() - buildStart}ms`
                )}`
              );
              const file = outputFiles.find((f) => f.path === bundleOutput);
              buildResolver(file.contents);
              if (onBuild) {
                onBuild(result);
              }
            } else {
              logger.error(
                'BUNDLE',
                `${formatFilePath(localPath)}: ${chalk.bold.red(
                  `${platform} build failed, see errors above`
                )}`
              );
              buildRejecter(
                new Error(`Compilation failed with "${errors[0].text}"`)
              );
            }
            buildResolver = null;
            buildRejecter = null;
          });
        },
      };

      const buildOptions = getBundleConfig({
        platform,
        dev,
        minify,
        entryFile,
        bundleOutput,
        sourcemapOutput: `${bundleOutput}.map`,
      });

      await esbuild.build({
        ...buildOptions,
        bundle: true,
        watch: true,
        incremental: true,
        write: false,
        plugins: (buildOptions.plugins ?? []).concat(buildStatusPlugin),
      });
    }
    return promiseMap[bundleOutput];
  };

  const getSourcemap = async (platform, entryFile) => {
    const bundleOutput = getBundleOutputPath(platform, entryFile);
    if (!sourceMap[bundleOutput]) {
      const sourcemapOutput = `${bundleOutput}.map`;
      const outputFiles = outputMap[bundleOutput];
      if (!outputFiles) {
        throw new Error(
          `No output files found for ${bundleOutput}, ensure compilation has finished`
        );
      }
      const file = outputFiles.find((f) => f.path === sourcemapOutput);
      const sourcemap = Buffer.from(file.contents).toString('utf8');
      sourceMap[bundleOutput] = new SourceMapConsumer(sourcemap);
    }
    return sourceMap[bundleOutput];
  };

  return { getBundle, getSourcemap };
}

module.exports = { createBundler };
