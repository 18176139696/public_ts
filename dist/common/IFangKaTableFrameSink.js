"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const public_1 = require("public");
const moment = require("moment");
class IFangKaTableFrameSink extends public_1.ITableFrameSink {
    constructor(tableFrame, roomInfo) {
        super(tableFrame, roomInfo);
        this.video = null;
        this.statusTime = 0;
    }
    recordTimeTick() {
        this.statusTime = Date.now() / 1000;
    }
    ;
    getLeftTimeTick(totalTime) {
        let passTime = (Date.now() / 1000) - this.statusTime;
        return Math.floor(totalTime - passTime < 0 ? 0 : totalTime - passTime);
    }
    ;
    getReplayKey() {
        return "" + this.roomInfo.RoomID + this.tableFrame.getTableUserData().roomCode + this.getCurRound() + moment().format("YYYYMMDDhhmmss");
    }
    ;
    AddVideoData(subCmd, data) {
        if (this.video) {
            this.video.AddVideoData(subCmd, data);
        }
    }
    appendVideoData(subCmd, data) {
        if (this.video) {
            this.video.appendVideoData(subCmd, data);
        }
    }
    sendToAll(subCMD, data, needRecord = true, excludeUserIDArray = []) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.sendToAll(public_1.gameCMD.MDM_GF_GAME, subCMD, data, excludeUserIDArray);
    }
    ;
    sendToWatcher(subCMD, data, needRecord = false) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.send2Watcher(public_1.gameCMD.MDM_GF_GAME, subCMD, data, []);
    }
    ;
    sendToPlayer(subCMD, chairID, data, needRecord = false) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.sendToPlayer(public_1.gameCMD.MDM_GF_GAME, subCMD, chairID, data);
    }
    ;
}
exports.IFangKaTableFrameSink = IFangKaTableFrameSink;
