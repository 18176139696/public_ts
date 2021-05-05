"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("./define");
const DisMiss_1 = require("./DisMiss");
const ttutil_1 = require("./ttutil");
const ServerUserItem_1 = require("./ServerUserItem");
class TableFrame {
    constructor(id, roomInfo, gameServer) {
        this.tableID = 0;
        this.tableUserArray = [];
        this.tableWatcherMap = {};
        this.gameStatus = define_1.gameConst.GAME_STATUS_FREE;
        this.chairCount = 0;
        this.gameStart = false;
        this.gameMode = 0;
        this.REVENUE_DENOMINATOR = 1000;
        this.roomInfo = {};
        this.tableSetting = null;
        this.gameServer = null;
        this.tableFrameSink = null;
        this.dismiss = null;
        this.startTime = 0;
        this.kickoutTimer = null;
        this.kickoutEndTime = 0;
        this.tableID = id;
        this.chairCount = roomInfo["ChairCount"];
        this.gameMode = roomInfo["GameMode"];
        this.roomInfo = roomInfo;
        this.gameServer = gameServer;
        this.tableFrameSink = new TableFrameSink(this, this.roomInfo);
        if (gameconfig.Dismiss) {
            this.dismiss = new DisMiss_1.DisMiss(this);
        }
    }
    setTableUserData(config) {
        this.tableSetting = config;
        this.tableFrameSink && this.tableFrameSink.setTableUserData && this.tableFrameSink.setTableUserData();
    }
    ;
    getTableUserData() {
        if (gameconfig.GoldMode) {
            return gameconfig.tableUserData || {};
        }
        return this.tableSetting || {};
    }
    ;
    getUserSetChairCount() {
        let tableSetting = this.getTableUserData();
        if (tableSetting && tableSetting.playerCount && tableSetting.playerCount > 1) {
            return tableSetting.playerCount;
        }
        return this.chairCount;
    }
    ;
    getCurPlayerNum() {
        var userCount = 0;
        for (var i = 0; i < this.chairCount; ++i) {
            var userItem = this.tableUserArray[i];
            if (userItem == null)
                continue;
            userCount++;
        }
        return userCount;
    }
    ;
    getRoomInfo() {
        return this.roomInfo;
    }
    ;
    startGame() {
        if (!this.gameStart && this.gameMode != define_1.gameConst.START_MODE_HUNDRED) {
            for (var i = 0; i < this.chairCount; ++i) {
                var userItem = this.getTableUserItem(i);
                if (userItem != null) {
                    var userStatus = userItem.getUserStatus();
                    if (userStatus != define_1.gameConst.US_PLAYING) {
                        userItem.setUserStatus(define_1.gameConst.US_PLAYING, this.tableID, i);
                    }
                }
            }
        }
        this.recordStartGameTime();
        this.gameStart = true;
        this.stopCloseTimer();
        this.sendKickoutPackate(null, true);
        this.tableFrameSink.onEventStartGame();
        this.sendTableStartData();
    }
    ;
    concludeGame(gameStatus) {
        this.gameStart = false;
        this.gameStatus = gameStatus;
        for (var i = 0; i < this.chairCount; ++i) {
            var userItem = this.tableUserArray[i];
            if (!userItem) {
                continue;
            }
            userItem.setUserStatus(define_1.gameConst.US_SIT, this.tableID, i);
        }
        this.tableFrameSink.repositionSink();
        this.sendTableStatus();
    }
    ;
    sendTableStatus() {
        this.broadCastTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_GAME_STATUS, null, {
            gameStatus: this.gameStatus
        });
    }
    ;
    dismissGame() {
    }
    ;
    onUserOffline(userItem) {
        if (userItem instanceof ServerUserItem_1.ServerUserItem == false) {
            logger.error("performOfflineAction: userItem not instanceof ServerUserItem");
            return false;
        }
        var chairID = userItem.chairID;
        if (chairID >= this.chairCount) {
            logger.error("performOfflineAction: chairID >= ", this.chairCount);
            return false;
        }
        if (userItem.tableID == null)
            return;
        if (userItem.chairID == null)
            return;
        logger.info("用户掉线, 用户ID: " + userItem.getUserID());
        this.setUserOnline(userItem, define_1.gameConst.ONLINE_DEF_OFFLINE);
        if (this.tableFrameSink.onActionOffline) {
            this.tableFrameSink.onActionOffline(chairID, userItem);
        }
        return true;
    }
    ;
    onUserRelogin(userItem) {
        logger.info("玩家重新登录", userItem.nickname, userItem.online);
        this.setUserOnline(userItem, define_1.gameConst.ONLINE_DEF_ONLINE);
        return true;
    }
    ;
    getCurRound() {
        let round = 0;
        if (this.dismiss && this.tableFrameSink.getCurRound && this.tableFrameSink.getCurRound() > 0) {
            round = this.tableFrameSink.getCurRound();
        }
        return round;
    }
    ;
    checkStandup(userItem) {
        if (this.tableFrameSink.checkStandup) {
            return this.tableFrameSink.checkStandup(userItem);
        }
        return true;
    }
    ;
    onUserStandUp(userItem) {
        if (userItem && userItem.isWatcher()) {
            this.gameServer.deleteUserItem(userItem);
            return;
        }
        let round = this.getCurRound();
        if (round > 0) {
            logger.info("onUserStandUp:round,", round);
            logger.info("请求解散", userItem.nickname, userItem.userID);
            this.dismiss.onUserDismissReq(userItem);
            return { code: 0, info: "正在解散" };
        }
        else if (!this.checkStandup(userItem)) {
            return { code: 2, info: "您当前正在游戏,还不能退出" };
        }
        else {
            this.gameServer.deleteUserItem(userItem);
            return { code: 0, info: "退出成功" };
        }
    }
    onAdminJiesan() {
        let round = this.getCurRound();
        logger.info("强制解散:round,", round);
        if (round > 0) {
            this.tableFrameSink.onEventConcludeGame(null, null, define_1.gameConst.GER_DISMISS);
        }
        else {
            for (let i = 0; i < this.getUserSetChairCount(); ++i) {
                let userItem = this.getTableUserItem(i);
                if (userItem) {
                    this.gameServer.deleteUserItem(userItem);
                }
            }
        }
    }
    ;
    performSitDownAction(chairID, userItem) {
        if (userItem instanceof ServerUserItem_1.ServerUserItem == false) {
            logger.error("performSitDownAction: userItem not instanceof ServerUserItem");
            return false;
        }
        if (chairID >= this.chairCount) {
            logger.error("performSitDownAction: chairID >= this.chairCount");
            return false;
        }
        if (userItem.tableID == null)
            return;
        if (userItem.chairID == null)
            return;
        var tableUserItem = this.getTableUserItem(chairID);
        if (tableUserItem != null) {
            logger.info("椅子已经被捷足先登");
            logger.info("椅子上的ID: " + tableUserItem.getUserID() + " 昵称: " + tableUserItem.getNickname() + " 是否为机器人: " + tableUserItem.isAndroid);
            this.gameServer.sendRequestFailure(userItem, "椅子已经被捷足先登");
            return false;
        }
        this.tableUserArray[chairID] = userItem;
        userItem.setUserStatus(define_1.gameConst.US_SIT, this.tableID, chairID);
        this.tableFrameSink.onActionUserSitDown(chairID, userItem);
        logger.info(`用户坐下成功: userID=${userItem.getUserID()} ,nickname=${userItem.nickname}, 
                tableID=${this.tableID}, chairID=${chairID}`);
        return true;
    }
    ;
    performStandUpActionNotNotifyPlaza(userItem) {
        if (userItem && userItem.isWatcher()) {
            delete this.getWatcher()[userItem.userID];
            return true;
        }
        if (userItem instanceof ServerUserItem_1.ServerUserItem == false) {
            logger.error("userItem not instanceof ServerUserItem");
            return true;
        }
        logger.info("performStandUpActionNotNotifyPlaza, 用户ID: " + userItem.getUserID());
        if (userItem.tableID != this.tableID)
            return true;
        if (userItem.chairID >= this.chairCount)
            return true;
        var tableUserItem = this.getTableUserItem(userItem.chairID);
        if (this.gameStart && userItem.userStatus == define_1.gameConst.US_PLAYING) {
            this.tableFrameSink.onEventConcludeGame(userItem.chairID, userItem, define_1.gameConst.GER_USER_LEAVE);
            if (this.tableUserArray[userItem.chairID] != userItem)
                return true;
        }
        if (tableUserItem == userItem) {
            this.tableFrameSink.onActionUserStandUp(userItem.chairID, userItem);
            this.tableUserArray[userItem.chairID] = null;
            if (this.efficacyStartGame()) {
                this.startGame();
            }
        }
        return true;
    }
    ;
    getSitUserCount() {
        var userCount = 0;
        for (var i = 0; i < this.chairCount; ++i) {
            if (this.getTableUserItem(i)) {
                userCount++;
            }
        }
        return userCount;
    }
    ;
    getTableUserItem(chairID) {
        if (chairID >= this.chairCount)
            return null;
        return this.tableUserArray[chairID];
    }
    ;
    setGameStatus(gameStatus) {
        this.gameStatus = gameStatus;
    }
    ;
    getGameStatus() {
        return this.gameStatus;
    }
    ;
    getFreeChairID() {
        for (var i = 0; i < this.getUserSetChairCount(); ++i) {
            if (this.tableUserArray[i] == null)
                return i;
        }
        return null;
    }
    ;
    getChairInfoArray() {
        let info = [];
        for (var i = 0; i < this.getUserSetChairCount(); ++i) {
            let userItem = this.getTableUserItem(i);
            if (userItem) {
                info.push(i);
                info.push(userItem.chairID);
            }
        }
        return info;
    }
    ;
    onEventSocketGame(subCMD, data, userItem) {
        if (userItem == null)
            return false;
        if (this.tableFrameSink == null)
            return false;
        return this.tableFrameSink.onGameMessageEvent(subCMD, data, userItem);
    }
    ;
    onEventSocketFrame(subCMD, data, userItem) {
        logger.info("tableFrame::onEventSocketFrame", userItem.nickname);
        switch (subCMD) {
            case define_1.gameCMD.SUB_GF_GAME_OPTION:
                var chairID = userItem.getChairID();
                this.gameServer.sendData(userItem, define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_GAME_STATUS, {
                    gameStatus: this.gameStatus
                });
                this.sendKickoutPackate(chairID);
                this.tableFrameSink.onEventSendGameScene(chairID, userItem, this.gameStatus);
                return true;
            case define_1.gameCMD.SUB_GF_USER_READY:
                var chairID = userItem.getChairID();
                if (this.getTableUserItem(chairID) != userItem) {
                    return false;
                }
                if (userItem.getUserStatus() != define_1.gameConst.US_SIT) {
                    return true;
                }
                if (!this.efficacyStartGame()) {
                    userItem.setUserStatus(define_1.gameConst.US_READY, this.tableID, chairID);
                }
                else {
                    this.startGame();
                }
                return true;
            case define_1.gameCMD.SUB_GF_CANCEL_USER_READY:
                var chairID = userItem.getChairID();
                if (this.getTableUserItem(chairID) != userItem) {
                    return false;
                }
                if (userItem.getUserStatus() != define_1.gameConst.US_READY) {
                    return true;
                }
                userItem.setUserStatus(define_1.gameConst.US_SIT, this.tableID, chairID);
                this.tableFrameSink.onUserCancelReady(chairID, userItem);
                return true;
            case define_1.gameCMD.SUB_GF_USER_CHAT:
                this.onUserChat(userItem, data);
                return true;
            case define_1.gameCMD.SUB_GF_DISMISS_AGREE:
                logger.info("用户同意解散", data);
                this.dismiss.onDismissAgree(userItem, data.agree);
                return true;
            case define_1.gameCMD.SUB_GF_USE_ITEM:
                logger.info("使用道具", data);
                const { item_id, item_num = 1, userID, gameID } = data;
                this.broadCastTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_USE_ITEM, null, { from: userItem.gameID, item_id, to: gameID });
                return true;
        }
        return false;
    }
    ;
    efficacyStartGame() {
        if (this.gameStart || this.gameMode == define_1.gameConst.START_MODE_HUNDRED)
            return false;
        var userCount = 0;
        for (var i = 0; i < this.chairCount; ++i) {
            var userItem = this.tableUserArray[i];
            if (userItem == null)
                continue;
            if (userItem.userStatus != define_1.gameConst.US_READY)
                return false;
            userCount++;
        }
        switch (Number(this.gameMode)) {
            case define_1.gameConst.START_MODE_ALL_READY:
                return this.tableFrameSink.canStartGame(userCount);
            case define_1.gameConst.START_MODE_FULL_READY:
                return userCount == this.getUserSetChairCount();
            case define_1.gameConst.START_MODE_HUNDRED:
            default:
                return false;
        }
        return false;
    }
    ;
    recordStartGameTime() {
        var date = new Date();
        this.startTime = date.getTime();
    }
    ;
    getGameTime() {
        var date = new Date();
        var passTime = Math.floor((date.getTime() - this.startTime) / 1000);
        return passTime;
    }
    ;
    broadCastTableData(mainCMD, subCMD, chairID, data) {
        this.sendTableData(mainCMD, subCMD, chairID, data);
    }
    ;
    sendTableData(mainCMD, subCMD, chairID, data, excludeIDs = null) {
        if (chairID == null) {
            this.sendToAll(mainCMD, subCMD, data, excludeIDs);
            return true;
        }
        else {
            this.sendToPlayer(mainCMD, subCMD, chairID, data);
            return true;
        }
    }
    ;
    sendToAll(mainCMD, subCMD, data, excludeUserIDArray = [], includeWatcher = true) {
        for (var i = 0; i < this.chairCount; ++i) {
            var userItem = this.getTableUserItem(i);
            if (userItem == null)
                continue;
            if (excludeUserIDArray && excludeUserIDArray.length > 0 && excludeUserIDArray.indexOf(userItem.userID) > -1) {
                continue;
            }
            this.gameServer.sendData(userItem, mainCMD, subCMD, data);
        }
        if (includeWatcher) {
            this.send2Watcher(mainCMD, subCMD, data, excludeUserIDArray);
        }
        ;
        return true;
    }
    sendToPlayer(mainCMD, subCMD, chairID, data) {
        var userItem = this.getTableUserItem(chairID);
        if (userItem == null)
            return true;
        this.gameServer.sendData(userItem, mainCMD, subCMD, data);
        return true;
    }
    send2Watcher(mainCMD, subCMD, data, excludeUserIDArray) {
        let watchers = this.getWatcher();
        for (var userID in watchers) {
            let userItem = watchers[userID];
            if (excludeUserIDArray && excludeUserIDArray.length > 0 && excludeUserIDArray.indexOf(userItem.userID) > -1) {
                continue;
            }
            this.gameServer.sendData(userItem, mainCMD, subCMD, data);
        }
    }
    ;
    sendGameScene(userItem, msg) {
        if (userItem == null)
            return false;
        this.gameServer.sendData(userItem, define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_GAME_SCENE, msg);
        return true;
    }
    ;
    writeTableScore(scoreInfoArray) {
        for (var i in scoreInfoArray) {
            this.writeUserScore(scoreInfoArray[i]);
        }
        return true;
    }
    ;
    writeUserScore(scoreInfo) {
        if (scoreInfo.Chair >= this.chairCount) {
            logger.error("大BUG   writeUserScore scoreInfo.Chair >= this.chairCount", scoreInfo);
            this.gameServer.recordError("写分BUG", "writeUserScore scoreInfo.Chair >= this.chairCount scoreInfo:" + JSON.stringify(scoreInfo));
            return false;
        }
        var userItem = this.getTableUserItem(scoreInfo.Chair);
        if (userItem == null) {
            logger.error("大BUG   writeUserScore userItem==null", scoreInfo);
            this.gameServer.recordError("写分BUG", "writeUserScore userItem==null scoreInfo" + JSON.stringify(scoreInfo));
            return false;
        }
        var o = {};
        o.userID = userItem.getUserID();
        o.score = scoreInfo.Score;
        o.tax = scoreInfo.Tax;
        o.tableID = this.tableID;
        o.chairID = userItem.getChairID();
        userItem.setUserScore(userItem.getUserScore() + o.score);
        if (userItem.score < 0) {
            logger.error("大BUG   writeUserScore 用户分数为负", userItem.userID, userItem.score, scoreInfo);
            this.gameServer.recordError("写分BUG", `userID:${userItem.userID}, score:${userItem.score}, scoreInfo:${scoreInfo}`);
        }
        if (!gameconfig.FreeMode) {
            this.gameServer.sendLCData(define_1.corresCMD.WRITE_SCORE, o);
            return o;
        }
        return false;
    }
    ;
    bulkWriteScore(scoreArray) {
        this.gameServer.sendLCData(define_1.corresCMD.WRITE_SCORE, scoreArray);
    }
    ;
    writeDiamond(userID, diamond, desc) {
        if (!gameconfig.FreeMode) {
            this.gameServer.sendLCData(define_1.corresCMD.WRITE_DIAMOND, { userID, diamond, desc });
        }
    }
    ;
    autoCostDiamond() {
        if (!gameconfig.FreeMode) {
            let tableSetting = this.getTableUserData();
            let playersArray = [];
            for (let i = 0; i < this.getUserSetChairCount(); ++i) {
                let userItem = this.getTableUserItem(i);
                if (userItem) {
                    playersArray.push(userItem.userID);
                }
            }
            this.gameServer.sendLCData(define_1.corresCMD.COST_DIAMOND, { tableSetting, userIDs: playersArray });
            logger.info("开始扣费", { tableSetting, userIDs: playersArray });
        }
    }
    ;
    costDiamond() {
        logger.error("这个接口废弃掉了，不需要再调用，第一局系统会自动调用扣费");
        return;
    }
    ;
    writeScoreArray(infoArray) {
        if (!gameconfig.FreeMode) {
            this.gameServer.sendLCData(define_1.corresCMD.WRITE_SCORE_NEW, infoArray);
        }
    }
    ;
    checkUserScore(chairID) {
        var userItem = this.getTableUserItem(chairID);
        if (userItem == null)
            return false;
        var score = userItem.getUserScore();
        if (score < this.roomInfo.MinSitScore) {
            this.gameServer.sendRequestFailure(userItem, "您的分数不够继续游戏，请关闭游戏窗口", define_1.gameConst.KICK_TYPE);
            this.gameServer.deleteUserItem(userItem, true);
        }
    }
    ;
    checkTableUsersScore() {
        for (var i = 0; i < this.chairCount; ++i) {
            this.checkUserScore(i);
        }
        return true;
    }
    ;
    sendFishNotice(data) {
        var o = {};
        o.data = data || {};
        o.data.gameName = this.roomInfo.GameName;
        o.data.roomName = this.roomInfo.RoomName;
        o.data.tableID = this.tableID;
        this.gameServer.onSubGameNotice(o);
    }
    ;
    calculateRevenue(chair, score, isSysBanker = false) {
        if (isSysBanker) {
            var revenue = score * this.roomInfo["Revenue"] / this.REVENUE_DENOMINATOR;
            return Math.floor(revenue);
        }
        if (chair >= this.chairCount)
            return 0;
        if (this.roomInfo["Revenue"] > 0 && score > 0) {
            var userItem = this.getTableUserItem(chair);
            if (userItem == null)
                return 0;
            var revenue = score * this.roomInfo["Revenue"] / this.REVENUE_DENOMINATOR;
            return Math.floor(revenue);
        }
        return 0;
    }
    ;
    sendTableUserItemData(userItem, subCMD, data) {
        if (!userItem)
            return false;
        if (this.tableID != userItem.getTableID())
            return false;
        this.gameServer.sendData(userItem, define_1.gameCMD.MDM_GF_GAME, subCMD, data);
        return true;
    }
    ;
    kickOutUserItem(chairID, msg, type) {
        var userItem = this.getTableUserItem(chairID);
        if (userItem == null)
            return;
        this.gameServer.sendRequestFailure(userItem, msg, type);
        this.gameServer.deleteUserItem(userItem, true);
    }
    ;
    getRoomInfoPackage() {
        let tableSetting = this.getTableUserData();
        if (tableSetting) {
            tableSetting.round = this.getCurRound();
        }
        let msg = {
            gameName: this.roomInfo.GameName,
            roomName: this.roomInfo.RoomName,
            tableID: this.tableID,
            chairCount: this.getUserSetChairCount(),
            tableSetting
        };
        if (this.dismiss && this.dismiss.getLeftTime() > 0) {
            msg.dismissData = this.dismiss.getDismissData();
        }
        return msg;
    }
    ;
    getUserInfoPacakge(serverUserItem) {
        let userInfo = [];
        var copyAttr = (userItem) => {
            return {
                userID: userItem.userID,
                gameID: userItem.gameID,
                tableID: userItem.tableID,
                chairID: userItem.chairID,
                nickname: userItem.nickname,
                sex: userItem.sex,
                score: userItem.score,
                userStatus: userItem.userStatus,
                vipLevel: userItem.vipLevel,
                otherInfo: userItem.otherInfo,
                head: userItem.head,
                online: userItem.online,
            };
        };
        userInfo.push(copyAttr(serverUserItem));
        for (var i = 0; i < this.getUserSetChairCount(); ++i) {
            var userItem = this.getTableUserItem(i);
            if (userItem == null || userItem == serverUserItem)
                continue;
            userInfo.push(copyAttr(userItem));
        }
        let watchers = this.getWatcher();
        for (var userID in watchers) {
            let watchUser = watchers[userID];
            if (watchUser.userID == serverUserItem.userID) {
                continue;
            }
            userInfo.push(copyAttr(watchUser));
        }
        return userInfo;
    }
    ;
    onUserChat(userItem, data) {
        var nickname = userItem.nickname;
        var chairID = userItem.chairID;
        var text = data.text;
        logger.info("onUserChat", data);
        this.broadCastTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_USER_CHAT, null, {
            nickname,
            chairID,
            text
        });
    }
    ;
    kickoutAllUser(notify = true) {
        logger.info("踢掉所有人");
        for (var i = 0; i < this.chairCount; i++) {
            var chairID = i;
            var userItem = this.getTableUserItem(chairID);
            if (userItem) {
                this.gameServer.deleteUserItem(userItem, notify);
            }
        }
        let watchers = this.getWatcher();
        for (let userID in watchers) {
            let userItem = watchers[userID];
            if (userItem) {
                this.gameServer.deleteUserItem(userItem, notify);
            }
        }
    }
    ;
    setUserOnline(userItem, online) {
        userItem.online = online;
        this.sendTableData(define_1.gameCMD.MDM_GR_USER, define_1.gameCMD.SUB_GR_USER_ONLINE, null, {
            chairID: userItem.chairID,
            online: userItem.online
        });
        if (online == define_1.gameConst.ONLINE_DEF_ONLINE) {
            userItem.offlineTs = 0;
        }
        else {
            userItem.offlineTs = Date.now();
        }
    }
    ;
    addWatcher(userItem) {
        this.tableWatcherMap[userItem.userID] = userItem;
    }
    ;
    getWatcher() {
        return this.tableWatcherMap;
    }
    ;
    startCloseTimer() {
        if (gameconfig.AutoKickoutTime) {
            this.stopCloseTimer();
            this.kickoutEndTime = Math.floor(Date.now() / 1000) + gameconfig.AutoKickoutTime;
            logger.error("startCloseTimer", this.kickoutEndTime);
            this.kickoutTimer = setTimeout(() => {
                this.kickoutTimer = null;
                this.kickoutAllUser();
            }, gameconfig.AutoKickoutTime * 1000);
        }
    }
    ;
    stopCloseTimer() {
        if (gameconfig.AutoKickoutTime) {
            this.kickoutTimer && clearTimeout(this.kickoutTimer);
            this.kickoutTimer = null;
        }
    }
    ;
    getKickoutLeftTime() {
        return this.kickoutEndTime - Math.floor(Date.now() / 1000);
    }
    ;
    sendKickoutPackate(chairID, isClose = false) {
        if (gameconfig.AutoKickoutTime) {
            let dialogName = "AutoCloseRoom";
            if (isClose) {
                this.sendDialogCMD(chairID, { isClose: isClose, dialogName });
            }
            else {
                if (this.kickoutTimer) {
                    let leftTime = this.getKickoutLeftTime();
                    let dialogData = { dialogName, leftTime };
                    this.sendDialogCMD(chairID, dialogData);
                }
            }
        }
    }
    ;
    sendDialogCMD(chairID, dialogData) {
        this.sendTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_CMD_DIALOG, chairID, dialogData);
    }
    ;
    getTablePlayers() {
        let chairInfo = [];
        for (var i = 0; i < this.chairCount; i++) {
            var chairID = i;
            var userItem = this.getTableUserItem(chairID);
            if (userItem) {
                chairInfo[chairID] = userItem.userID;
            }
        }
        return chairInfo;
    }
    ;
    getPlayerArray() {
        let playerArray = [];
        for (let i = 0; i < this.getUserSetChairCount(); ++i) {
            let userItem = this.getTableUserItem(i);
            if (userItem) {
                playerArray.push(userItem);
            }
        }
        return playerArray;
    }
    writeGameResult2(totalScore, gameDetailArray, gameEndMsgArray = []) {
        let playerArray = this.getPlayerArray();
        this.writeGameResultForCustom(playerArray, totalScore, gameEndMsgArray, gameDetailArray);
    }
    writeGameResult(totalScore, gameResultArray) {
        let playerArray = this.getPlayerArray();
        this.writeGameResultForCustom(playerArray, totalScore, gameResultArray);
    }
    ;
    writeGameResultForCustom(playerArray, totalScore, gameResultArray, gameDetailArray = []) {
        try {
            let tableSetting = this.getTableUserData();
            let uuid = ttutil_1.ttutil.getUUID();
            let roomID = this.roomInfo.RoomID;
            let timestamp = ttutil_1.ttutil.getTimestamp();
            let { roomCode, clubID, baoxID, } = tableSetting;
            let playerResult = [];
            let playersArray = [];
            let clubScoreInfoArray = [];
            let biggestScore = 0;
            let sortScore = totalScore.slice(0).sort((a, b) => { return b - a; });
            if (sortScore.length > 0) {
                biggestScore = sortScore[0];
            }
            let bigWinnerUserID = 0;
            for (let i = 0; i < playerArray.length; ++i) {
                let userItem = playerArray[i];
                if (userItem) {
                    let { userID, gameID, nickname, head, diamond } = userItem;
                    let score = totalScore[i] || 0;
                    let bigWinner = 0;
                    if (score == biggestScore) {
                        bigWinner = 1;
                        bigWinnerUserID = userID;
                    }
                    playersArray.push({ chairID: i, userID, gameID, nickname, head, score, diamond, bigWinner });
                    clubScoreInfoArray.push({ clubID, userID, score, baoxID, bigWinner });
                    let item = { userID, uuid, roomID, score, timestamp, clubID, bigWinner };
                    playerResult.push(JSON.stringify(item));
                }
            }
            let players = JSON.stringify(playersArray);
            let json = JSON.stringify(gameResultArray);
            let totalScore_str = JSON.stringify(totalScore);
            let tableSetting_str = JSON.stringify(tableSetting);
            let gameDetail_str = JSON.stringify(gameDetailArray);
            let writeData = {
                uuid, roomID, baoxID, roomCode, clubID,
                gameName: this.roomInfo.RoomName,
                moduleEnName: this.roomInfo.moduleEnName,
                timestamp, bigWinner: bigWinnerUserID,
                tableSetting: tableSetting_str, players, score: totalScore_str, json,
                gameDetail: gameDetail_str
            };
            if (clubID) {
                this.gameServer.sendLCData(define_1.corresCMD.SAVE_CLUB_SCORE, { tableSetting, clubScoreInfoArray });
            }
            this.gameServer.send2LogServer("game_result", JSON.stringify(writeData));
            this.gameServer.send2LogServer("player_game_result", playerResult);
        }
        catch (err) {
            logger.error("totalScore", totalScore);
            logger.error("gameResultArray", gameResultArray);
            logger.error("写入战绩错误", err);
        }
    }
    ;
    writeGameReplay(round, replayData, gameEndInfo = {}) {
        if (this.getGameStatus() == define_1.gameConst.GAME_STATUS_FREE)
            return;
        try {
            let tableSetting = this.getTableUserData() || {};
            let players = this.getPlayerInfoArray();
            let { roomCode, clubID, baoxID } = tableSetting;
            let roomID = this.roomInfo.RoomID;
            let timestamp = ttutil_1.ttutil.getTimestamp();
            let randomNum = Math.floor(Math.random() * 900000) + 100000;
            let uuid = `${roomCode}_${round}_${timestamp}_${randomNum}`;
            let gameResult = {
                moduleEnName: this.roomInfo.moduleEnName,
                uuid, roomID, roomCode, clubID, round, timestamp,
                tableSetting: JSON.stringify(tableSetting),
                players: JSON.stringify(players),
                json: JSON.stringify(replayData),
                gameEndInfo: JSON.stringify(gameEndInfo)
            };
            this.gameServer.send2LogServer("game_replay", JSON.stringify(gameResult));
            return uuid;
        }
        catch (err) {
            logger.error("写入战绩错误", err);
        }
    }
    ;
    getPlayerInfoArray() {
        let playersArray = [];
        for (let i = 0; i < this.getUserSetChairCount(); ++i) {
            let userItem = this.getTableUserItem(i);
            if (userItem) {
                let { userID, gameID, nickname, head, diamond, score } = userItem;
                playersArray.push({ chairID: i, userID, gameID, nickname, head, score, diamond });
            }
        }
        return playersArray;
    }
    sendTableStartData() {
        if (!gameconfig.FreeMode) {
            let tableSetting = this.getTableUserData();
            let { roomCode = 0 } = tableSetting;
            if (roomCode) {
                let roomID = this.roomInfo.RoomID;
                let tableID = this.tableID;
                let round = this.getCurRound();
                let data = {
                    roomID,
                    tableID,
                    round,
                    tableSetting,
                    players: this.getTablePlayers()
                };
                this.gameServer.sendLCData(define_1.corresCMD.TABLE_START, data);
                logger.info("游戏桌子开始 发送刷新数据", data);
            }
        }
    }
}
exports.TableFrame = TableFrame;
