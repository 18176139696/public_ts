declare class IControlConfig {
    configFileName: string;
    nowStock: number;
    nowTax: number;
    taxRate: number;
    highWater: number;
    normalWater: number;
    lowWater: number;
    nowWater: number;
    controlDesc: string;
    constructor();
    protected configItem(key: string, value: any, desc: string, attr: string): {
        key: string;
        value: any;
        desc: string;
        attr: string;
    };
    onGetControlConfig(): any[];
    private arrayToMap;
    private checkAndFormatConfig;
    onModifyControlConfig(data: any, readFromFile?: boolean): boolean;
    updateWaterLevel(): void;
    getNowWater(): number;
    startConfig(): void;
    private loadConfig;
    saveConfig(): void;
}



declare class GameConfig {
    Single: boolean;
    offlineDelTime: number;
    ChairID: number | number[];
    RoomInfo: any;
    RoomID: number;
    PORT: number;
    AndroidNum: number;
    tableUserData: any;
    plazaKey: string;
    LoginAddr: string;
    FreeModeMinScore: number;
    FreeMode: boolean;
    enableWatcher: boolean;
    Dismiss: boolean;
    AutoKickoutTime: number;
    GoldMode:boolean;
}

declare class WinstonLoggerEx {
    createLogger(prefix: string): void;
    log(...args: any[]): void;
    debug(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
}

declare let logger: WinstonLoggerEx;
declare let gameconfig: GameConfig;
declare const TableFrameSink: any
declare const AndroidUserSink: any;
declare const ControlConfig: IControlConfig;