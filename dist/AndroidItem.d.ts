import { AndroidManager } from "./AndroidManager";
import { ServerUserItem } from "./ServerUserItem";
import { IAndroidUserSink } from "./IAndroidUserSink";
declare const events: any;
export declare class AndroidItem extends events.EventEmitter {
    serverUserItem: ServerUserItem;
    androidUserManager: AndroidManager;
    gameStatus: number;
    androidUserSink: IAndroidUserSink;
    constructor(serverUserItem: any, androidUserMNG: any);
    getUserID(): any;
    getTableID(): any;
    getChairID(): any;
    getMeUserItem(): ServerUserItem;
    sendSocketData(subCMD: any, data: any): boolean;
    sendUserReady(data: any): void;
    sendUserStandUp(): void;
    sendAgreeDismiss(): void;
    clearAllTimer(): boolean;
    startGameClient(): void;
    onSocketEvent(mainCMD: any, subCMD: any, data: any): boolean;
    onSocketMainLogon(subCMD: any, data: any): void;
    onSocketMainUser(subCMD: any, data: any): boolean;
    onSocketMainGame(subCMD: any, data: any): any;
    onSocketMainFrame(subCMD: any, data: any): boolean;
}
export {};
