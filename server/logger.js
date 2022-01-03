const logform = require("logform");
const tripleBeam = require("triple-beam");
const winston = require("winston");
const format = winston.format;
const moment = require("moment");
const chalk = require("chalk");

const errorHunter = logform.format(info => {
  if (info.error) return info;
  const splat = info[tripleBeam.SPLAT] || [];
  info.error = splat.find(obj => obj instanceof Error);
  return info;
});

const errorPrinter = logform.format(info => {
  if (!info.error) return info;
  const errorMsg = info.error.stack || info.error.toString();
  info.message += `\n${errorMsg}`;

  return info;
});

const createFormattedLogForConsole = info => {
  let formattedOutput = `${info.level} ${info.message}`;
  if (info.event !== undefined) {
    const bg = info.bg || "bgGreen";
    const fg = info.fg || "white";
    const formattedEventLog = chalk`{bold.${bg}.${fg} ${info.event}}`;
    formattedOutput = `${info.level} ${formattedEventLog} ${info.message}`;
  }
  return formattedOutput;
};

const createFormattedLogForFile = info => {
  const output = {
    event: info.event,
    level: info.level,
    message: info.message,
    timestamp: moment().format(),
  };
  return JSON.stringify(output, null, 4);
};

const consoleTransport = new winston.transports.Console({
  format: format.combine(
    errorHunter(),
    errorPrinter(),
    format.colorize(),
    format.simple(),
    format.printf(createFormattedLogForConsole)
  ),
});

const fileTransport = new winston.transports.File({
  filename: __dirname + "/logs.json",
  format: format.combine(format.printf(createFormattedLogForFile)),
});

const logMode = process.env.LOGMODE;
const logger = winston.createLogger();

switch (logMode) {
  case "file":
    logger.add(fileTransport, { name: "file" });
    break;
  case "combined":
    logger.add(consoleTransport, { name: "console" });
    logger.add(fileTransport, { name: "file" });
    break;
  case "silent":
    logger.silent = true;
    break;
  case "console":
  default:
    logger.add(consoleTransport, { name: "console" });
    break;
}

module.exports = logger;
