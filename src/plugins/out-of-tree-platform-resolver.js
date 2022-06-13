const path = require('path');

const isModuleImport = (moduleName, args) =>
  args.path === moduleName || args.path.startsWith(`${moduleName}/`);

const RN_PACKAGE_NAME = 'react-native';

const outOfTreePlatformResolverPlugin = ({
  filter = /./,
  moduleName,
} = {}) => ({
  name: 'out-of-tree-platform-resolver',
  setup(build) {
    if (!moduleName || moduleName === RN_PACKAGE_NAME) {
      throw new Error(`Invalid \`moduleName\` argument "${moduleName}"`);
    }

    build.onResolve({ filter }, async (args) => {
      if (isModuleImport(RN_PACKAGE_NAME, args)) {
        const target = `${moduleName}${args.path.slice(
          RN_PACKAGE_NAME.length
        )}`;

        return await build.resolve(target, {
          resolveDir: args.resolveDir,
          importer: args.importer,
          kind: args.kind,
          namespace: args.namespace,
        });
      }

      return null;
    });
  },
});

module.exports = { outOfTreePlatformResolverPlugin };
