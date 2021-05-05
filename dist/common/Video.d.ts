export declare class Video {
    private videoID;
    private Record;
    private lastCmdTime;
    constructor(videoID: number | string);
    AddSceneData(data: any): void;
    getVideoID(): string | number;
    AddVideoData(subCMD: any, data: any): void;
    appendVideoData(subCMD: any, data: any): void;
    getVideoRecord(): any[];
    getVideoString(): string;
    saveVideo(): void;
}
