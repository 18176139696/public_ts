import { TableFrame } from "./TableFrame";
import { ServerUserItem } from "./ServerUserItem";
import { gameCMD, corresCMD, gameEvent, gameConst } from "./define";
import { ttutil } from "./ttutil";
import { SocketServer } from "./SocketServer";
import { AndroidManager } from "./AndroidManager";
import { EventEmitter } from "events";
import { ITableFrameSink } from "./ITableFrameSink";
import { IAndroidUserSink } from "./IAndroidUserSink";
import { IControlConfig } from "./IControlConfig";

//游戏服务器
let loginCorresIO = require('socket.io-client');


/**
 * 服务器类
 * @constructor
 */

export class GameServer extends EventEmitter {

    roomID = 0;
    PORT = 0;
    tableFrame: TableFrame[] = [];
    serverUserArray: ServerUserItem[] = [];
    logCorresSock: SocketIO.Socket = null;
    roomInfo = null;
    androidManager: AndroidManager = null;
    serverSocket: SocketServer = null;
    userMap = {}
    gateServer: SocketServer = null
    userRoomMap: { [roomCode: number]: TableFrame } = {}
    serverStarted = false
    moduleEnName = ""


    constructor() {
        super()
        if (gameconfig.Single == true) {
            this.roomInfo = gameconfig.RoomInfo;
            console.error("roomInfo", this.roomInfo)
            this.PORT = gameconfig.PORT || 1234; //游戏端口
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
                ]
                for (let i = 0; i < androidNum; ++i) {
                    let chairID = i % this.roomInfo.ChairCount
                    let tableID = Math.floor(i / this.roomInfo.ChairCount)
                    let nullSeatId = gameconfig.ChairID || 3 //机器人不坐这些id
                    if (typeof nullSeatId == "number") {
                        nullSeatId = [nullSeatId]
                    }
                    if (nullSeatId.indexOf(chairID) != -1)
                        continue;
                    let info: any = {}
                    let userID = i + 100000;
                    info.userID = userID;
                    info.gameID = userID;
                    info.head = headList[Math.floor(Math.random() * headList.length)]
                    info.tableID = tableID;
                    info.chairID = chairID;
                    info.score = 300000000;
                    info.nickname = "大鱼" + i;
                    info.vipLevel = i;
                    info.isAndroid = 1;
                    info.sex = i % 2;
                    let tableSetting = gameconfig.tableUserData
                    this.onLCUserSitDown({ userID }, { userID, tableSetting, session: null, userInfo: info }, null);
                }
            }, 1000);
        }

    }


    initGlobal<T extends ITableFrameSink, A extends IAndroidUserSink, C extends IControlConfig>
        (tableFrameSink: T, androidUserSink: A, controlConfig: C) {
        global["TableFrameSink"] = tableFrameSink;
        global["AndroidUserSink"] = androidUserSink;
        global["ControlConfig"] = controlConfig
    }

    /**
     * 初始化游戏服务器
     * @returns {boolean}
     */
    init() {
        // 加载中的配置
        ControlConfig && ControlConfig.startConfig && ControlConfig.startConfig()
        if (this.roomInfo == null) {
            return false;
        }
        let tableCount = this.roomInfo["TableCount"];
        //创建桌子
        for (let i = 0; i < tableCount; ++i) {
            this.tableFrame[i] = new TableFrame(i, this.roomInfo, this);
        }

        this.androidManager = new AndroidManager(this);

        // 离线超过这么久就直接踢掉
        let offlineDelTime = gameconfig.offlineDelTime || 0
        if (offlineDelTime > 0) {
            setInterval(() => { this.dealOffline() }, 10 * 1000) //定时清理掉线玩家
        }

        return true;
    };



    /**
     * 游戏启动成功
     * @returns {boolean}
     */
    onGameStart() {
        this.serverStarted = true //标记已经成功启动了 不需要再启动了

        let roomID = this.roomID

        return true;
    };


    /**
     * 连接登录协调服
     */
    connectLogonCorres() {
        logger.info("开始连接协调服务器", gameconfig.LoginAddr);
        let plazaKey = gameconfig.plazaKey || "whosyourdaddy"
        this.logCorresSock = loginCorresIO.connect(gameconfig.LoginAddr, {
            transports: ['websocket'],

            query: `serverid=${gameconfig.RoomID}&plazaKey=${plazaKey}`
        });


        this.logCorresSock.on("connect", (data) => {
            logger.info("连接协调登录服成功,roomID:", gameconfig.RoomID);
        });

        this.logCorresSock.on("disconnect", (reason) => {
            logger.error("协调登录服断开", reason);
            // self.stop();
        });

        //登录协调服事件
        this.onCorresEvent();
    };
    /**
     * 发送协调服消息
     * @param eventName
     * @param msg
     */
    sendLCData(eventName, msg) {
        if (!gameconfig.Single) {
            this.logCorresSock.emit("msg", {}, eventName, msg);
        }
    };
    send2LogServer(eventName, msg) {
        if (!gameconfig.Single) {
            this.logCorresSock.emit("log", eventName, msg);
        }
        else {
            logger.error(eventName, msg)
        }
    };

    /**
     * 监听登录协调服事件
     */
    onCorresEvent() {
        this.logCorresSock.on("msg", this.onPlazaMsg.bind(this));
    };

    //服务器消息
    onPlazaMsg(session, eventName, data, callback) {
        try {
            logger.info("onPlazaMsg", eventName, session, data)
            if (eventName == "RoomInfo") {
                //房间信息事件
                this.onLCRoomInfo(data)
            } else if (eventName == "UserSitDown") {
                //用户坐下
                this.onLCUserSitDown(session, data, callback)
            } else if (eventName == "UserStandUp") {
                //用户起立
                this.onUserStandUp(session, data, callback)
            } else if (eventName == "UserLeave") {
                //用户离开
                this.onLCUserLeave(session, data, callback)
            } else if (eventName == "WriteScore") {
                //用户写分
                this.onLCUserScore(session, data, callback)
            } else if (eventName == "ModifyUserWeight") {
                //修改用户权重
                this.onLCModifyUserWeight(session, data, callback)
            } else if (eventName == "GetRoomControl") {
                //获取房间控制配置
                this.onLCGetRoomControl(session, data, callback)
            } else if (eventName == "ModifyRoomControl") {
                //修改房间控制配置
                this.onLCModifyRoomControl(session, data, callback)
            } else if (eventName == "onUserOffline") {
                //玩家掉线
                this.onUserOffline(session, data, callback)
            } else if (eventName == "onUserRelogin") {
                //玩家重新上线
                this.onUserRelogin(session, data, callback)
            } else if (eventName == "JoinRoom") {
                this.onLCUserSitDown(session, data, callback) //房卡进入房间
            }
            else if (eventName == "GetRoomDetail") {
                this.onGetRoomDetail(session, data, callback) //获取房间信息
            }
            else if (eventName == "AdminJiesan") {
                this.onAdminDisMiss(session, data, callback) //获取房间信息
            }
        } catch (err) {
            //捕获异常错误处理
            logger.error("-------------------平台发送消息错误！！----------------------------");
            logger.error(session, eventName, data);
            logger.error(err.stack);
            logger.error("-------------------平台发送消息错误！！----------------------------");
        }

    };

    /**
     * 修改用户权重
     * @param data
     */
    onLCModifyUserWeight(session, data, callback) {
        logger.info("修改用户权重， userID: " + data.userID + " weight: " + data.weight);
        let userItem = this.getUserItemByUserID(data.userID);

        let info = {}
        //有用户且 weight是数字
        if (userItem != null && !isNaN(parseFloat(data.weight))) {
            userItem.setWeight(data.weight);
            info = { nickname: userItem.nickname, userID: userItem.userID, weight: data.weight, desc: "成功" }
        }
        callback && callback({ code: 0, info })

    };



    /**
     * 获取房间控制配置
     * @param data
     */
    onLCGetRoomControl(session, data, callback) {
        logger.info("获取房间控制配置");
        try {
            let config = ControlConfig.onGetControlConfig();
            logger.info("获取房间控制配置", config);
            callback && callback(config)
        }
        catch (e) {
            logger.error("-----------------------------------------------");
            logger.error("获取房间控制配置出错");
            logger.error(e);
            logger.error("-----------------------------------------------");
            callback && callback([{ key: "errDesc", value: "子游戏获取房间控制配置出错", desc: "出错信息", attr: "r" }])

        }

    };

    /**
     * 修改房间控制配置
     * @param data
     */
    onLCModifyRoomControl(session, data, callback) {
        logger.info("修改房间控制配置" + JSON.stringify(data));

        try {
            let retData = { code: 2, info: "修改房间控制配置失败!!!请联系该子游戏作者" }
            let ret = ControlConfig.onModifyControlConfig(data, false);
            if (ret) {
                retData.code = 0
                retData.info = "修改房间控制配置成功"
            }
            callback && callback(retData)
        }
        catch (e) {
            logger.error("-----------------------------------------------");
            logger.error("保存房间控制配置出错");
            logger.error(e);
            logger.error("-----------------------------------------------");
            callback && callback({ code: 2, info: "子游戏出错,请联系该子游戏作者" })
        }

    };


    //玩家掉线
    onUserOffline(session, data, callback) {
        logger.info("用户掉线 ", session, data);

        if (data == null) {
            return false;
        }
        let userID = data.userID
        let userItem = this.getUserItemByUserID(userID)

        if (!userItem) {
            logger.error("未找到玩家")
            return false
        }
        userItem.session = null

        let tableID = userItem.tableID
        let table = this.tableFrame[tableID]
        if (!table) {
            logger.error("onUserOffline 未找到玩家桌子")
            return
        }

        table.onUserOffline(userItem)
        return true
    };



    //玩家重连
    onUserRelogin(session, data, callback) {

        //弃用 在logon设置上线
        // logger.info("玩家重连 ", session, data);

        // if (data == null) {
        //     return false;
        // }
        // let userID = data.userID
        // let userItem = this.getUserItemByUserID(userID)

        // if (!userItem) {
        //     logger.error("未找到玩家")
        //     return false
        // }

        // userItem.session = data.session
        // let tableID = userItem.tableID
        // let table = this.tableFrame[tableID]
        // if (table) {
        //     table.onUserRelogin(userItem)
        // }

        return true
    };


    /**
     * 得到要下发到游戏的配置
     */
    getGameConfig() {
        let config = {};

        //这边暂时没有需要配置的东西

        return config;
    };


    /**
     * 分数变更    LC --> S
     * @param data
     * @returns {boolean}
     */
    onLCUserScore(session, data, callback) {
        if (!data) return false;

        //@ts-ignore
        let { userID, score } = data || {}
        let userItem = this.getUserItemByUserID(userID);
        if (userItem == null || score == null) {
            logger.info("更变分数失败，用户分数或者用户分数为NULL", data);
            return false;
        }
        if (score < 0) {
            return false
        }
        userItem.setUserScore(score);
        return true;
    };


    createUser(session, data) {
        let userItem
        if (data.isAndroid) {
            userItem = this.createAndroid(data);
        } else {
            userItem = new ServerUserItem(session, this)
            userItem.setInfo(data);
        }
        return userItem
    }

    checkSitDown(data) {
        if (data == null) {
            return [2, "数据有问题"];
        }
        let userID = data.userID
        let userItem = this.getUserItemByUserID(userID)
        if (userItem) {
            return [2, "玩家已在座位上 ，请退出先"];
        }
        //如果他了tableID为0xffff的话，自动寻位
        let tableID = data['tableID'];
        let chairID = data['chairID'];

        if (tableID == null || tableID < 0 || tableID >= this.roomInfo["TableCount"]) {
            return [2, "非法桌子号"];
        }
        let table = this.tableFrame[tableID]
        if (chairID == null || chairID < 0 || chairID >= table.getUserSetChairCount()) {
            return [2, "非法椅子号"];
        }

        if (table.getTableUserItem(chairID)) {
            return [2, "坐下失败， 这个位置上已经有人了"];
        }

        return [0, "ok"]

    }


    /**
     * 玩家观战
     * @param data
     * @returns {boolean}
     */
    onWatcherSitdown(tableID, data) {
        const { session, userInfo } = data
        logger.info("用户请求观战 ", session, data);
        const { userID } = userInfo
        let userItem = this.createUser(session, data)
        userItem.online = 1; //刚坐下肯定在线

        let table = this.tableFrame[tableID]
        if (!table) {
            return [2, "没有找到桌子"]
        }
        table.addWatcher(userItem); //添加观战
        userItem.tableID = tableID
        userItem.chairID = 0xffff //观战
        this.userMap[userID] = userItem
        this.sendUserEnter(userItem); //通知其他玩家观察者进来

        let info = {
            userID: userItem.userID,
            roomID: this.roomInfo.RoomID,
            tableID: userItem.tableID,
            chairID: userItem.chairID,
            isWatcher: true,
        }

        return [0, info]
    };

    /**
     * 用户坐下   LC --> S
     * @param data
     * @returns {boolean}
     */
    onLCUserSitDown(session, data, callback) {
        logger.info("玩家进入房间 ", session, data);
        let [code, info] = this.enterUserRoom(data)
        logger.info("玩家进入房间 返回:", code, info)
        callback && callback({ code, info, session: data.session })
        return { code, info, session: data.session }
    }


    /**
     * 输入房间号坐下，自动分配座位
     * @param data
     * @returns {boolean}
     */
    enterUserRoom(data) {

        if (data == null) {
            return [2, "数据有问题"];
        }
        const { roomCode = 0, userID = 0, tableID = null } = data
        let existUserItem = this.getUserItemByUserID(userID)
        if (existUserItem) {
            logger.error("你已经在房间内 ，请退出先", userID, existUserItem.nickname)
            return [2, "你已经在房间内 ，请退出先"];
        }
        let table: TableFrame = null
        if (roomCode) { //通过房间号进来 找下看有没有对应房间的table
            table = this.userRoomMap[roomCode]
            logger.info("是否找到", roomCode, !!table)
            if (!table) { //没有就分配一张桌子给他
                table = this.getEmptyTable()
                logger.info("分配空闲桌子", roomCode, !!table)
            }
        }
        else {
            if (tableID != null) //有指定桌子则需要判断桌子
            {
                if (tableID < 0 || tableID >= this.roomInfo["TableCount"]) {
                    return [2, "非法桌子号"];
                }
                table = this.tableFrame[tableID]
            }

            if (!table) { //没有就分配一张桌子给他
                table = this.getNotFullTable()
                logger.info("分配空闲桌子", !!table)
            }
        }

        if (!table) {
            return [2, "没有空闲的桌子了1"];
        }

        let chairID = table.getFreeChairID() //找一张空闲椅子
        if (chairID == null) {
            if (gameconfig.enableWatcher) {
                let enterTableID = table.tableID
                return this.onWatcherSitdown(enterTableID, data)
            }
            return [2, "桌子已经坐满"];
        }

        return this.doSitDown(data, table, chairID)
    };

    //找一张空桌子
    getEmptyTable() {
        let aLen = this.tableFrame.length
        // let startIndex = Math.floor(Math.random() * aLen);
        let startIndex = 0
        //分配
        let findTable = null
        for (let i = startIndex; i < aLen + startIndex; ++i) {
            const table = this.tableFrame[i % aLen]
            if (table.getCurPlayerNum() == 0) {
                findTable = table
                break;
            }
        }

        return findTable
    }

    //找一张没坐满的桌子
    getNotFullTable() {
        let aLen = this.tableFrame.length
        // let startIndex = Math.floor(Math.random() * aLen);
        let startIndex = 0
        //分配
        let findTable = null
        for (let i = startIndex; i < aLen + startIndex; ++i) {
            const table = this.tableFrame[i % aLen]
            let curPlayerCount = table.getCurPlayerNum()
            let maxPlayerCount = table.getUserSetChairCount()
            if (curPlayerCount < maxPlayerCount) {
                findTable = table
                break;
            }
        }

        return findTable
    }


    //玩家以data数据在 table的chairID 坐下
    doSitDown(data, table, chairID) {

        const { roomCode = 0, userID = 0, session, tableSetting = {}, userInfo } = data
        let playerCount = table.getCurPlayerNum()

        userInfo.tableID = table.tableID //填充data
        userInfo.chairID = chairID

        let userItem = this.createUser(session, userInfo)
        userItem.online = 1; //刚坐下肯定在线
        //坐下处理
        let sitSuccess = table.performSitDownAction(chairID, userItem);
        if (sitSuccess) {
            this.userMap[userID] = userItem //
            if (roomCode) {
                this.userRoomMap[roomCode] = table //设置桌子
            }
            if (tableSetting && playerCount == 0) {
                table.setTableUserData(tableSetting) //第一个人来配置桌子
                table.startCloseTimer();
                logger.info("桌子配置", tableSetting)
            }
            this.sendUserEnter(userItem);
            if (userItem.isAndroid) { //机器人需要发送登录成功消息。真实玩家则自己请求拉取一下
                this.sendData(userItem, gameCMD.MDM_GR_LOGON, gameCMD.SUB_GR_LOGON_SUCCESS, {
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
            }
            return [0, info]
        } else {
            return [2, "坐下失败" + sitSuccess]
        }

    };





    /**
     * 机器人人离开    LC --> S
     * @param data
     */
    onLCUserLeave(session, data, callback) {
        let userID = data["userID"];
        logger.error("onLCUserLeave:" + userID);
        let userItem = this.getUserItemByUserID(userID);
        if (!userItem) {
            logger.error("用户不在房间内 离开失败:" + data["userID"]);
        } else {
            logger.info("用户离开,ID:" + data["userID"] + "是否是机器人: " + userItem.isAndroid + " 昵称 " + userItem.getNickname());
            this.deleteUserItem(userItem);
        }
    };

    /**
     * 创建机器人
     * @param info
     * @returns {ServerUserItem|exports|module.exports}
     */
    createAndroid(info) {
        let userItem = new ServerUserItem(null, this);
        userItem.setInfo(info);
        this.serverUserArray.push(userItem);
        this.androidManager.createAndroidItem(userItem);
        return userItem;
    };

    /**
     *  房间消息   LC --> S
     * @param data
     * @returns {*}
     */
    onLCRoomInfo(data) {

        //登入消息
        let crtRoom = null;
        let roomID = "roomID";
        for (let i = 0; i < data.length; ++i) {
            if (Number(gameconfig.RoomID) == data[i][roomID]) {
                crtRoom = data[i];
            }
        }

        if (crtRoom == null) {
            return crtRoom
        }


        logger.info(crtRoom);

        this.roomInfo = {};
        this.roomID = crtRoom["roomID"]
        this.roomInfo.RoomID = crtRoom["roomID"]; //房间ID
        this.roomInfo.GameName = crtRoom["moduleName"]; //游戏名
        this.roomInfo.RoomName = crtRoom["roomName"]; //房间名
        this.roomInfo.GameMode = crtRoom["roomMode"]; //房间模式
        this.roomInfo.TableCount = crtRoom["tableCount"]; //桌子数
        this.roomInfo.ChairCount = crtRoom["chairCount"]; //一张桌子椅子数
        this.roomInfo.Revenue = crtRoom["revenue"]; //税收千分比
        this.roomInfo.MinSitScore = crtRoom["minScore"]; //最小进入分数
        this.roomInfo.Cheat = crtRoom["cheatProof"]; //
        this.roomInfo.roomConfig = crtRoom["roomConfig"]; //房间基本配置
        this.roomInfo.moduleEnName = crtRoom["moduleEnName"]; //模块名字
        this.moduleEnName = crtRoom["moduleEnName"]; //模块名字


        this.PORT = crtRoom["port"]; //游戏端口

        if (gameconfig.FreeMode) {
            this.roomInfo.MinSitScore = gameconfig.FreeModeMinScore;
        }

        if (!this.serverStarted) {
            this.init();
            this.start();
            this.onGameStart()
            logger.info("游戏未启动，加载数据")
        }

        crtRoom.userIDArray = this.getAllUserInThisGame()
        crtRoom.roomCodeArray = this.getAllRoomCodeInThisGame()

        //返回启动成功消息
        this.sendLCData(corresCMD.OPEN_OK, crtRoom);
        logger.info("游戏服务器启动成功");
        console.log("游戏服务器启动成功");

    };

    start() {
        this.gateServer = new SocketServer(this, this.PORT)
        this.gateServer.start()
    }
    /**
    /**
     * 通信主函数
     * @param data {mainCMD:x, subCMD:x, data:{xxx}}
     * @param session 机器人时为null
     * @param androidUserItem 真人时为null
     * @returns {boolean}
     */
    onClientSocketEvent(session, data, androidUserItem) {


        let ret = false;
        let userID = session.userID
        let userItem = this.getUserItemByUserID(userID)
        if (!userItem) {
            logger.error("错误,用户并未登录该子游戏", session, data)
            return
        }

        if (!userItem.isAndroid) {
            //logger.debug("收到真实客户端消息", session, data)
        }

        try {
            switch (data['mainCMD']) {
                //登录
                case gameCMD.MDM_GR_LOGON:
                    ret = this.onClientLogonEvent(data['subCMD'], data.data, userItem, session);
                    break;

                //用户命令  TODO:未实现onClientUserEvent
                case gameCMD.MDM_GR_USER:

                    //ret = this.onClientUserEvent(data['subCMD'], data.data, userItem, androidUserItem);
                    break;
                //游戏命令
                case gameCMD.MDM_GF_GAME:
                    ret = this.onClientGameEvent(data['subCMD'], data.data, userItem, androidUserItem);
                    break;
                //框架命令
                case gameCMD.MDM_GF_FRAME:
                    ret = this.onClientFrameEvent(data['subCMD'], data.data, userItem, androidUserItem);
                    break;
            }
        } catch (err) {
            //捕获异常错误处理
            logger.error("-------------------客户端严重错误！！----------------------------");
            logger.error(userItem.nickname, userItem.userID, data);
            logger.error(err.stack);
            logger.error("-------------------客户端严重错误！！----------------------------");
        }

        //如果返回值错误断开链接
        if (!ret) {
            //捕获异常错误处理
            logger.error("-------------------返回错误！----------------------------");
            logger.error(userItem.nickname, userItem.userID, data);
            logger.error("-------------------返回错误！----------------------------");
        }
    };

    /**
     * 停服
     */
    stop() {
        logger.info("游戏服务器停止1");
        this.removeAllListeners();
        let i, userItem;
        //删除玩家
        for (i = 0; i < this.serverUserArray.length; ++i) {
            userItem = this.serverUserArray[i];
            if (!userItem.isAndroid) {
                //userItem.socket.disconnect();
            }
        }
        this.serverUserArray.length = 0;
        //可能还没连接上就断开了就是还没有执行init。所以要做此非空判断
        this.androidManager && this.androidManager.clearAll();
        //删除桌子
        this.tableFrame.length = 0;

        this.gateServer && this.gateServer.stop();
    };

    /**
     * 内部异步事件
     */
    onAsynEvent() {
        //玩家状态
        this.on(gameEvent.EVENT_USER_STATUS, this.eventUserItemStatus);
        //分数状态
        this.on(gameEvent.EVENT_USER_SCORE, this.eventUserItemScore);
        //机器人消息处理
        this.on(gameEvent.EVENT_ANDROID, this.onClientSocketEvent);
    };
    /**
     * 用户分数变更
     * @param userItem 用户
     */
    eventUserItemScore(userItem) {
        if (userItem instanceof ServerUserItem == false) return false;

        let table = this.tableFrame[userItem.getTableID()];

        if (table != null) {
            table.broadCastTableData(gameCMD.MDM_GR_USER, gameCMD.SUB_GR_USER_SCORE, null, { userID: userItem.userID, score: userItem.getUserScore() });
        }
    };


    /**
     * 用户状态变更
     * @param userItem 用户
     * @param oldTableID 旧桌子
     * @param oldChairID 旧椅子
     * @returns {boolean}
     */
    eventUserItemStatus(userItem, oldTableID, oldChairID, oldStatus) {
        //暂时回送坐下消息 以及检测游戏开始
        if (userItem instanceof ServerUserItem == false) return false;

        if (userItem.userStatus != gameConst.US_FREE) { // 其他操作
            // this.sendLCData(corresCMD.USER_STATUS, { userID: userItem.userID, status: userItem.userStatus });
            if (userItem.userStatus == gameConst.US_NULL) {
                logger.info("游戏服 -> 协调服, 用户状态： " + userItem.userStatus + " 游戏ID：" + userItem.getUserID());
            }
        }

        //群发状态本桌
        let table = this.tableFrame[userItem.tableID];
        if (table == null) {
            return false;
        }
        //群发给本桌
        table.broadCastTableData(gameCMD.MDM_GR_USER, gameCMD.SUB_GR_USER_STATUS, null, {
            userID: userItem.userID,
            tableID: userItem.tableID,
            chairID: userItem.chairID,
            userStatus: userItem.userStatus
        });

        if (userItem.userStatus == gameConst.US_READY) {
            //检测开始
            let table = this.tableFrame[userItem.tableID];

            if (table != null && table.efficacyStartGame()) {
                table.startGame();
            }
        }

        return true;
    };


    /**
     * 客户端登录事件
     * @param subCMD 子命令
     * @param data 数据
     * @param socket 玩家socket
     * @param androidUserItem 用户item
     * @returns {boolean}
     */
    onClientLogonEvent(subCMD, data, userItem, session) {

        logger.info("收到客户端登录消息", userItem.nickname, userItem.userID)
        userItem.session = session
        userItem.online = 1; //刚坐下肯定在线
        let msg = this.getUserLogonPackage(userItem)

        //通知客户端成功

        let table = this.tableFrame[userItem.tableID];
        if (table) {
            table.onUserRelogin(userItem)//通知上线
        }

        this.sendData(userItem, gameCMD.MDM_GR_LOGON, gameCMD.SUB_GR_LOGON_SUCCESS, msg);

        return true

    };
    /**
     * 框架事件
     * @param subCMD
     * @param data
     * @param session
     * @param androidUserItem
     * @returns {boolean}
     */
    onClientFrameEvent(subCMD, data, userItem, androidUserItem) {

        logger.info("onClientFrameEvent", data, userItem.nickname, userItem.userID)

        let tableID = userItem.getTableID();
        let chairID = userItem.getChairID();
        if (tableID == null || chairID == null) return false;

        let tableFrame = this.tableFrame[tableID];

        switch (subCMD) {

            default: return tableFrame.onEventSocketFrame(subCMD, data, userItem);
        }

        return true;
    };
    /**
     * 游戏事件
     * @param subCMD
     * @param data
     * @param session
     * @param androidUserItem
     * @returns {boolean}
     */
    onClientGameEvent(subCMD, data, userItem, androidUserItem) {
        //logger.info('onClientGameEvent', subCMD, data);

        let tableUserItem = userItem
        if (tableUserItem == null) {
            logger.info('the client userItem is null');
            return false;
        }

        if (tableUserItem.tableID == null || tableUserItem.chairID == null) {
            return true;
        }

        let tableFrame = this.tableFrame[tableUserItem.tableID];

        if (tableFrame == null) return false;

        return tableFrame.onEventSocketGame(subCMD, data, tableUserItem);
    };

    /**
     * 通过游戏ID获取用户
     * @param userID
     * @returns {*}
     */
    getUserItemByUserID(userID) {
        return this.userMap[userID]
    };



    /**
     * 删除用户 (通知协调服务器)
     
     * @param userItem
     * @param notify
     */
    deleteUserItem(userItem, notify = true, notifyPlaza = true) {

        if (userItem == null || userItem instanceof ServerUserItem == false) {
            logger.info("deleteUserItem userItem is null or not ServerUserItem");
            return;
        }
        let table = this.tableFrame[userItem.tableID];
        let round = table.getCurRound();
        logger.info("deleteUserItem userItem notify,", notify, "round", round);

        //如果已经被标志要删除了， 就不重入了， 比如玩家逃跑时， 可能会触发结算， 结算就会触发 分数踢人， 导致玩家重入
        if (userItem.markDelete) {
            return;
        }
        userItem.markDelete = true;
        //若在位置先让其起立
        if (table != null) {
            table.performStandUpActionNotNotifyPlaza(userItem);
            let tableSetting = Object.assign({}, table.getTableUserData())
            let { roomCode = 0 } = tableSetting //房间号
            if (table.getCurPlayerNum() == 0 && table.tableSetting) { //没玩家了
                table.tableSetting = null //清掉这个桌子的配置
                table.stopCloseTimer();
                logger.info("tableSetting set null")
                process.nextTick(() => {
                    table.kickoutAllUser();
                })
            }

            if (notify && !userItem.isWatcher()) {
                table.broadCastTableData(gameCMD.MDM_GR_USER, gameCMD.SUB_GR_USER_STATUS, null, {
                    userID: userItem.userID,
                    tableID: userItem.tableID,
                    chairID: userItem.chairID,
                    userStatus: gameConst.US_NULL
                });
            }

            let players = table.getTablePlayers()
            let curPlayerNum = table.getCurPlayerNum()
            if (curPlayerNum == 0 && roomCode) {
                delete this.userRoomMap[roomCode]
                logger.info("座位上没人了，清空玩家创建的桌子", roomCode)
            }

            if (notifyPlaza) {
                let info = {
                    userID: userItem.userID, success: 1, round, roomID: this.roomID,
                    tableID: table.tableID, curPlayerNum, tableSetting, players
                }

                logger.info("UserStandUpSuccess:", { code: 0, info, session: userItem.session })
                this.sendLCData("UserStandUpSuccess", { code: 0, info, session: userItem.session });

            }
        }

        this.userMap[userItem.userID] = null
        delete this.userMap[userItem.userID]
        if (userItem.isAndroid) {
            this.androidManager.deleteAndroidUserItem(userItem);
        }

    };



    /**
     * 用户请求离开
     * @param data
     */
    onUserStandUp(session, data, callback) {
        let userID = data["userID"];
        logger.error("onLCUserLeave:" + userID);

        let userItem = this.getUserItemByUserID(userID);
        if (!userItem) {
            let retData = { code: 2, info: "不在房间内 离开失败" }
            callback && callback(retData)
            return
        } else {
            let table = this.tableFrame[userItem.tableID];
            if (!table) {
                let retData = { code: 2, info: "桌子不存在" }
                callback && callback(retData)
                return
            }
            let retData = table.onUserStandUp(userItem)
            callback && callback(retData)
            return

        }

    };



    /**
     * 发送玩家消息
     * @param userItem 用户
     * @param mainCMD 主命令
     * @param subCMD 子命令
     * @param data 数据
     * @param messageType消息类型， 默认message
     * @returns {boolean}
     */
    sendData(userItem, mainCMD, subCMD, data) {
        if (userItem instanceof ServerUserItem == false) {
            logger.info("消息发送错误, userItem不是ServerUserItem");
            //logger.info("消息发送错误, userItem不是ServerUserItem")
            return false;
        }

        let o = { mainCMD, subCMD, data };

        if (userItem.isAndroid) {

            //机器人发送消息
            this.androidManager.sendDataToClient(userItem, mainCMD, subCMD, data);
        } else {

            //直接发o
            let session = userItem.session
            if (session && session.gate) {
                this.gateServer.sendMsg(session.gate, session, 2000, o)
            }


            //this.socketMgr.tellUser(userItem, "gamemsg", o)

        }
    };


    /**
     * 发送给坐下玩家此桌玩家的消息
     * @param serverUserItem
     * @returns {boolean}
     */
    getUserLogonPackage(serverUserItem) {

        let msg: any = {}

        let table = this.tableFrame[serverUserItem.tableID];
        if (table) {
            msg = table.getRoomInfoPackage()
            msg.userInfo = table.getUserInfoPacakge(serverUserItem)
        }

        msg.userID = serverUserItem.userID
        msg.gameConfig = this.getGameConfig()

        return msg

    };
    /**
     * 发送玩家进入
     * @param enterUserItem
     * @returns {boolean}
     */
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

        let exclude = [enterUserItem.userID] //这个人不发
        table.sendTableData(gameCMD.MDM_GR_USER, gameCMD.SUB_GR_USER_ENTER, null, msg, exclude);

        return true;
    };

    /**
     * 发送tip消息
     * @param userItem
     * @param message
     * @returns {boolean}
     */
    sendToastMsg(userItem, message) {
        if (userItem == null) {
            return false;
        }
        let o = { message };
        this.sendData(userItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_TOAST_MSG, o);
    };

    /**
     * 发送请求失败
     * @param userItem 用户
     * @param message 消息
     * @returns {boolean}
     * @constructor
     */
    sendRequestFailure(userItem, message, type?) {
        if (userItem == null) {
            return false;
        }
        let o = { message, type };

        this.sendData(userItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_REQUEST_FAILURE, o);
    };


    /**
     * 记录错误日记到数据库中
     * @param type
     * @param content
     */
    recordError(type, content) {
        this.sendLCData(corresCMD.RECORD_ERROR, { type: type, content: content });
    };



    //写入总结算
    // playerInfo: [{chairID,nickname,userID,roomCode,totalScore}]
    // roundDetail: [{replay_code, timestamp, score:[100,200,-400,100]}]
    writeBigGameResultLog(tableSetting, playerInfo, roundDetail) {
        // let uuid = ttutil.getUUID()
        // let timestamp = ttutil.getTimestamp()
        // let roomID = this.roomInfo.RoomID

        // //@ts-ignore
        // let { roomCode, clubID, baoxID } = tableSetting || {}
        // let writeData = { uuid, roomID, roomCode, clubID, baoxID, tableSetting, playerInfo, roundDetail }

        // let playerResult = []
        // for (let i = 0; i < playerInfo.length; i++) {
        //     let { userID, totalScore } = playerInfo[i]
        //     let item = { userID, uuid, roomID, totalScore, timestamp }
        //     playerResult.push(JSON.stringify(item)) //插入数据
        // }

        // this.send2LogServer("game_result", JSON.stringify(writeData)) //游戏数据
        // this.send2LogServer("player_game_result", playerResult) //玩家也要插入
    };


    /**
     * 金币流水
     * @param userID
     * @param addGold 增加的金币  
     * @param leftGold: 当前gold
     * @param desc: 描述
     */
    writeGoldRecord(userID, addGold, leftGold, desc) {
        let roomID = this.roomInfo.RoomID
        let timestamp = ttutil.getTimestamp()
        this.send2LogServer("gold_line", JSON.stringify({ userID, addGold, leftGold, desc, roomID, timestamp }))
    };

    //游戏日志
    //gameData 你要保存的对象
    writeGameLog(gameData) {
        let roomID = this.roomInfo.RoomID
        let timestamp = ttutil.getTimestamp()
        let gameResult = Object.assign(gameData, { roomID, timestamp })
        this.send2LogServer("game_log", [JSON.stringify(gameResult), JSON.stringify(gameResult), JSON.stringify(gameResult)])
    };


    /*
     *当接收到子游戏消息时
     */
    onSubGameNotice(data) {
        for (let i = 0; i < this.serverUserArray.length; ++i) {
            let userItem = this.serverUserArray[i];
            if (userItem == null) continue;
            this.sendData(userItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_FISH_NOTICE, data);
        }


    };


    onGetRoomDetail(session, data, callback) {

        let userArray = []
        for (const userID_key in this.userMap) {
            let userItem = this.userMap[userID_key]
            if (userItem && userItem.chairID != gameConst.INVALID_CHAIR) {
                let { userID, userStatus, tableID, chairID, isAndroid } = userItem
                userArray.push([userID, isAndroid, userStatus, tableID, chairID])
            }
        }

        let map = {}

        for (const key in this.userRoomMap) {
            let roomCode = Number(key)
            let table = this.userRoomMap[roomCode]
            map[roomCode] = table.tableID
        }
        


        callback && callback({ roomID: this.roomID, userArray,roomCodeMap:map })
    }

    onAdminDisMiss(session, data, callback) {

        let { roomCode } = data
        let table = this.userRoomMap[roomCode]
        logger.info("强制解散桌子", data)
        // logger.info("是否找到", roomCode, !!table)
        if (!table) { //没有就分配一张桌子给他
            callback && callback({ code: 2, info: "未找到该桌子" })
            return
        }

        table.onAdminJiesan()
        callback && callback({ code: 0, info: "解散成功" })

    }


    // 获取该游戏内所有玩家
    getAllUserInThisGame() {
        return Object.keys(this.userMap)
    }

    // 获取所有房间
    getAllRoomCodeInThisGame() {
        let infoArray = []
        let roomID = this.roomInfo.RoomID
        for (let index = 0; index < this.tableFrame.length; index++) {
            const table = this.tableFrame[index];
            if (table.getCurPlayerNum() <= 0) continue
            let info = {
                roomID,
                tableID: table.tableID,
                tableSetting: table.getTableUserData(),
                round: table.getCurRound(),
                players: table.getTablePlayers()
            }
            infoArray.push(info)
        }

        return infoArray
    }

    dealOffline() {
        for (const userID in this.userMap) {
            let userItem: ServerUserItem = this.userMap[userID]
            //超过五分钟提掉线
            if (userItem && userItem.online == 0 && userItem.offlineTs > 0 &&
                (Date.now() - userItem.offlineTs) >= gameconfig.offlineDelTime * 1000) {

                let table = this.tableFrame[userItem.tableID];
                if (!table) {
                    logger.error("删除掉线玩家,删除失败", userItem.userID, userItem.nickname)
                    return
                }
                table.onUserStandUp(userItem)
                logger.error("删除掉线玩家1", userItem.userID, userItem.nickname)
            }
        }

    }

    foreachTable(cb: (tableFrame: TableFrame) => void) {

        for (let index = 0; index < this.tableFrame.length; index++) {
            let table = this.tableFrame[index]
            cb && cb(table)
        }

    }


    /**
     * 全服广播
     *
     * @param {*} msg
     */
    broadCast(msg: any) {
        this.sendLCData(corresCMD.BROAD_CAST, msg);
    }

}



