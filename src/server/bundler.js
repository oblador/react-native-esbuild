const path = require('path');
const esbuild = require('esbuild');
const { SourceMapConsumer } = require('source-map');

function createBundler(getBundleConfig, onBuild) {
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
      const setupBuildPromise = () => {
        promiseMap[bundleOutput] = new Promise((resolve, reject) => {
          buildResolver = resolve;
          buildRejecter = reject;
        });
      };
      setupBuildPromise();

      const buildStatusPlugin = {
        name: 'build-status',
        setup(build) {
          build.onStart(() => {
            if (!buildResolver) {
              setupBuildPromise();
            }
          });
          build.onEnd((result) => {
            const { errors, outputFiles } = result;
            outputMap[bundleOutput] = outputFiles;
            sourceMap[bundleOutput] = null;
            if (errors.length === 0) {
              const file = outputFiles.find((f) => f.path === bundleOutput);
              buildResolver(file.contents);
              if (onBuild) {
                onBuild(result);
              }
            } else {
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
        plugins: (buildOptions.plugins || []).concat(buildStatusPlugin),
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
