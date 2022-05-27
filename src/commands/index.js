const path = require('path');
const { getEsbuildConfig } = require('../esbuild-config');

function createEsbuildCommands(
  enhanceEsbuildConfig = (esbuildConfig) => esbuildConfig
) {
  const getEnhancedEsbuildConfig = (config, args) =>
    enhanceEsbuildConfig(getEsbuildConfig(config, args), args);

  return [
    {
      name: 'esbuild-bundle',
      func: require('./bundle')(getEnhancedEsbuildConfig),
      options: [
        {
          name: '--entry-file <path>',
          description:
            'Path to the root JS file, either absolute or relative to JS root',
          default: 'index.js',
        },
        {
          name: '--platform <string>',
          description: 'Either "ios" or "android"',
          default: 'ios',
        },
        {
          name: '--dev [boolean]',
          description:
            'If false, warnings are disabled and the bundle is minified',
          parse: (val) => val !== 'false',
          default: true,
        },
        {
          name: '--minify [boolean]',
          description:
            'Allows overriding whether bundle is minified. This defaults to ' +
            'false if dev is true, and true if dev is false. Disabling minification ' +
            'can be useful for speeding up production builds for testing purposes.',
          parse: (val) => val !== 'false',
        },
        {
          name: '--bundle-output <string>',
          description:
            'File name where to store the resulting bundle, ex. /tmp/groups.bundle',
        },
        {
          name: '--sourcemap-output <string>',
          description:
            'File name where to store the sourcemap file for resulting bundle, ex. /tmp/groups.map',
        },
        {
          name: '--assets-dest <string>',
          description:
            'Directory name where to store assets referenced in the bundle',
        },
        {
          name: '--reset-cache, --resetCache',
          description: 'Removes cached files',
          default: false,
        },
      ],
      description: 'builds the javascript bundle for offline use',
    },
    {
      name: 'esbuild-start',
      func: require('./start')(getEnhancedEsbuildConfig),
      options: [
        {
          name: '--port <number>',
          parse: Number,
        },
        {
          name: '--host <string>',
          default: '',
        },
        {
          name: '--projectRoot <path>',
          description: 'Path to a custom project root',
          parse: (val) => path.resolve(val),
        },
        {
          name: '--reset-cache, --resetCache',
          description: 'Removes cached files',
          default: false,
        },
      ],
      description: 'Starts the development server with esbuild as bundler',
    },
  ];
}

module.exports = { createEsbuildCommands };
