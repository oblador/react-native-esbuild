const { test } = require('uvu');
const assert = require('uvu/assert');
const { extractBundleParams } = require('./extract-bundle-params');

test('throws for non .bundle urls', () => {
  assert.throws(() => extractBundleParams('/index.html?platform=ios'));
});

test('throws when missing platform in url', () => {
  assert.throws(() => extractBundleParams('/index.bundle'));
});

test('has defaults for dev & minify', () => {
  assert.equal(extractBundleParams('/index.bundle?platform=ios'), {
    platform: 'ios',
    entryFile: 'index',
    dev: true,
    minify: false,
  });
});

test('ignores additional params', () => {
  assert.equal(
    extractBundleParams(
      '/index.bundle?platform=macos&dev=true&minify=false&modulesOnly=false&runModule=true&app=se.oblador.test'
    ),
    {
      platform: 'macos',
      entryFile: 'index',
      dev: true,
      minify: false,
    }
  );
});

test.run();
