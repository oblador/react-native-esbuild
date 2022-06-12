<h1 align="center">react-native-esbuild</h1>
<h3 align="center">The fastest bundler for React Native.</h3>

<div align="center">
  <a href="https://github.com/oblador?tab=followers">
    <img src="https://img.shields.io/github/followers/oblador?label=Follow%20%40oblador&style=social" />
  </a>

  <a href="https://twitter.com/trastknast">
    <img src="https://img.shields.io/twitter/follow/trastknast?label=Follow%20%40trastknast&style=social" />
  </a>
</div>

## Features

- **Fast** – ~10-50x faster depending on project
- **Tree shaking** – Smaller bundles means faster apps
- **Compatible** – Drop-in replacement for metro
- **Configurable** – Support for custom transformers and env variables

## Sponsoring

If this library helped you, please consider [sponsoring](https://github.com/sponsors/oblador).

## Installation

```shell
yarn add react-native-esbuild esbuild
```

## Configuration

### `react-native` CLI plugin

Make sure `react-native.config.js` exists in the root of your project, and create one if not. Add this library to the `commands` section like this:

```js
// react-native.config.js
const { commands } = require('react-native-esbuild');

module.exports = {
  commands,
};
```

### Optional: Esbuild settings

If you want to customize the [esbuild configuration](https://esbuild.github.io/api/#simple-options), for example by adding your own plugins you may do so with the `createEsbuildCommands` function. This example adds babel transformation for reanimated support:

```js
// react-native.config.js
const { createEsbuildCommands, babelPlugin } = require('react-native-esbuild');

// See https://esbuild.github.io/api/#simple-options
const commands = createEsbuildCommands((config) => ({
  ...config,
  plugins: config.plugins.concat(
    babelPlugin({
      filter:
        /(node_modules\/react-native-reanimated|src\/my-reanimated-components)\/.+\.[tj]sx?$/,
    })
  ),
}));

module.exports = {
  commands,
};
```

### Optional: Use esbuild for development

1. Open `package.json` in your editor and locate `scripts` section.
2. Edit `start` script to be `react-native esbuild-start`.
3. Prevent metro from starting automatically by appending `--no-packager` to the `ios`/`android` scripts.

```json
{
  "scripts": {
    "android": "react-native run-android --no-packager",
    "ios": "react-native run-ios --no-packager",
    "start": "react-native esbuild-start"
  }
}
```

### Optional: Build production app with esbuild

#### Android

Set `project.ext.react.bundleCommand` to `esbuild-bundle` in `android/app/build.gradle`:

```gradle
// android/app/build.gradle
project.ext.react = [
    enableHermes: false,
    bundleCommand: "esbuild-bundle",
]
```

#### iOS

1. Open your iOS project in Xcode manually or with `xed ios`
2. Select the `Build Phases` tab in your project settings.
3. Expand the `Bundle React Native code and images` section and add `export BUNDLE_COMMAND=esbuild-bundle` so it looks like this:

```shell
set -e

export BUNDLE_COMMAND=esbuild-bundle
export NODE_BINARY=node
../node_modules/react-native/scripts/react-native-xcode.sh
```

## Usage

This library aims to be a plug-in replacement for the metro equivalent commands with the `esbuild-` prefix.

### `react-native esbuild-start`

| **Argument**       | **Description**                  | **Default** |
| ------------------ | -------------------------------- | ----------- |
| `--port`           | Port to listen for http requests | `8081`      |
| `--host`           | Host to listen for http requests | `127.0.0.1` |
| `--projectRoot`    | Path to a custom project root.   | _None_      |
| `--reset-cache`    | Removes cached files.            | _N/A_       |
| `--no-interactive` | Disables interactive mode.       | `false`     |

### `react-native esbuild-bundle`

| **Argument**         | **Description**                                                                   | **Default**       |
| -------------------- | --------------------------------------------------------------------------------- | ----------------- |
| `--entry-file`       | Path to the root JS file, either absolute or relative to JS root                  | `index.js`        |
| `--platform`         | Either `ios` or `android`                                                         | `ios`             |
| `--dev`              | If `false`, warnings are disabled and the bundle is minified                      | `true`            |
| `--minify`           | Allows overriding whether bundle is minified otherwise determined by `dev` value. | Opposite of `dev` |
| `--bundle-output`    | File name where to store the resulting bundle.                                    | _None_            |
| `--sourcemap-output` | File name where to store the sourcemap file for resulting bundle.                 | _None_            |
| `--assets-dest`      | Directory name where to store assets referenced in the bundle.                    | _None_            |
| `--reset-cache`      | Removes cached files.                                                             | _N/A_             |

## Troubleshooting

### Flow syntax errors such as `Expected "from" but found "{"`

Esbuild doesn't natively support flow so such syntax needs to be stripped with a plugin. By default any node module with `react-native` in their name will be stripped from flow, but it's also possible to do this on your own source code using the `babelPlugin` mentioned in the [Configuration](#configuration) section, but at the cost of performance.

### `react-native` main field ignored

A few rare packages using the `react-native` field for ESM maps, will not be correctly resolved by esbuild. To remedy this use the bundled `esmCustomMainFieldResolverPlugin`:

```js
// react-native.config.js
const {
  createEsbuildCommands,
  esmCustomMainFieldResolverPlugin,
} = require('react-native-esbuild');

const commands = createEsbuildCommands(({ plugins, ...rest }) => ({
  ...rest,
  plugins: plugins.concat(esmCustomMainFieldResolverPlugin()),
}));

module.exports = {
  commands,
};
```

## Limitations

### Hermes engine

Hermes doesn't support crucial ES6 features like block level scoping (`let`/`const`) and the team doesn't seem to want to merge this feature mentioning it [being a too big of a change](https://github.com/facebook/hermes/issues/575#issuecomment-902169154) without [having good enough reasons to add it](https://github.com/facebook/hermes/issues/715#issuecomment-1083236894).

### HMR/Fast Refresh

Esbuild [doesn't support Fast Refresh or Hot Module Replacement](https://github.com/evanw/esbuild/issues/151#issuecomment-634441809), but this library supports live reload instead.

## License

MIT © Joel Arvidsson 2022-
