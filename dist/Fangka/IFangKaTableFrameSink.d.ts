import { ITableFrameSink } from "../ITableFrameSink";
export interface IFangkaPlayer {
    score: number;
    singleScore: number;
}
export interface IBigEndInfo {
    chairID: number;
    userID: number;
    head: string;
    nickname: string;
    score: number;
    gameID: number;
}
export declare abstract class IFangKaTableFrameSink extends ITableFrameSink {
    private video;
    private statusTime;
    private gameDetailArray;
    constructor(tableFrame: any, roomInfo: any);
    abstract getCurRound(): any;
    repositionSink(clear?: any): void;
    onActionUserStandUp(chair: any, userItem: any): void;
    onActionUserSitDown(chair: any, userItem: any): void;
    onActionOffline(chairID: any, userItem: any): void;
    onGameConculde(): void;
    checkStandup(userItem: any): boolean;
    recordTimeTick(): void;
    getLeftTimeTick(totalTime: number): number;
    newVideo(): void;
    getReplayKey(): void;
    isVideoOpen(): boolean;
    AddSceneData(data: any): void;
    AddVideoData(subCmd: number, data: any): void;
    appendVideoData(subCmd: number, data: any): void;
    saveVideoFile(): void;
    sendToAll(subCMD: any, data: any, needRecord?: boolean, excludeUserIDArray?: any[]): void;
    sendToWatcher(subCMD: any, data: any, needRecord?: boolean): void;
    sendToPlayer(subCMD: any, chairID: any, data: any, needRecord?: boolean): void;
    writeGameEndInfo(players: IFangkaPlayer[], gameEnd?: {}): void;
    getBigEndInfo(players: IFangkaPlayer[]): IBigEndInfo[];
    private getTotalInfo;
    writeBattle(players: IFangkaPlayer[], gameEndMsgArray?: any[]): void;
    private getGameDetailInfo;
}
