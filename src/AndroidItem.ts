
import { gameConst, gameEvent, gameCMD } from "./define";
import {AndroidManager} from "./AndroidManager";
import {ServerUserItem} from "./ServerUserItem";
import {IAndroidUserSink} from "./IAndroidUserSink";
const events = require('events');

export  class AndroidItem extends events.EventEmitter {
    serverUserItem: ServerUserItem = null;
    androidUserManager: AndroidManager = null;
    gameStatus = gameConst.GAME_STATUS_FREE;
    androidUserSink: IAndroidUserSink = null;

    constructor(serverUserItem, androidUserMNG) {
        super()
        this.serverUserItem = serverUserItem;
        this.androidUserManager = androidUserMNG;
        this.gameStatus = gameConst.GAME_STATUS_FREE;
        this.androidUserSink = new AndroidUserSink(this);
        this.on(gameEvent.EVENT_ANDROID, this.onSocketEvent.bind(this))
    }


    /**
     * 获取用户ID
     * @returns {*|String}
     */
    getUserID() {
        return this.serverUserItem.getUserID();
    };
    /**
     * 获取桌子号
     * @returns {*}
     */
    getTableID() {
        return this.serverUserItem.getTableID();
    };
    /**
     * 获取椅子号
     * @returns {*}
     */
    getChairID() {
        return this.serverUserItem.getChairID();
    };
    /**
     * 获取自己
     * @returns {*}
     */
    getMeUserItem() {
        return this.serverUserItem;
    };
    /**
     * 发送数据
     * @param subCMD
     * @param data
     * @returns {boolean}
     */
    sendSocketData(subCMD, data) {
        this.androidUserManager.sendDataToServer(this.serverUserItem, gameCMD.MDM_GF_GAME, subCMD, data);
        return true;
    };
    /**
     * 发送准备
     * @param data
     * @returns {boolean}
     */
    sendUserReady(data) {

        this.androidUserManager.sendDataToServer(this.serverUserItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_USER_READY, data);
    };

    /**
     * 发送自己起立
     */
    sendUserStandUp() {
        this.androidUserManager.sendDataToServer(this.serverUserItem, gameCMD.MDM_GR_USER, gameCMD.SUB_GR_USER_STANDUP, null);
    };

    /**
     * 发送同意解散
     */
    sendAgreeDismiss() {

        this.androidUserManager.sendDataToServer(this.serverUserItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_DISMISS_AGREE, { agree: 1 });
    };

    /**
     * 清除所有定时器
     * @returns {boolean}
     */
    clearAllTimer() {
        this.androidUserSink.clearAllTimer();
        return true;
    };
    /**
     * 启动游戏
     */
    startGameClient() {
        this.androidUserManager.sendDataToServer(this.serverUserItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_GAME_OPTION, null);
    };

    /**
     * 网络消息
     * @param mainCMD
     * @param subCMD
     * @param data
     * @returns {boolean}
     */
    onSocketEvent(mainCMD, subCMD, data) {
        switch (mainCMD) {
            case gameCMD.MDM_GR_LOGON:
                this.onSocketMainLogon(subCMD, data);
                return true;

            case gameCMD.MDM_GR_USER:
                this.onSocketMainUser(subCMD, data);
                return true;

            case gameCMD.MDM_GF_GAME:
                this.onSocketMainGame(subCMD, data);
                return true;

            case gameCMD.MDM_GF_FRAME:
                this.onSocketMainFrame(subCMD, data);
                return true;

            default:
                return true;
        }

        return true;
    };
    /**
     * 登录事件
     * @param subCMD
     * @param data
     */
    onSocketMainLogon(subCMD, data) {
        switch (subCMD) {
            case gameCMD.SUB_GR_LOGON_SUCCESS:
                this.startGameClient();
                break;
        }
    };
    /**
     * 用户事件
     * @param subCMD
     * @param data
     * @returns {boolean}
     */
    onSocketMainUser(subCMD, data) {
        switch (subCMD) {
            case gameCMD.SUB_GR_USER_ENTER:
                return true;
            case gameCMD.SUB_GR_USER_STATUS:
                return true;

            default:
                return true;
        }
    };
    /**
     * 游戏事件
     * @param subCMD
     * @param data
     * @returns {boolean}
     */
    onSocketMainGame(subCMD, data) {
        return this.androidUserSink.onEventGameMessage(subCMD, data);
    };
    /**
     * 框架事件
     * @param subCMD
     * @param data
     * @returns {boolean}
     */
    onSocketMainFrame(subCMD, data) {
        switch (subCMD) {
            case gameCMD.SUB_GF_GAME_SCENE:

                this.androidUserSink.onEventSceneMessage(this.gameStatus, data);
                return true;

            case gameCMD.SUB_GF_GAME_STATUS:
                this.gameStatus = data["gameStatus"];
                return true;

            case gameCMD.SUB_GF_DISMISS_START: //解散
                let second = Math.floor(Math.random() * 5.5) + 1 //随机五秒内
                setTimeout(() => {
                    this.sendAgreeDismiss()
                }, second * 1000)
                return true;

        }
    };
}

