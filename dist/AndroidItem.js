"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("./define");
const events = require('events');
class AndroidItem extends events.EventEmitter {
    constructor(serverUserItem, androidUserMNG) {
        super();
        this.serverUserItem = null;
        this.androidUserManager = null;
        this.gameStatus = define_1.gameConst.GAME_STATUS_FREE;
        this.androidUserSink = null;
        this.serverUserItem = serverUserItem;
        this.androidUserManager = androidUserMNG;
        this.gameStatus = define_1.gameConst.GAME_STATUS_FREE;
        this.androidUserSink = new AndroidUserSink(this);
        this.on(define_1.gameEvent.EVENT_ANDROID, this.onSocketEvent.bind(this));
    }
    getUserID() {
        return this.serverUserItem.getUserID();
    }
    ;
    getTableID() {
        return this.serverUserItem.getTableID();
    }
    ;
    getChairID() {
        return this.serverUserItem.getChairID();
    }
    ;
    getMeUserItem() {
        return this.serverUserItem;
    }
    ;
    sendSocketData(subCMD, data) {
        this.androidUserManager.sendDataToServer(this.serverUserItem, define_1.gameCMD.MDM_GF_GAME, subCMD, data);
        return true;
    }
    ;
    sendUserReady(data) {
        this.androidUserManager.sendDataToServer(this.serverUserItem, define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_USER_READY, data);
    }
    ;
    sendUserStandUp() {
        this.androidUserManager.sendDataToServer(this.serverUserItem, define_1.gameCMD.MDM_GR_USER, define_1.gameCMD.SUB_GR_USER_STANDUP, null);
    }
    ;
    sendAgreeDismiss() {
        this.androidUserManager.sendDataToServer(this.serverUserItem, define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_DISMISS_AGREE, { agree: 1 });
    }
    ;
    clearAllTimer() {
        this.androidUserSink.clearAllTimer();
        return true;
    }
    ;
    startGameClient() {
        this.androidUserManager.sendDataToServer(this.serverUserItem, define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_GAME_OPTION, null);
    }
    ;
    onSocketEvent(mainCMD, subCMD, data) {
        switch (mainCMD) {
            case define_1.gameCMD.MDM_GR_LOGON:
                this.onSocketMainLogon(subCMD, data);
                return true;
            case define_1.gameCMD.MDM_GR_USER:
                this.onSocketMainUser(subCMD, data);
                return true;
            case define_1.gameCMD.MDM_GF_GAME:
                this.onSocketMainGame(subCMD, data);
                return true;
            case define_1.gameCMD.MDM_GF_FRAME:
                this.onSocketMainFrame(subCMD, data);
                return true;
            default:
                return true;
        }
        return true;
    }
    ;
    onSocketMainLogon(subCMD, data) {
        switch (subCMD) {
            case define_1.gameCMD.SUB_GR_LOGON_SUCCESS:
                this.startGameClient();
                break;
        }
    }
    ;
    onSocketMainUser(subCMD, data) {
        switch (subCMD) {
            case define_1.gameCMD.SUB_GR_USER_ENTER:
                return true;
            case define_1.gameCMD.SUB_GR_USER_STATUS:
                return true;
            default:
                return true;
        }
    }
    ;
    onSocketMainGame(subCMD, data) {
        return this.androidUserSink.onEventGameMessage(subCMD, data);
    }
    ;
    onSocketMainFrame(subCMD, data) {
        switch (subCMD) {
            case define_1.gameCMD.SUB_GF_GAME_SCENE:
                this.androidUserSink.onEventSceneMessage(this.gameStatus, data);
                return true;
            case define_1.gameCMD.SUB_GF_GAME_STATUS:
                this.gameStatus = data["gameStatus"];
                return true;
            case define_1.gameCMD.SUB_GF_DISMISS_START:
                let second = Math.floor(Math.random() * 5.5) + 1;
                setTimeout(() => {
                    this.sendAgreeDismiss();
                }, second * 1000);
                return true;
        }
    }
    ;
}
exports.AndroidItem = AndroidItem;
