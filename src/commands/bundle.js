const esbuild = require('esbuild');
const { emptyDefaultCacheDir } = require('../cache');

module.exports = (getBundleConfig) => async (_, config, args) => {
  if (args.resetCache) {
    emptyDefaultCacheDir();
  }
  const esbuildConfig = getBundleConfig(config, args);
  await esbuild.build({
    ...esbuildConfig,
    bundle: true,
    watch: false,
    incremental: false,
    write: true,
  });
};
