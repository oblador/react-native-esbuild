const { createEsbuildCommands, babelPlugin } = require('react-native-esbuild');

// See https://esbuild.github.io/api/#simple-options
const commands = createEsbuildCommands((config) => ({
  ...config,
  plugins: config.plugins.concat(
    babelPlugin({
      filter: /(node_modules\/react-native-reanimated\/.+\.[tj]sx?|App\.js)$/,
      config: {
        filename: config.outfile,
      },
    })
  ),
}));

module.exports = {
  commands,
};
