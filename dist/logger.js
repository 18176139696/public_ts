"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let winston = require("winston");
let util = require("util");
require('winston-daily-rotate-file');
const { createLogger, format, transports } = winston;
const myFormat = format.printf(({ level, message, label, timestamp }) => {
    return `${timestamp}[${level}] : ${message}`;
});
const transportConsole = new transports.Console({
    format: format.combine(format.colorize(), myFormat),
    level: "error",
});
class WinstonLoggerEx {
    constructor() {
        this.winstonLogger = null;
    }
    createLogger(prefix) {
        const debugTransportFile = new transports.DailyRotateFile({
            filename: prefix + '-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
        });
        const errorTransportFile = new transports.DailyRotateFile({
            filename: prefix + '-%DATE%-error.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error'
        });
        this.winstonLogger = createLogger({
            format: format.combine(format.timestamp({
                format: 'HH:mm:ss.SSS'
            }), myFormat),
            transports: [
                debugTransportFile,
                errorTransportFile,
                transportConsole,
            ]
        });
    }
    log(...args) {
        this.winstonLogger.debug(util.format(...args));
    }
    debug(...args) {
        this.winstonLogger.debug(util.format(...args));
    }
    info(...args) {
        this.winstonLogger.info(util.format(...args));
    }
    warn(...args) {
        this.winstonLogger.warn(util.format(...args));
    }
    error(...args) {
        this.winstonLogger.error(util.format(...args));
    }
}
let logger = new WinstonLoggerEx();
exports.logger = logger;
