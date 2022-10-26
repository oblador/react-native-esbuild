const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const babel = require('@babel/core');
const { outputFile } = require('fs-extra');
const { getDefaultCacheDir } = require('../cache');

const md5 = (string) => crypto.createHash('md5').update(string).digest('hex');

const defaultHasFlowSyntax = (contents, filePath) =>
  path.extname(filePath) === '.js' &&
  (contents.includes('@flow') ||
    contents.includes('@noflow') ||
    filePath.includes(
      `node_modules/react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable.js`
    ));

const defaultHasReanimatedSyntax = (contents, filePath) =>
  [
    'createAnimatedPropAdapter',
    'useAnimatedGestureHandler',
    'useAnimatedProps',
    'useAnimatedReaction',
    'useAnimatedScrollHandler',
    'useAnimatedStyle',
    'useDerivedValue',
    'useWorkletCallback',
    'withDecay',
    'withRepeat',
    'withSpring',
    'withTiming',
    "'worklet'",
    '"worklet"',
  ].find((fn) => contents.includes(fn));

const syntaxAwareLoaderPlugin = (options = {}) => ({
  name: 'syntax-aware-loader',
  setup(build, { transform } = {}) {
    const {
      filter = /.*/,
      hasFlowSyntax = defaultHasFlowSyntax,
      hasReanimatedSyntax = defaultHasReanimatedSyntax,
      namespace = '',
      cache = true,
    } = options;
    const transformCache = new Map();

    const loaderMap = build.initialOptions.loader || {};
    const getLoader = (extension) => {
      if (loaderMap[extension]) {
        return loaderMap[extension];
      }
      switch (extension) {
        case '.ts':
          return 'ts';
        case '.tsx':
          return 'tsx';
        default:
          return 'js';
      }
    };

    const transformContents = async (args, contents, config) => {
      const babelOptions = babel.loadOptions({
        minified: false,
        compact: false,
        ...config,
        sourceMaps: 'inline',
        filename: args.path,
        caller: {
          name: 'esbuild-plugin-syntax-aware-loader',
          supportsStaticESM: true,
        },
      });
      if (!babelOptions) {
        return { contents };
      }

      if (babelOptions.sourceMaps) {
        const filename = path.relative(process.cwd(), args.path);

        babelOptions.sourceFileName = filename;
      }

      const transformWithBabel = () =>
        new Promise((resolve, reject) => {
          babel.transform(contents, babelOptions, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result.code);
            }
          });
        });

      if (cache) {
        const cachePath = path.join(
          typeof cache === 'string' ? cache : getDefaultCacheDir(),
          md5(JSON.stringify(babelOptions) + contents)
        );
        try {
          return await fs.promises.readFile(cachePath, { encoding: 'utf8' });
        } catch (err) {
          const transformed = await transformWithBabel();
          await outputFile(cachePath, transformed);
          return transformed;
        }
      }
      return transformWithBabel();
    };

    const stripFlow = (args, contents) =>
      transformContents(args, contents, {
        babelrc: false,
        configFile: false,
        plugins: [
          '@babel/plugin-syntax-flow',
          '@babel/plugin-transform-flow-strip-types',
          '@babel/plugin-syntax-jsx',
        ],
      });

    const fullBabelTransform = (args, contents) =>
      transformContents(args, contents, {});

    build.onLoad({ filter, namespace }, async (args) => {
      let handle;
      try {
        handle = await fs.promises.open(args.path, 'r');
        let entry = transformCache.get(args.path);
        const stats = await handle.stat();

        // Use in-memory cache unless file was modified.
        // Ideally we'd compare file contents, but it would be
        // slower and is already done by the file system cache
        if (!entry || entry.mtimeMs !== stats.mtimeMs) {
          let contents = await handle.readFile('utf8');
          let loader = getLoader(path.extname(args.path));

          if (hasReanimatedSyntax(contents, args.path)) {
            contents = await fullBabelTransform(args, contents);
            loader = 'js';
          } else if (hasFlowSyntax(contents, args.path)) {
            contents = await stripFlow(args, contents);
          }

          entry = {
            transformed: contents,
            loader,
            mtimeMs: stats.mtimeMs,
          };

          if (cache) {
            transformCache.set(args.path, entry);
          }
        }

        return { contents: entry.transformed, loader: entry.loader };
      } finally {
        if (handle) {
          handle.close();
        }
      }
    });
  },
});

module.exports = {
  syntaxAwareLoaderPlugin,
  defaultHasFlowSyntax,
  defaultHasReanimatedSyntax,
};
