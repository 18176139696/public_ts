export declare class Video {
    private Record;
    private videoID;
    private lastCmdTime;
    private videoStartTime;
    private videoEndTime;
    private round;
    private roomCode;
    constructor(round: number, roomCode: number);
    AddSceneData(oldData: any): void;
    private createReplayKey;
    getReplayKey(): string;
    AddVideoData(subCMD: any, oldData: any): void;
    appendVideoData(subCMD: any, oldData: any): void;
    getVideoRecord(): any[];
    getVideoString(): string;
    saveVideo(): void;
}
