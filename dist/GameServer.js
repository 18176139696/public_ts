"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TableFrame_1 = require("./TableFrame");
const ServerUserItem_1 = require("./ServerUserItem");
const define_1 = require("./define");
const ttutil_1 = require("./ttutil");
const SocketServer_1 = require("./SocketServer");
const AndroidManager_1 = require("./AndroidManager");
const events_1 = require("events");
let loginCorresIO = require('socket.io-client');
class GameServer extends events_1.EventEmitter {
    constructor() {
        super();
        this.roomID = 0;
        this.PORT = 0;
        this.tableFrame = [];
        this.serverUserArray = [];
        this.logCorresSock = null;
        this.roomInfo = null;
        this.androidManager = null;
        this.serverSocket = null;
        this.userMap = {};
        this.gateServer = null;
        this.userRoomMap = {};
        this.serverStarted = false;
        this.moduleEnName = "";
        if (gameconfig.Single == true) {
            this.roomInfo = gameconfig.RoomInfo;
            console.error("roomInfo", this.roomInfo);
            this.PORT = gameconfig.PORT || 1234;
            this.init();
            setTimeout(() => {
                let androidNum = gameconfig.AndroidNum || 0;
                let headList = [
                    "http://ae01.alicdn.com/kf/HTB1C5vQe8Gw3KVjSZFw762Q2FXaK.png",
                    "http://ae01.alicdn.com/kf/HTB1sDfKe2WG3KVjSZFg762TspXab.png",
                    "http://ae01.alicdn.com/kf/HTB1gRnUeW5s3KVjSZFN763D3FXa3.png",
                    "http://ae01.alicdn.com/kf/HTB1Z_vLe8WD3KVjSZFs763qkpXai.png",
                    "http://ae01.alicdn.com/kf/HTB1C6zQe8Gw3KVjSZFw762Q2FXa7.png",
                    "http://ae01.alicdn.com/kf/HTB1XanLe25G3KVjSZPx762I3XXaM.png",
                    "http://ae01.alicdn.com/kf/HTB15QnOe8aE3KVjSZLe760sSFXaI.png",
                    "http://ae01.alicdn.com/kf/HTB1XmYUeW5s3KVjSZFN763D3FXa1.png",
                    "http://ae01.alicdn.com/kf/HTB1xsbOe7WE3KVjSZSy760ocXXaw.png",
                    "http://ae01.alicdn.com/kf/HTB1jw2Pe9WD3KVjSZSg763CxVXa2.png",
                ];
                for (let i = 0; i < androidNum; ++i) {
                    let chairID = i % this.roomInfo.ChairCount;
                    let tableID = Math.floor(i / this.roomInfo.ChairCount);
                    let nullSeatId = gameconfig.ChairID || 3;
                    if (typeof nullSeatId == "number") {
                        nullSeatId = [nullSeatId];
                    }
                    if (nullSeatId.indexOf(chairID) != -1)
                        continue;
                    let info = {};
                    let userID = i + 100000;
                    info.userID = userID;
                    info.gameID = userID;
                    info.head = headList[Math.floor(Math.random() * headList.length)];
                    info.tableID = tableID;
                    info.chairID = chairID;
                    info.score = 300000000;
                    info.nickname = "大鱼" + i;
                    info.vipLevel = i;
                    info.isAndroid = 1;
                    info.sex = i % 2;
                    let tableSetting = gameconfig.tableUserData;
                    this.onLCUserSitDown({ userID }, { userID, tableSetting, session: null, userInfo: info }, null);
                }
            }, 1000);
        }
    }
    initGlobal(tableFrameSink, androidUserSink, controlConfig) {
        global["TableFrameSink"] = tableFrameSink;
        global["AndroidUserSink"] = androidUserSink;
        global["ControlConfig"] = controlConfig;
    }
    init() {
        ControlConfig && ControlConfig.startConfig && ControlConfig.startConfig();
        if (this.roomInfo == null) {
            return false;
        }
        let tableCount = this.roomInfo["TableCount"];
        for (let i = 0; i < tableCount; ++i) {
            this.tableFrame[i] = new TableFrame_1.TableFrame(i, this.roomInfo, this);
        }
        this.androidManager = new AndroidManager_1.AndroidManager(this);
        let offlineDelTime = gameconfig.offlineDelTime || 0;
        if (offlineDelTime > 0) {
            setInterval(() => { this.dealOffline(); }, 10 * 1000);
        }
        return true;
    }
    ;
    onGameStart() {
        this.serverStarted = true;
        let roomID = this.roomID;
        return true;
    }
    ;
    connectLogonCorres() {
        logger.info("开始连接协调服务器", gameconfig.LoginAddr);
        let plazaKey = gameconfig.plazaKey || "whosyourdaddy";
        this.logCorresSock = loginCorresIO.connect(gameconfig.LoginAddr, {
            transports: ['websocket'],
            query: `serverid=${gameconfig.RoomID}&plazaKey=${plazaKey}`
        });
        this.logCorresSock.on("connect", (data) => {
            logger.info("连接协调登录服成功,roomID:", gameconfig.RoomID);
        });
        this.logCorresSock.on("disconnect", (reason) => {
            logger.error("协调登录服断开", reason);
        });
        this.onCorresEvent();
    }
    ;
    sendLCData(eventName, msg) {
        if (!gameconfig.Single) {
            this.logCorresSock.emit("msg", {}, eventName, msg);
        }
    }
    ;
    send2LogServer(eventName, msg) {
        if (!gameconfig.Single) {
            this.logCorresSock.emit("log", eventName, msg);
        }
        else {
            logger.error(eventName, msg);
        }
    }
    ;
    onCorresEvent() {
        this.logCorresSock.on("msg", this.onPlazaMsg.bind(this));
    }
    ;
    onPlazaMsg(session, eventName, data, callback) {
        try {
            logger.info("onPlazaMsg", eventName, session, data);
            if (eventName == "RoomInfo") {
                this.onLCRoomInfo(data);
            }
            else if (eventName == "UserSitDown") {
                this.onLCUserSitDown(session, data, callback);
            }
            else if (eventName == "UserStandUp") {
                this.onUserStandUp(session, data, callback);
            }
            else if (eventName == "UserLeave") {
                this.onLCUserLeave(session, data, callback);
            }
            else if (eventName == "WriteScore") {
                this.onLCUserScore(session, data, callback);
            }
            else if (eventName == "ModifyUserWeight") {
                this.onLCModifyUserWeight(session, data, callback);
            }
            else if (eventName == "GetRoomControl") {
                this.onLCGetRoomControl(session, data, callback);
            }
            else if (eventName == "ModifyRoomControl") {
                this.onLCModifyRoomControl(session, data, callback);
            }
            else if (eventName == "onUserOffline") {
                this.onUserOffline(session, data, callback);
            }
            else if (eventName == "onUserRelogin") {
                this.onUserRelogin(session, data, callback);
            }
            else if (eventName == "JoinRoom") {
                this.onLCUserSitDown(session, data, callback);
            }
            else if (eventName == "GetRoomDetail") {
                this.onGetRoomDetail(session, data, callback);
            }
            else if (eventName == "AdminJiesan") {
                this.onAdminDisMiss(session, data, callback);
            }
        }
        catch (err) {
            logger.error("-------------------平台发送消息错误！！----------------------------");
            logger.error(session, eventName, data);
            logger.error(err.stack);
            logger.error("-------------------平台发送消息错误！！----------------------------");
        }
    }
    ;
    onLCModifyUserWeight(session, data, callback) {
        logger.info("修改用户权重， userID: " + data.userID + " weight: " + data.weight);
        let userItem = this.getUserItemByUserID(data.userID);
        let info = {};
        if (userItem != null && !isNaN(parseFloat(data.weight))) {
            userItem.setWeight(data.weight);
            info = { nickname: userItem.nickname, userID: userItem.userID, weight: data.weight, desc: "成功" };
        }
        callback && callback({ code: 0, info });
    }
    ;
    onLCGetRoomControl(session, data, callback) {
        logger.info("获取房间控制配置");
        try {
            let config = ControlConfig.onGetControlConfig();
            logger.info("获取房间控制配置", config);
            callback && callback(config);
        }
        catch (e) {
            logger.error("-----------------------------------------------");
            logger.error("获取房间控制配置出错");
            logger.error(e);
            logger.error("-----------------------------------------------");
            callback && callback([{ key: "errDesc", value: "子游戏获取房间控制配置出错", desc: "出错信息", attr: "r" }]);
        }
    }
    ;
    onLCModifyRoomControl(session, data, callback) {
        logger.info("修改房间控制配置" + JSON.stringify(data));
        try {
            let retData = { code: 2, info: "修改房间控制配置失败!!!请联系该子游戏作者" };
            let ret = ControlConfig.onModifyControlConfig(data, false);
            if (ret) {
                retData.code = 0;
                retData.info = "修改房间控制配置成功";
            }
            callback && callback(retData);
        }
        catch (e) {
            logger.error("-----------------------------------------------");
            logger.error("保存房间控制配置出错");
            logger.error(e);
            logger.error("-----------------------------------------------");
            callback && callback({ code: 2, info: "子游戏出错,请联系该子游戏作者" });
        }
    }
    ;
    onUserOffline(session, data, callback) {
        logger.info("用户掉线 ", session, data);
        if (data == null) {
            return false;
        }
        let userID = data.userID;
        let userItem = this.getUserItemByUserID(userID);
        if (!userItem) {
            logger.error("未找到玩家");
            return false;
        }
        userItem.session = null;
        let tableID = userItem.tableID;
        let table = this.tableFrame[tableID];
        if (!table) {
            logger.error("onUserOffline 未找到玩家桌子");
            return;
        }
        table.onUserOffline(userItem);
        return true;
    }
    ;
    onUserRelogin(session, data, callback) {
        return true;
    }
    ;
    getGameConfig() {
        let config = {};
        return config;
    }
    ;
    onLCUserScore(session, data, callback) {
        if (!data)
            return false;
        let { userID, score } = data || {};
        let userItem = this.getUserItemByUserID(userID);
        if (userItem == null || score == null) {
            logger.info("更变分数失败，用户分数或者用户分数为NULL", data);
            return false;
        }
        if (score < 0) {
            return false;
        }
        userItem.setUserScore(score);
        return true;
    }
    ;
    createUser(session, data) {
        let userItem;
        if (data.isAndroid) {
            userItem = this.createAndroid(data);
        }
        else {
            userItem = new ServerUserItem_1.ServerUserItem(session, this);
            userItem.setInfo(data);
        }
        return userItem;
    }
    checkSitDown(data) {
        if (data == null) {
            return [2, "数据有问题"];
        }
        let userID = data.userID;
        let userItem = this.getUserItemByUserID(userID);
        if (userItem) {
            return [2, "玩家已在座位上 ，请退出先"];
        }
        let tableID = data['tableID'];
        let chairID = data['chairID'];
        if (tableID == null || tableID < 0 || tableID >= this.roomInfo["TableCount"]) {
            return [2, "非法桌子号"];
        }
        let table = this.tableFrame[tableID];
        if (chairID == null || chairID < 0 || chairID >= table.getUserSetChairCount()) {
            return [2, "非法椅子号"];
        }
        if (table.getTableUserItem(chairID)) {
            return [2, "坐下失败， 这个位置上已经有人了"];
        }
        return [0, "ok"];
    }
    onWatcherSitdown(tableID, data) {
        const { session, userInfo } = data;
        logger.info("用户请求观战 ", session, data);
        const { userID } = userInfo;
        let userItem = this.createUser(session, data);
        userItem.online = 1;
        let table = this.tableFrame[tableID];
        if (!table) {
            return [2, "没有找到桌子"];
        }
        table.addWatcher(userItem);
        userItem.tableID = tableID;
        userItem.chairID = 0xffff;
        this.userMap[userID] = userItem;
        this.sendUserEnter(userItem);
        let info = {
            userID: userItem.userID,
            roomID: this.roomInfo.RoomID,
            tableID: userItem.tableID,
            chairID: userItem.chairID,
            isWatcher: true,
        };
        return [0, info];
    }
    ;
    onLCUserSitDown(session, data, callback) {
        logger.info("玩家进入房间 ", session, data);
        let [code, info] = this.enterUserRoom(data);
        logger.info("玩家进入房间 返回:", code, info);
        callback && callback({ code, info, session: data.session });
        return { code, info, session: data.session };
    }
    enterUserRoom(data) {
        if (data == null) {
            return [2, "数据有问题"];
        }
        const { roomCode = 0, userID = 0, tableID = null } = data;
        let existUserItem = this.getUserItemByUserID(userID);
        if (existUserItem) {
            logger.error("你已经在房间内 ，请退出先", userID, existUserItem.nickname);
            return [2, "你已经在房间内 ，请退出先"];
        }
        let table = null;
        if (roomCode) {
            table = this.userRoomMap[roomCode];
            logger.info("是否找到", roomCode, !!table);
            if (!table) {
                table = this.getEmptyTable();
                logger.info("分配空闲桌子", roomCode, !!table);
            }
        }
        else {
            if (tableID != null) {
                if (tableID < 0 || tableID >= this.roomInfo["TableCount"]) {
                    return [2, "非法桌子号"];
                }
                table = this.tableFrame[tableID];
            }
            if (!table) {
                table = this.getNotFullTable();
                logger.info("分配空闲桌子", !!table);
            }
        }
        if (!table) {
            return [2, "没有空闲的桌子了1"];
        }
        let chairID = table.getFreeChairID();
        if (chairID == null) {
            if (gameconfig.enableWatcher) {
                let enterTableID = table.tableID;
                return this.onWatcherSitdown(enterTableID, data);
            }
            return [2, "桌子已经坐满"];
        }
        return this.doSitDown(data, table, chairID);
    }
    ;
    getEmptyTable() {
        let aLen = this.tableFrame.length;
        let startIndex = 0;
        let findTable = null;
        for (let i = startIndex; i < aLen + startIndex; ++i) {
            const table = this.tableFrame[i % aLen];
            if (table.getCurPlayerNum() == 0) {
                findTable = table;
                break;
            }
        }
        return findTable;
    }
    getNotFullTable() {
        let aLen = this.tableFrame.length;
        let startIndex = 0;
        let findTable = null;
        for (let i = startIndex; i < aLen + startIndex; ++i) {
            const table = this.tableFrame[i % aLen];
            let curPlayerCount = table.getCurPlayerNum();
            let maxPlayerCount = table.getUserSetChairCount();
            if (curPlayerCount < maxPlayerCount) {
                findTable = table;
                break;
            }
        }
        return findTable;
    }
    doSitDown(data, table, chairID) {
        const { roomCode = 0, userID = 0, session, tableSetting = {}, userInfo } = data;
        let playerCount = table.getCurPlayerNum();
        userInfo.tableID = table.tableID;
        userInfo.chairID = chairID;
        let userItem = this.createUser(session, userInfo);
        userItem.online = 1;
        let sitSuccess = table.performSitDownAction(chairID, userItem);
        if (sitSuccess) {
            this.userMap[userID] = userItem;
            if (roomCode) {
                this.userRoomMap[roomCode] = table;
            }
            if (tableSetting && playerCount == 0) {
                table.setTableUserData(tableSetting);
                table.startCloseTimer();
                logger.info("桌子配置", tableSetting);
            }
            this.sendUserEnter(userItem);
            if (userItem.isAndroid) {
                this.sendData(userItem, define_1.gameCMD.MDM_GR_LOGON, define_1.gameCMD.SUB_GR_LOGON_SUCCESS, {
                    userID: userItem.userID,
                    gameConfig: this.getGameConfig()
                });
            }
            let info = {
                userID: userItem.userID,
                roomID: this.roomInfo.RoomID,
                tableID: userItem.tableID,
                chairID: userItem.chairID,
                tableSetting,
                players: table.getTablePlayers()
            };
            return [0, info];
        }
        else {
            return [2, "坐下失败" + sitSuccess];
        }
    }
    ;
    onLCUserLeave(session, data, callback) {
        let userID = data["userID"];
        logger.error("onLCUserLeave:" + userID);
        let userItem = this.getUserItemByUserID(userID);
        if (!userItem) {
            logger.error("用户不在房间内 离开失败:" + data["userID"]);
        }
        else {
            logger.info("用户离开,ID:" + data["userID"] + "是否是机器人: " + userItem.isAndroid + " 昵称 " + userItem.getNickname());
            this.deleteUserItem(userItem);
        }
    }
    ;
    createAndroid(info) {
        let userItem = new ServerUserItem_1.ServerUserItem(null, this);
        userItem.setInfo(info);
        this.serverUserArray.push(userItem);
        this.androidManager.createAndroidItem(userItem);
        return userItem;
    }
    ;
    onLCRoomInfo(data) {
        let crtRoom = null;
        let roomID = "roomID";
        for (let i = 0; i < data.length; ++i) {
            if (Number(gameconfig.RoomID) == data[i][roomID]) {
                crtRoom = data[i];
            }
        }
        if (crtRoom == null) {
            return crtRoom;
        }
        logger.info(crtRoom);
        this.roomInfo = {};
        this.roomID = crtRoom["roomID"];
        this.roomInfo.RoomID = crtRoom["roomID"];
        this.roomInfo.GameName = crtRoom["moduleName"];
        this.roomInfo.RoomName = crtRoom["roomName"];
        this.roomInfo.GameMode = crtRoom["roomMode"];
        this.roomInfo.TableCount = crtRoom["tableCount"];
        this.roomInfo.ChairCount = crtRoom["chairCount"];
        this.roomInfo.Revenue = crtRoom["revenue"];
        this.roomInfo.MinSitScore = crtRoom["minScore"];
        this.roomInfo.Cheat = crtRoom["cheatProof"];
        this.roomInfo.roomConfig = crtRoom["roomConfig"];
        this.roomInfo.moduleEnName = crtRoom["moduleEnName"];
        this.moduleEnName = crtRoom["moduleEnName"];
        this.PORT = crtRoom["port"];
        if (gameconfig.FreeMode) {
            this.roomInfo.MinSitScore = gameconfig.FreeModeMinScore;
        }
        if (!this.serverStarted) {
            this.init();
            this.start();
            this.onGameStart();
            logger.info("游戏未启动，加载数据");
        }
        crtRoom.userIDArray = this.getAllUserInThisGame();
        crtRoom.roomCodeArray = this.getAllRoomCodeInThisGame();
        this.sendLCData(define_1.corresCMD.OPEN_OK, crtRoom);
        logger.info("游戏服务器启动成功");
        console.log("游戏服务器启动成功");
    }
    ;
    start() {
        this.gateServer = new SocketServer_1.SocketServer(this, this.PORT);
        this.gateServer.start();
    }
    onClientSocketEvent(session, data, androidUserItem) {
        let ret = false;
        let userID = session.userID;
        let userItem = this.getUserItemByUserID(userID);
        if (!userItem) {
            logger.error("错误,用户并未登录该子游戏", session, data);
            return;
        }
        if (!userItem.isAndroid) {
        }
        try {
            switch (data['mainCMD']) {
                case define_1.gameCMD.MDM_GR_LOGON:
                    ret = this.onClientLogonEvent(data['subCMD'], data.data, userItem, session);
                    break;
                case define_1.gameCMD.MDM_GR_USER:
                    break;
                case define_1.gameCMD.MDM_GF_GAME:
                    ret = this.onClientGameEvent(data['subCMD'], data.data, userItem, androidUserItem);
                    break;
                case define_1.gameCMD.MDM_GF_FRAME:
                    ret = this.onClientFrameEvent(data['subCMD'], data.data, userItem, androidUserItem);
                    break;
            }
        }
        catch (err) {
            logger.error("-------------------客户端严重错误！！----------------------------");
            logger.error(userItem.nickname, userItem.userID, data);
            logger.error(err.stack);
            logger.error("-------------------客户端严重错误！！----------------------------");
        }
        if (!ret) {
            logger.error("-------------------返回错误！----------------------------");
            logger.error(userItem.nickname, userItem.userID, data);
            logger.error("-------------------返回错误！----------------------------");
        }
    }
    ;
    stop() {
        logger.info("游戏服务器停止1");
        this.removeAllListeners();
        let i, userItem;
        for (i = 0; i < this.serverUserArray.length; ++i) {
            userItem = this.serverUserArray[i];
            if (!userItem.isAndroid) {
            }
        }
        this.serverUserArray.length = 0;
        this.androidManager && this.androidManager.clearAll();
        this.tableFrame.length = 0;
        this.gateServer && this.gateServer.stop();
    }
    ;
    onAsynEvent() {
        this.on(define_1.gameEvent.EVENT_USER_STATUS, this.eventUserItemStatus);
        this.on(define_1.gameEvent.EVENT_USER_SCORE, this.eventUserItemScore);
        this.on(define_1.gameEvent.EVENT_ANDROID, this.onClientSocketEvent);
    }
    ;
    eventUserItemScore(userItem) {
        if (userItem instanceof ServerUserItem_1.ServerUserItem == false)
            return false;
        let table = this.tableFrame[userItem.getTableID()];
        if (table != null) {
            table.broadCastTableData(define_1.gameCMD.MDM_GR_USER, define_1.gameCMD.SUB_GR_USER_SCORE, null, { userID: userItem.userID, score: userItem.getUserScore() });
        }
    }
    ;
    eventUserItemStatus(userItem, oldTableID, oldChairID, oldStatus) {
        if (userItem instanceof ServerUserItem_1.ServerUserItem == false)
            return false;
        if (userItem.userStatus != define_1.gameConst.US_FREE) {
            if (userItem.userStatus == define_1.gameConst.US_NULL) {
                logger.info("游戏服 -> 协调服, 用户状态： " + userItem.userStatus + " 游戏ID：" + userItem.getUserID());
            }
        }
        let table = this.tableFrame[userItem.tableID];
        if (table == null) {
            return false;
        }
        table.broadCastTableData(define_1.gameCMD.MDM_GR_USER, define_1.gameCMD.SUB_GR_USER_STATUS, null, {
            userID: userItem.userID,
            tableID: userItem.tableID,
            chairID: userItem.chairID,
            userStatus: userItem.userStatus
        });
        if (userItem.userStatus == define_1.gameConst.US_READY) {
            let table = this.tableFrame[userItem.tableID];
            if (table != null && table.efficacyStartGame()) {
                table.startGame();
            }
        }
        return true;
    }
    ;
    onClientLogonEvent(subCMD, data, userItem, session) {
        logger.info("收到客户端登录消息", userItem.nickname, userItem.userID);
        userItem.session = session;
        userItem.online = 1;
        let msg = this.getUserLogonPackage(userItem);
        let table = this.tableFrame[userItem.tableID];
        if (table) {
            table.onUserRelogin(userItem);
        }
        this.sendData(userItem, define_1.gameCMD.MDM_GR_LOGON, define_1.gameCMD.SUB_GR_LOGON_SUCCESS, msg);
        return true;
    }
    ;
    onClientFrameEvent(subCMD, data, userItem, androidUserItem) {
        logger.info("onClientFrameEvent", data, userItem.nickname, userItem.userID);
        let tableID = userItem.getTableID();
        let chairID = userItem.getChairID();
        if (tableID == null || chairID == null)
            return false;
        let tableFrame = this.tableFrame[tableID];
        switch (subCMD) {
            default: return tableFrame.onEventSocketFrame(subCMD, data, userItem);
        }
        return true;
    }
    ;
    onClientGameEvent(subCMD, data, userItem, androidUserItem) {
        let tableUserItem = userItem;
        if (tableUserItem == null) {
            logger.info('the client userItem is null');
            return false;
        }
        if (tableUserItem.tableID == null || tableUserItem.chairID == null) {
            return true;
        }
        let tableFrame = this.tableFrame[tableUserItem.tableID];
        if (tableFrame == null)
            return false;
        return tableFrame.onEventSocketGame(subCMD, data, tableUserItem);
    }
    ;
    getUserItemByUserID(userID) {
        return this.userMap[userID];
    }
    ;
    deleteUserItem(userItem, notify = true, notifyPlaza = true) {
        if (userItem == null || userItem instanceof ServerUserItem_1.ServerUserItem == false) {
            logger.info("deleteUserItem userItem is null or not ServerUserItem");
            return;
        }
        let table = this.tableFrame[userItem.tableID];
        let round = table.getCurRound();
        logger.info("deleteUserItem userItem notify,", notify, "round", round);
        if (userItem.markDelete) {
            return;
        }
        userItem.markDelete = true;
        if (table != null) {
            table.performStandUpActionNotNotifyPlaza(userItem);
            let tableSetting = Object.assign({}, table.getTableUserData());
            let { roomCode = 0 } = tableSetting;
            if (table.getCurPlayerNum() == 0 && table.tableSetting) {
                table.tableSetting = null;
                table.stopCloseTimer();
                logger.info("tableSetting set null");
                process.nextTick(() => {
                    table.kickoutAllUser();
                });
            }
            if (notify && !userItem.isWatcher()) {
                table.broadCastTableData(define_1.gameCMD.MDM_GR_USER, define_1.gameCMD.SUB_GR_USER_STATUS, null, {
                    userID: userItem.userID,
                    tableID: userItem.tableID,
                    chairID: userItem.chairID,
                    userStatus: define_1.gameConst.US_NULL
                });
            }
            let players = table.getTablePlayers();
            let curPlayerNum = table.getCurPlayerNum();
            if (curPlayerNum == 0 && roomCode) {
                delete this.userRoomMap[roomCode];
                logger.info("座位上没人了，清空玩家创建的桌子", roomCode);
            }
            if (notifyPlaza) {
                let info = {
                    userID: userItem.userID, success: 1, round, roomID: this.roomID,
                    tableID: table.tableID, curPlayerNum, tableSetting, players
                };
                logger.info("UserStandUpSuccess:", { code: 0, info, session: userItem.session });
                this.sendLCData("UserStandUpSuccess", { code: 0, info, session: userItem.session });
            }
        }
        this.userMap[userItem.userID] = null;
        delete this.userMap[userItem.userID];
        if (userItem.isAndroid) {
            this.androidManager.deleteAndroidUserItem(userItem);
        }
    }
    ;
    onUserStandUp(session, data, callback) {
        let userID = data["userID"];
        logger.error("onLCUserLeave:" + userID);
        let userItem = this.getUserItemByUserID(userID);
        if (!userItem) {
            let retData = { code: 2, info: "不在房间内 离开失败" };
            callback && callback(retData);
            return;
        }
        else {
            let table = this.tableFrame[userItem.tableID];
            if (!table) {
                let retData = { code: 2, info: "桌子不存在" };
                callback && callback(retData);
                return;
            }
            let retData = table.onUserStandUp(userItem);
            callback && callback(retData);
            return;
        }
    }
    ;
    sendData(userItem, mainCMD, subCMD, data) {
        if (userItem instanceof ServerUserItem_1.ServerUserItem == false) {
            logger.info("消息发送错误, userItem不是ServerUserItem");
            return false;
        }
        let o = { mainCMD, subCMD, data };
        if (userItem.isAndroid) {
            this.androidManager.sendDataToClient(userItem, mainCMD, subCMD, data);
        }
        else {
            let session = userItem.session;
            if (session && session.gate) {
                this.gateServer.sendMsg(session.gate, session, 2000, o);
            }
        }
    }
    ;
    getUserLogonPackage(serverUserItem) {
        let msg = {};
        let table = this.tableFrame[serverUserItem.tableID];
        if (table) {
            msg = table.getRoomInfoPackage();
            msg.userInfo = table.getUserInfoPacakge(serverUserItem);
        }
        msg.userID = serverUserItem.userID;
        msg.gameConfig = this.getGameConfig();
        return msg;
    }
    ;
    sendUserEnter(enterUserItem) {
        let table = this.tableFrame[enterUserItem.tableID];
        if (table == null || enterUserItem == null) {
            return false;
        }
        let msg = [];
        let sendUser = {
            userID: enterUserItem.userID,
            gameID: enterUserItem.gameID,
            tableID: enterUserItem.tableID,
            chairID: enterUserItem.chairID,
            nickname: enterUserItem.nickname,
            sex: enterUserItem.sex,
            score: enterUserItem.score,
            userStatus: enterUserItem.userStatus,
            vipLevel: enterUserItem.vipLevel,
            otherInfo: enterUserItem.otherInfo,
            head: enterUserItem.head,
            online: enterUserItem.online,
        };
        msg.push(sendUser);
        let exclude = [enterUserItem.userID];
        table.sendTableData(define_1.gameCMD.MDM_GR_USER, define_1.gameCMD.SUB_GR_USER_ENTER, null, msg, exclude);
        return true;
    }
    ;
    sendToastMsg(userItem, message) {
        if (userItem == null) {
            return false;
        }
        let o = { message };
        this.sendData(userItem, define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_TOAST_MSG, o);
    }
    ;
    sendRequestFailure(userItem, message, type) {
        if (userItem == null) {
            return false;
        }
        let o = { message, type };
        this.sendData(userItem, define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_REQUEST_FAILURE, o);
    }
    ;
    recordError(type, content) {
        this.sendLCData(define_1.corresCMD.RECORD_ERROR, { type: type, content: content });
    }
    ;
    writeBigGameResultLog(tableSetting, playerInfo, roundDetail) {
    }
    ;
    writeGoldRecord(userID, addGold, leftGold, desc) {
        let roomID = this.roomInfo.RoomID;
        let timestamp = ttutil_1.ttutil.getTimestamp();
        this.send2LogServer("gold_line", JSON.stringify({ userID, addGold, leftGold, desc, roomID, timestamp }));
    }
    ;
    writeGameLog(gameData) {
        let roomID = this.roomInfo.RoomID;
        let timestamp = ttutil_1.ttutil.getTimestamp();
        let gameResult = Object.assign(gameData, { roomID, timestamp });
        this.send2LogServer("game_log", [JSON.stringify(gameResult), JSON.stringify(gameResult), JSON.stringify(gameResult)]);
    }
    ;
    onSubGameNotice(data) {
        for (let i = 0; i < this.serverUserArray.length; ++i) {
            let userItem = this.serverUserArray[i];
            if (userItem == null)
                continue;
            this.sendData(userItem, define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_FISH_NOTICE, data);
        }
    }
    ;
    onGetRoomDetail(session, data, callback) {
        let userArray = [];
        for (const userID_key in this.userMap) {
            let userItem = this.userMap[userID_key];
            if (userItem && userItem.chairID != define_1.gameConst.INVALID_CHAIR) {
                let { userID, userStatus, tableID, chairID, isAndroid } = userItem;
                userArray.push([userID, isAndroid, userStatus, tableID, chairID]);
            }
        }
        let map = {};
        for (const key in this.userRoomMap) {
            let roomCode = Number(key);
            let table = this.userRoomMap[roomCode];
            map[roomCode] = table.tableID;
        }
        callback && callback({ roomID: this.roomID, userArray, roomCodeMap: map });
    }
    onAdminDisMiss(session, data, callback) {
        let { roomCode } = data;
        let table = this.userRoomMap[roomCode];
        logger.info("强制解散桌子", data);
        if (!table) {
            callback && callback({ code: 2, info: "未找到该桌子" });
            return;
        }
        table.onAdminJiesan();
        callback && callback({ code: 0, info: "解散成功" });
    }
    getAllUserInThisGame() {
        return Object.keys(this.userMap);
    }
    getAllRoomCodeInThisGame() {
        let infoArray = [];
        let roomID = this.roomInfo.RoomID;
        for (let index = 0; index < this.tableFrame.length; index++) {
            const table = this.tableFrame[index];
            if (table.getCurPlayerNum() <= 0)
                continue;
            let info = {
                roomID,
                tableID: table.tableID,
                tableSetting: table.getTableUserData(),
                round: table.getCurRound(),
                players: table.getTablePlayers()
            };
            infoArray.push(info);
        }
        return infoArray;
    }
    dealOffline() {
        for (const userID in this.userMap) {
            let userItem = this.userMap[userID];
            if (userItem && userItem.online == 0 && userItem.offlineTs > 0 &&
                (Date.now() - userItem.offlineTs) >= gameconfig.offlineDelTime * 1000) {
                let table = this.tableFrame[userItem.tableID];
                if (!table) {
                    logger.error("删除掉线玩家,删除失败", userItem.userID, userItem.nickname);
                    return;
                }
                table.onUserStandUp(userItem);
                logger.error("删除掉线玩家1", userItem.userID, userItem.nickname);
            }
        }
    }
    foreachTable(cb) {
        for (let index = 0; index < this.tableFrame.length; index++) {
            let table = this.tableFrame[index];
            cb && cb(table);
        }
    }
    broadCast(msg) {
        this.sendLCData(define_1.corresCMD.BROAD_CAST, msg);
    }
}
exports.GameServer = GameServer;
