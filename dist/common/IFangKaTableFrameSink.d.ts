import { ITableFrameSink } from "public";
export declare abstract class IFangKaTableFrameSink extends ITableFrameSink {
    private video;
    private statusTime;
    constructor(tableFrame: any, roomInfo: any);
    abstract getCurRound(): any;
    recordTimeTick(): void;
    getLeftTimeTick(totalTime: number): number;
    getReplayKey(): string;
    AddVideoData(subCmd: number, data: any): void;
    appendVideoData(subCmd: number, data: any): void;
    sendToAll(subCMD: any, data: any, needRecord?: boolean, excludeUserIDArray?: any[]): void;
    sendToWatcher(subCMD: any, data: any, needRecord?: boolean): void;
    sendToPlayer(subCMD: any, chairID: any, data: any, needRecord?: boolean): void;
}
