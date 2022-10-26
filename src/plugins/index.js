const { assetLoaderPlugin } = require('./asset-loader');
const { babelPlugin } = require('./babel');
const {
  esmCustomMainFieldResolverPlugin,
} = require('./esm-custom-main-field-resolver');
const {
  outOfTreePlatformResolverPlugin,
} = require('./out-of-tree-platform-resolver');
const {
  syntaxAwareLoaderPlugin,
  defaultHasFlowSyntax,
  defaultHasReanimatedSyntax,
} = require('./syntax-aware-loader');

module.exports = {
  assetLoaderPlugin,
  babelPlugin,
  esmCustomMainFieldResolverPlugin,
  outOfTreePlatformResolverPlugin,
  syntaxAwareLoaderPlugin,
  defaultHasFlowSyntax,
  defaultHasReanimatedSyntax,
};
