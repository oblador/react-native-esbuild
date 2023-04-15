const {
  assetLoaderPlugin,
  babelPlugin,
  outOfTreePlatformResolverPlugin,
  syntaxAwareLoaderPlugin,
  defaultHasFlowSyntax,
  defaultHasReanimatedSyntax,
} = require('./plugins');
const { createEsbuildCommands } = require('./commands');

const commands = createEsbuildCommands();

module.exports = {
  commands,
  createEsbuildCommands,
  assetLoaderPlugin,
  babelPlugin,
  outOfTreePlatformResolverPlugin,
  syntaxAwareLoaderPlugin,
  defaultHasFlowSyntax,
  defaultHasReanimatedSyntax,
};
