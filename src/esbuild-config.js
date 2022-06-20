const os = require('os');
const path = require('path');
const { assetLoaderPlugin } = require('./plugins/asset-loader');
const { babelPlugin } = require('./plugins/babel');
const {
  outOfTreePlatformResolverPlugin,
} = require('./plugins/out-of-tree-platform-resolver');

const BITMAP_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const VECTOR_IMAGE_EXTENSIONS = ['.svg'];
const IMAGE_EXTENSIONS = BITMAP_IMAGE_EXTENSIONS.concat(
  VECTOR_IMAGE_EXTENSIONS
);
const VIDEO_EXTENSIONS = ['.mp4'];
const ASSET_EXTENSIONS = IMAGE_EXTENSIONS.concat(VIDEO_EXTENSIONS);
const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.json'];

function getEsbuildConfig(config, args) {
  const {
    entryFile,
    platform,
    dev,
    minify,
    bundleOutput,
    assetsDest,
    assetsPublicPath,
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
      __DEV__: dev,
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
        publicPath: assetsPublicPath,
        outdir: assetsDest,
        dev,
      }),
      babelPlugin({
        filter: new RegExp(`node_modules/([^/]*react-native[^/]*)/.+\\.jsx?$`),
        cache: dev,
        loader: 'jsx',
        config: {
          babelrc: false,
          configFile: false,
          plugins: [
            '@babel/plugin-syntax-flow',
            '@babel/plugin-transform-flow-strip-types',
            '@babel/plugin-syntax-jsx',
          ],
        },
      }),
    ].filter(Boolean),
  };
}

module.exports = { getEsbuildConfig };
