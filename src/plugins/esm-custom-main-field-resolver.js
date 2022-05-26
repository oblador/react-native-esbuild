const path = require('path');

const esmCustomMainFieldResolverPlugin = ({
  filter = /./,
  mainField = 'react-native',
} = {}) => ({
  name: 'esm-resolver',
  setup(build) {
    const getPkg = p => {
      const dir = path.dirname(p);
      if (dir === p) {
        throw new Error('Unable to locate package.json');
      }
      try {
        return require(path.join(p, 'package.json'));
      } catch (_e) {
        return getPkg(dir);
      }
    };
    build.onResolve({ filter }, async args => {
      if (args.importer.includes('node_modules')) {
        const pkg = getPkg(args.importer);
        const map = pkg[mainField];
        if (map && typeof map === 'object' && args.path in map) {
          return { path: path.join(args.resolveDir, map[args.path]) };
        }
      }
      return null;
    });
  },
});

module.exports = { esmCustomMainFieldResolverPlugin };
