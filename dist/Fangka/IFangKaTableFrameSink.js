"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Video_1 = require("./Video");
const ITableFrameSink_1 = require("../ITableFrameSink");
const define_1 = require("../define");
const ttutil_1 = require("../ttutil");
class IFangKaTableFrameSink extends ITableFrameSink_1.ITableFrameSink {
    constructor(tableFrame, roomInfo) {
        super(tableFrame, roomInfo);
        this.video = null;
        this.statusTime = 0;
        this.gameDetailArray = [];
    }
    repositionSink(clear) {
        this.video = null;
        if (clear) {
            this.gameDetailArray = [];
        }
    }
    onActionUserStandUp(chair, userItem) {
    }
    onActionUserSitDown(chair, userItem) {
        return;
    }
    onActionOffline(chairID, userItem) {
        return;
    }
    onGameConculde() {
        return;
    }
    checkStandup(userItem) {
        return true;
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
    newVideo() {
        this.video = new Video_1.Video(this.getCurRound(), this.tableFrame.getTableUserData().roomCode);
    }
    ;
    getReplayKey() {
        if (this.video) {
            this.video.getReplayKey();
        }
    }
    isVideoOpen() {
        return !!this.video;
    }
    ;
    AddSceneData(data) {
        if (this.video) {
            this.video.AddSceneData(data);
        }
    }
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
    saveVideoFile() {
        if (this.video) {
            this.video.saveVideo();
        }
    }
    sendToAll(subCMD, data, needRecord = true, excludeUserIDArray = []) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.sendToAll(define_1.gameCMD.MDM_GF_GAME, subCMD, data, excludeUserIDArray);
    }
    ;
    sendToWatcher(subCMD, data, needRecord = false) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.send2Watcher(define_1.gameCMD.MDM_GF_GAME, subCMD, data, []);
    }
    ;
    sendToPlayer(subCMD, chairID, data, needRecord = false) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.sendToPlayer(define_1.gameCMD.MDM_GF_GAME, subCMD, chairID, data);
    }
    ;
    writeGameEndInfo(players, gameEnd = {}) {
        if (this.getCurRound() == 1) {
            this.tableFrame.autoCostDiamond();
        }
        let replayCode = "";
        if (this.video) {
            replayCode = this.tableFrame.writeGameReplay(this.getCurRound(), this.video.getVideoRecord(), gameEnd);
            logger.info("回放数据", this.video.getVideoRecord());
        }
        let gameDetail = this.getGameDetailInfo(replayCode, players);
        this.gameDetailArray.push(gameDetail);
        logger.info("写入本局回放和结算", replayCode, gameDetail);
    }
    getBigEndInfo(players) {
        let { bigEndInfo } = this.getTotalInfo(players);
        return bigEndInfo;
    }
    getTotalInfo(players) {
        let totalScore = [];
        let bigEndInfo = [];
        for (let i = 0; i < players.length; ++i) {
            let userItem = this.tableFrame.getTableUserItem(i);
            let player = players[i];
            if (userItem && player) {
                totalScore[i] = player.score;
                bigEndInfo.push({
                    chairID: i,
                    userID: userItem.userID,
                    head: userItem.head,
                    nickname: userItem.nickname,
                    score: player.score,
                    gameID: userItem.gameID,
                });
            }
        }
        return { totalScore, bigEndInfo };
    }
    writeBattle(players, gameEndMsgArray = []) {
        let { totalScore } = this.getTotalInfo(players);
        this.tableFrame.writeGameResult2(totalScore, this.gameDetailArray, gameEndMsgArray);
    }
    getGameDetailInfo(replayCode, players) {
        let gameDetail = {
            replayCode,
            round: this.getCurRound(),
            time: ttutil_1.ttutil.getTimestamp(),
            score: [],
        };
        let playerInfo = [];
        for (let chairID = 0; chairID < players.length; ++chairID) {
            let userID = 0;
            let player = players[chairID];
            let userItem = this.tableFrame.getTableUserItem(chairID);
            if (userItem) {
                userID = userItem.userID;
                playerInfo.push([userID, player.singleScore]);
            }
        }
        gameDetail.score = playerInfo;
        return gameDetail;
    }
}
exports.IFangKaTableFrameSink = IFangKaTableFrameSink;
