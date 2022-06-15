const path = require('path');
const crypto = require('crypto');
const { outputFile } = require('fs-extra');
const fs = require('fs');
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
    const transformCache = new Map();

    const transformContents = async ({ args, contents }) => {
      const babelOptions = babel.loadOptions({
        minified: false,
        compact: false,
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
          return await fs.promises.readFile(cachePath, { encoding: 'utf8' });
        } catch (err) {
          const transformed = await transformWithBabel();
          await outputFile(cachePath, transformed);
          return transformed;
        }
      }
      return transformWithBabel();
    };

    build.onLoad({ filter, namespace }, async (args) => {
      let handle;
      try {
        handle = await fs.promises.open(args.path, 'r');
        let entry = transformCache.get(args.path);
        const stats = await handle.stat();

        // Use in-memory cache unless file was modified.
        // Ideally we'd compare file contents, but it would be
        // slower and is already done by the file system cache
        if (!entry || entry.mtimeMs !== stats.mtimeMs) {
          const contents = await handle.readFile('utf8');
          const transformed = await transformContents({ args, contents });
          entry = { transformed, mtimeMs: stats.mtimeMs };
          if (cache) {
            transformCache.set(args.path, entry);
          }
        }

        return { contents: entry.transformed };
      } finally {
        if (handle) {
          handle.close();
        }
      }
    });
  },
});

module.exports = { babelPlugin };
