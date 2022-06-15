const path = require('path');
const chalk = require('chalk');

const createLog =
  (color, log = console.log) =>
  (category, message) => {
    log(`${color.inverse.bold(` ${category.toUpperCase()} `)} ${message}`);
  };

const defaultLogger = {
  warn: createLog(chalk.yellow),
  success: createLog(chalk.green),
  error: createLog(chalk.red),
};

const formatFilePath = (filePath) =>
  `${chalk.dim(`${path.dirname(filePath)}/`)}${chalk.bold(
    path.basename(filePath)
  )}`;

module.exports = { defaultLogger, formatFilePath };
