const { parse } = require('url');

function extractBundleParams(url) {
  const {
    pathname,
    query: { platform, dev, minify },
  } = parse(url, true);

  if (!pathname.endsWith('.bundle')) {
    throw new Error(
      `Expected path name to end with .bundle, got "${pathname}"`,
    );
  }

  return {
    platform,
    entryFile: pathname.substring(1, pathname.length - 7),
    dev: dev !== 'false',
    minify: minify === 'true',
  };
}

module.exports = { extractBundleParams };
