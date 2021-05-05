declare class WinstonLoggerEx {
    private winstonLogger;
    createLogger(prefix: string): void;
    log(...args: any[]): void;
    debug(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
}
declare let logger: WinstonLoggerEx;
export { logger };
