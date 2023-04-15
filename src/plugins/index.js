const { assetLoaderPlugin } = require('./asset-loader');
const { babelPlugin } = require('./babel');
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
  outOfTreePlatformResolverPlugin,
  syntaxAwareLoaderPlugin,
  defaultHasFlowSyntax,
  defaultHasReanimatedSyntax,
};
