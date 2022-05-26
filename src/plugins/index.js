const { assetLoaderPlugin } = require('./asset-loader');
const { babelPlugin } = require('./babel');
const {
  esmCustomMainFieldResolverPlugin,
} = require('./esm-custom-main-field-resolver');

module.exports = {
  assetLoaderPlugin,
  babelPlugin,
  esmCustomMainFieldResolverPlugin,
};
