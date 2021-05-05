import { TableFrame } from "./TableFrame";
export declare abstract class ITableFrameSink {
    roomInfo: any;
    chairCount: number;
    tableFrame: TableFrame;
    minReadyCount: number;
    private timeMng;
    constructor(tableFrame: any, roomInfo: any);
    abstract onGameMessageEvent(subCMD: any, data: any, userItem: any): any;
    abstract onEventSendGameScene(chairID: any, userItem: any, gameStatus: any): any;
    abstract onActionOffline(chairID: any, userItem: any): any;
    abstract onActionUserStandUp(chair: any, userItem: any): any;
    abstract onActionUserSitDown(chair: any, userItem: any): any;
    abstract repositionSink(): any;
    abstract onEventStartGame(): any;
    abstract onGameConculde(): any;
    abstract checkStandup(userItem: any): boolean;
    onDismiss(): void;
    onEventConcludeGame(chair: any, userItem: any, concludeReason: any): boolean;
    broadCastGameData(subCMD: any, chairID: any, data: any, onlyPlaying?: any): void;
    setGameTimer(func: any, timerID: any, time: any, ...params: any[]): void;
    killGameTimer(timerID: any): void;
    clearAllTimer(): void;
    WriteScore(chairID: any, addScore: any): number;
    canStartGame(userCount: number): boolean;
    onUserCancelReady(chairID: any, userItem: any): void;
}
