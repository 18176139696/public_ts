import { AndroidItem } from "./AndroidItem";
export declare abstract class IAndroidUserSink {
    timeMng: any[];
    protected androidUserItem: AndroidItem;
    constructor(androidItem: AndroidItem);
    abstract onEventSceneMessage(gameStatus: any, data: any): any;
    abstract onEventGameMessage(subCMD: any, data: any): any;
    onEventFrameMessage(subCMD: any, data: any): boolean;
    setGameTimer(func: any, timerID: any, time: any): void;
    killGameTimer(timerID: any): void;
    clearAllTimer(): void;
}
