"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let fs = require('fs');
class Video {
    constructor(videoID) {
        this.lastCmdTime = 0;
        this.videoID = videoID;
        this.Record = [];
        this.lastCmdTime = 0;
    }
    AddSceneData(data) {
        this.Record.unshift(data);
    }
    getVideoID() {
        return this.videoID;
    }
    AddVideoData(subCMD, data) {
        let time = 0;
        let nowTs = Date.now();
        if (this.Record.length > 0) {
            time = Math.min(nowTs - this.lastCmdTime, 5 * 1000);
        }
        this.Record.push({ subCMD: subCMD, data: data, time });
        this.lastCmdTime = nowTs;
    }
    appendVideoData(subCMD, data) {
        let tempLen = this.Record.length;
        let lastRecord = this.Record[tempLen - 1];
        if (lastRecord) {
            if (Array.isArray(lastRecord)) {
                lastRecord.push({ subCMD: subCMD, data: data });
            }
            else {
                let newRecord = [lastRecord];
                newRecord.push({ subCMD: subCMD, data: data });
                this.Record[tempLen - 1] = newRecord;
            }
        }
        else {
            this.Record.push({ subCMD: subCMD, data: data });
        }
    }
    getVideoRecord() {
        return this.Record;
    }
    getVideoString() {
        return JSON.stringify(this.Record);
    }
    saveVideo() {
        if (!this.Record)
            return;
        let rFileName = this.videoID;
        fs.writeFile(rFileName, this.getVideoString(), { 'flag': 'w' }, function (err) {
            if (err) {
                logger.error("writeFile err = ", rFileName, "fileName = ", rFileName);
                return;
            }
        });
    }
    ;
}
exports.Video = Video;
