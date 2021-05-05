"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("./define");
class ServerUserItem {
    constructor(session, gameServer) {
        this.userID = null;
        this.gameID = null;
        this.tableID = null;
        this.chairID = null;
        this.userStatus = define_1.gameConst.US_FREE;
        this.session = null;
        this.gameServer = null;
        this.score = 0;
        this.diamond = 0;
        this.nickname = "";
        this.sex = 0;
        this.isAndroid = 0;
        this.vipLevel = 0;
        this.weight = 1.0;
        this.otherInfo = null;
        this.markDelete = false;
        this.online = 0;
        this.offlineTs = 0;
        this.initialScore = 0;
        this.head = "http://5b0988e595225.cdn.sohucs.com/images/20171227/db32c56c1ca748968550ddcc48bd0a9e.jpeg";
        this.cards = [];
        this.session = session;
        this.gameServer = gameServer;
    }
    setInfo(info) {
        this.userID = info["userID"];
        this.gameID = info["gameID"];
        this.tableID = info["tableID"];
        this.chairID = info["chairID"];
        this.score = info["score"];
        this.diamond = info["diamond"];
        this.nickname = info["nickname"];
        this.sex = info["sex"];
        this.isAndroid = info["isAndroid"];
        this.vipLevel = info["vipLevel"];
        this.otherInfo = info["otherInfo"];
        this.head = info["head"];
        this.cards = info["cards"];
        this.weight = info["weight"] == null ? 1.0 : info["weight"];
        this.initialScore = info["initialScore"];
    }
    setUserStatus(userStatus, tableID, chairID) {
        var oldTableID = this.tableID;
        var oldChairID = this.chairID;
        var oldStatus = this.userStatus;
        this.tableID = tableID;
        this.chairID = chairID;
        this.userStatus = userStatus;
        this.gameServer.eventUserItemStatus(this, oldTableID, oldChairID, oldStatus);
    }
    setUserStatusNoNotify(userStatus, tableID, chairID) {
        this.tableID = tableID;
        this.chairID = chairID;
        this.userStatus = userStatus;
    }
    setUserScore(newScore) {
        this.score = newScore;
        this.gameServer.emit(define_1.gameEvent.EVENT_USER_SCORE, this);
    }
    getUserID() {
        return this.userID;
    }
    getNickname() {
        return this.nickname;
    }
    getSex() {
        return this.sex;
    }
    getChairID() {
        return this.chairID;
    }
    getTableID() {
        return this.tableID;
    }
    getUserScore() {
        return this.score;
    }
    getUserStatus() {
        return this.userStatus;
    }
    getvipLevel() {
        return this.vipLevel;
    }
    getOtherInfo() {
        return this.otherInfo;
    }
    getWeight() {
        return this.weight;
    }
    setWeight(weight) {
        this.weight = weight;
    }
    isWatcher() {
        return this.chairID == 0xFFFF;
    }
    ;
}
exports.ServerUserItem = ServerUserItem;
