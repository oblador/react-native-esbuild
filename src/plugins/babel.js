const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const babel = require('@babel/core');
const { getDefaultCacheDir } = require('../cache');

const md5 = (string) => crypto.createHash('md5').update(string).digest('hex');

const babelPlugin = (options = {}) => ({
  name: 'babel',
  setup(build, { transform } = {}) {
    const {
      filter = /.*/,
      namespace = '',
      cache = true,
      config = {},
    } = options;

    const transformContents = async ({ args, contents }) => {
      const babelOptions = babel.loadOptions({
        ...config,
        sourceMaps: 'inline',
        filename: args.path,
        caller: {
          name: 'esbuild-plugin-babel',
          supportsStaticESM: true,
        },
      });
      if (!babelOptions) {
        return { contents };
      }

      if (babelOptions.sourceMaps) {
        const filename = path.relative(process.cwd(), args.path);

        babelOptions.sourceFileName = filename;
      }

      const transformWithBabel = () =>
        new Promise((resolve, reject) => {
          babel.transform(contents, babelOptions, (error, result) => {
            error ? reject(error) : resolve(result.code);
          });
        });

      if (cache) {
        const cachePath = path.join(
          typeof cache === 'string' ? cache : getDefaultCacheDir(),
          md5(JSON.stringify(babelOptions) + contents)
        );
        try {
          return await fs.readFile(cachePath, { encoding: 'utf8' });
        } catch (err) {
          const transformed = await transformWithBabel();
          await fs.outputFile(cachePath, transformed);
          return transformed;
        }
      }
      return transformWithBabel();
    };

    build.onLoad({ filter, namespace }, async (args) => {
      const contents = await fs.readFile(args.path, 'utf8');
      return { contents: await transformContents({ args, contents }) };
    });
  },
});

module.exports = { babelPlugin };
