const { codeFrameColumns } = require('@babel/code-frame');

function isBundleFrame(frame) {
  return frame.file && frame.file.startsWith('http');
}

function processFrame(sourceMapConsumer, frame) {
  if (!frame.lineNumber || !frame.column) {
    return frame;
  }

  const lookup = sourceMapConsumer.originalPositionFor({
    line: frame.lineNumber,
    column: frame.column,
  });

  if (!lookup.source) {
    return frame;
  }

  return {
    lineNumber: lookup.line || frame.lineNumber,
    column: lookup.column || frame.column,
    file: lookup.source,
    methodName: lookup.name || frame.methodName,
  };
}

const INTERNAL_CALLSITES_REGEX = new RegExp(
  [
    '/Libraries/Renderer/implementations/.+\\.js$',
    '/Libraries/BatchedBridge/MessageQueue\\.js$',
    '/Libraries/YellowBox/.+\\.js$',
    '/Libraries/LogBox/.+\\.js$',
    '/Libraries/Core/Timers/.+\\.js$',
    '/node_modules/react-devtools-core/.+\\.js$',
    '/node_modules/react-refresh/.+\\.js$',
    '/node_modules/scheduler/.+\\.js$',
  ].join('|')
);

function collapseReactFrame(frame) {
  const collapse = Boolean(
    frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file)
  );
  return { ...frame, collapse };
}

function getCodeFrame(sourceMapConsumer, frames) {
  const frame = frames.find((f) => !f.collapse && f.lineNumber && f.column);
  if (!frame) {
    return;
  }
  const { file, column, lineNumber } = frame;
  try {
    const source = sourceMapConsumer.sourceContentFor(file);

    return {
      content: codeFrameColumns(
        source,
        {
          start: { column, line: lineNumber },
        },
        { forceColor: true }
      ),
      location: { column, row: lineNumber },
      fileName: file,
    };
  } catch (error) {
    console.error('Failed to create code frame: ' + error.message);
  }
}

function symbolicateStack(sourceMapConsumer, stack) {
  const frames = stack
    .filter(isBundleFrame)
    .map((frame) => processFrame(sourceMapConsumer, frame))
    .map(collapseReactFrame);

  const codeFrame = getCodeFrame(sourceMapConsumer, frames);

  return {
    stack: frames,
    codeFrame: codeFrame || null,
  };
}

module.exports = { symbolicateStack };
