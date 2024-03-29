const path = require('path');
const { assetLoaderPlugin } = require('./plugins/asset-loader');
const { syntaxAwareLoaderPlugin } = require('./plugins/syntax-aware-loader');
const {
  outOfTreePlatformResolverPlugin,
} = require('./plugins/out-of-tree-platform-resolver');
const {
  ASSET_EXTENSIONS,
  SOURCE_EXTENSIONS,
  BITMAP_IMAGE_EXTENSIONS,
} = require('./config');

function getEsbuildConfig(config, args) {
  const {
    entryFile,
    platform,
    dev,
    minify,
    bundleOutput,
    assetsDest,
    sourcemapOutput,
  } = args;

  if (!config.platforms[platform]) {
    throw new Error(
      `Invalid platform "${platform}", expected one of ${Object.keys(
        config.platforms
      ).join(', ')}`
    );
  }

  const platforms = [platform, 'native', 'react-native'];
  const extensions = SOURCE_EXTENSIONS.concat(ASSET_EXTENSIONS);
  const resolveExtensions = platforms
    .map((p) => extensions.map((e) => `.${p}${e}`))
    .concat(extensions)
    .flat();

  const outOfTreeReactNativeModuleName =
    config.platforms[platform].npmPackageName;
  const resolveReactNativePath = (p) =>
    outOfTreeReactNativeModuleName
      ? require.resolve(path.join(outOfTreeReactNativeModuleName, p))
      : path.join(config.reactNativePath, p);

  return {
    mainFields: ['react-native', 'browser', 'module', 'main'],
    entryPoints: [entryFile],
    outfile: bundleOutput,
    sourceRoot: config.root,
    sourcemap: Boolean(sourcemapOutput),
    minify: typeof minify === 'boolean' ? minify : !dev,
    resolveExtensions,
    define: {
      __DEV__: JSON.stringify(dev),
      global: 'window',
      'process.env.NODE_ENV': JSON.stringify(
        dev ? 'development' : 'production'
      ),
    },
    loader: {
      '.js': 'jsx',
      ...Object.fromEntries(ASSET_EXTENSIONS.map((ext) => [ext, 'file'])),
    },
    legalComments: 'none',
    banner: {
      js: `var __BUNDLE_START_TIME__=this.nativePerformanceNow?nativePerformanceNow():Date.now(); var window = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this;`,
    },
    inject: [
      ...require(resolveReactNativePath('rn-get-polyfills'))(),
      resolveReactNativePath('Libraries/Core/InitializeCore.js'),
    ],
    target: 'es6',
    format: 'iife',
    plugins: [
      outOfTreeReactNativeModuleName &&
        outOfTreePlatformResolverPlugin({
          moduleName: outOfTreeReactNativeModuleName,
        }),
      assetLoaderPlugin({
        extensions: ASSET_EXTENSIONS,
        scalableExtensions: BITMAP_IMAGE_EXTENSIONS,
        platform,
        rootdir: config.root,
        outdir: assetsDest,
        dev,
      }),
      syntaxAwareLoaderPlugin({
        filter: /\.([mc]js|[tj]sx?)$/,
        cache: dev,
      }),
    ].filter(Boolean),
  };
}

module.exports = { getEsbuildConfig };
