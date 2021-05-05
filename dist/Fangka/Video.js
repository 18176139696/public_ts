"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
let fs = require('fs');
let clone = require("clone");
class Video {
    constructor(round, roomCode) {
        this.lastCmdTime = 0;
        this.videoStartTime = 0;
        this.videoEndTime = 0;
        this.round = 0;
        this.roomCode = 0;
        this.videoID = "";
        this.Record = [];
        this.lastCmdTime = 0;
        this.videoStartTime = Date.now();
        this.videoStartTime = 0;
        this.round = round;
        this.roomCode = roomCode;
    }
    AddSceneData(oldData) {
        let data = clone(oldData);
        this.Record.unshift(data);
    }
    createReplayKey() {
        this.videoID = moment().format("MMDDhhmmss") + "_" + this.roomCode + "_" + this.round + "_" + this.videoStartTime + "_";
    }
    ;
    getReplayKey() {
        if (!this.videoID)
            this.createReplayKey();
        return this.videoID;
    }
    ;
    AddVideoData(subCMD, oldData) {
        let data = clone(oldData);
        let time = 0;
        let nowTs = Date.now();
        if (this.Record.length > 0) {
            time = Math.min(nowTs - this.lastCmdTime, 5 * 1000);
        }
        this.Record.push({ subCMD: subCMD, data: data, time });
        this.lastCmdTime = nowTs;
    }
    appendVideoData(subCMD, oldData) {
        let data = clone(oldData);
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
        let rFileName = this.getReplayKey();
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
