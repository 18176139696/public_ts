import "reflect-metadata";
interface IProperty {
    read: boolean;
    write: boolean;
    desc: string;
}
interface IPropertyMap {
    [key: string]: IProperty;
}
export declare function property(options: IProperty): PropertyDecorator;
export declare class IControlConfig {
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
    onGetControlConfig(): {
        attributes: IPropertyMap;
        kv: {};
    };
    private checkAndFormatConfig;
    onModifyControlConfig(data: any, readFromFile?: boolean): boolean;
    updateWaterLevel(): void;
    getNowWater(): number;
    startConfig(): void;
    private loadConfig;
    saveConfig(): void;
}
export {};
