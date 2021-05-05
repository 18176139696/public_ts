"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var io = require('socket.io');
const C_USER_STAND_UP = 1102;
const C_LOGIN_BY_USER_ID = 1002;
class SocketServer {
    constructor(gameServer, port) {
        this.socketMap = {};
        this.sidMap = {};
        this.nowSocketID = 1;
        this.IO = null;
        this.gameServer = null;
        this.PORT = 0;
        this.gameServer = gameServer;
        this.PORT = port;
    }
    ;
    start() {
        logger.info("端口号" + this.PORT);
        this.IO = io.listen(this.PORT);
        this.IO.on("connection", this.onConnect.bind(this));
        this.gameServer.onAsynEvent();
    }
    ;
    stop() {
        this.IO && this.IO.close();
    }
    ;
    addSocket(socket) {
        this.nowSocketID++;
        var nowSocketID = this.nowSocketID;
        this.socketMap[nowSocketID] = socket;
        socket.socketID = nowSocketID;
        logger.info("新连接", nowSocketID, "IP:", socket.handshake.address.substr(7), socket.id);
        return nowSocketID;
    }
    ;
    delSocket(socket) {
        delete this.socketMap[socket.socketID];
        delete this.sidMap[socket.sid];
    }
    ;
    bindSocket(sid, socketID) {
        var socket = this.socketMap[socketID];
        if (socket) {
            this.sidMap[sid] = socket;
            socket.sid = sid;
        }
    }
    getSocket(sid) {
        return this.sidMap[sid];
    }
    sendMsg(sid, session, eventName, data) {
        var socket = this.getSocket(sid);
        if (socket) {
            if (gameconfig.Single) {
                socket.emit("msg", eventName, data);
            }
            else {
                socket.emit("msg", session, eventName, data);
            }
        }
        else {
            logger.error("发送消息失败,未找到:", sid);
        }
    }
    sendBySocketID(socketID, session, eventName, data) {
        var socket = this.socketMap[socketID];
        if (socket) {
            if (gameconfig.Single) {
                socket.emit("msg", eventName, data);
            }
            else {
                socket.emit("msg", session, eventName, data);
            }
        }
    }
    broadCast(session, eventName, data) {
        for (var sid in this.sidMap) {
            var socket = this.sidMap[sid];
            socket.emit("msg", session, eventName, data);
        }
    }
    onError(socket, err) {
        logger.error("onError", err);
    }
    ;
    onDisConnect(socket, reason) {
        logger.error("onDisConnect", reason);
    }
    ;
    getFreePos() {
        for (var i = 0; i < this.gameServer.tableFrame.length; i++) {
            var tableFrame = this.gameServer.tableFrame[i];
            var chairID = tableFrame.getFreeChairID();
            if (chairID != null) {
                return { tableID: i, chairID };
            }
        }
    }
    onConnect(socket) {
        var socketID = this.addSocket(socket);
        if (gameconfig.Single) {
            var session = {
                local: 1,
                cid: socketID,
                socketID,
                userID: 0,
                sid: socketID,
                gate: socketID,
            };
            this.bindSocket(socketID, socketID);
            socket.on("msg", this.onLocalMessage.bind(this, socket, session));
            socket.on("disconnect", this.onLocalDisConnect.bind(this, socket, session));
            socket.on("error", this.onError.bind(this, socket, session));
        }
        else {
            let query = socket.handshake.query;
            let plazaKey = gameconfig.plazaKey || "whosyourdaddy";
            if (query.plazaKey == plazaKey) {
                socket.on("msg", this.onMessage.bind(this, socket));
                socket.on("disconnect", this.onDisConnect.bind(this, socket));
                socket.on("error", this.onError.bind(this, socket));
                this.bindSocket(query.serverid, socket.socketID);
            }
            else {
                logger.error("key验证失败", query.plazaKey);
                socket.disconnect();
            }
        }
    }
    ;
    onMessage(socket, session, eventName, data) {
        this.gameServer.onClientSocketEvent(session, data);
    }
    ;
    onLocalMessage(socket, session, eventName, data) {
        logger.info("onMessage", session, eventName, data);
        if (eventName == C_LOGIN_BY_USER_ID) {
            let userID = data.userID || 0;
            this.createTestSocket(socket, session, userID);
        }
        else if (eventName == C_USER_STAND_UP) {
            let data = { userID: session.userID };
            this.gameServer.onUserStandUp(session, data);
        }
        else {
            this.onMessage(socket, session, eventName, data);
        }
    }
    ;
    onLocalDisConnect(socket, session) {
        let data = { userID: session.userID };
        this.gameServer.onUserOffline(session, data);
    }
    ;
    onAuth(socket, data) {
        let plazaKey = gameconfig.plazaKey || "whosyourdaddy";
        if (data.key == plazaKey) {
            var sid = data.sid;
            this.bindSocket(sid, socket.socketID);
            this.sendMsg(sid, {}, "authOK", { sid: this.gameServer.roomInfo.RoomID });
            logger.debug("认证成功:", sid);
        }
        else {
            logger.error("auth.error", data);
        }
    }
    ;
    createTestSocket(socket, session, userID) {
        if (userID) {
            session.userID = userID;
            var userItem = this.gameServer.getUserItemByUserID(userID);
            if (userItem) {
                this.gameServer.gateServer.sendMsg(session.gate, session, C_LOGIN_BY_USER_ID, { code: 0, info: { userID, roomID: 222, nickname: "relogin", uuid: "12312" } });
                return;
            }
        }
        var pos = this.getFreePos();
        if (!pos) {
            logger.error("连接失败，没有有效的座位了");
            socket.disconnect("连接失败，没有有效的座位了");
            return;
        }
        var tableFrame = this.gameServer.tableFrame[pos.tableID];
        let { tableID, chairID } = pos;
        logger.info("坐下分配桌子", pos);
        if (!userID) {
            for (var i = 1; i < 1000; i++) {
                let freeUserID = i;
                if (!this.gameServer.getUserItemByUserID(freeUserID)) {
                    userID = freeUserID;
                    break;
                }
            }
        }
        let headList = ["http://ae01.alicdn.com/kf/HTB1C5vQe8Gw3KVjSZFw762Q2FXaK.png",
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
        var info = {};
        session.userID = userID;
        info.session = session;
        info.userID = userID;
        info.gameID = 100000 + userID;
        info.tableID = tableID;
        info.chairID = chairID;
        info.score = 20000012;
        info.nickname = "真实玩家" + userID;
        info.sex = 0;
        info.head = headList[Math.floor(Math.random() * headList.length)];
        info.isAndroid = 0;
        info.vipLevel = 10;
        let tableSetting = gameconfig.tableUserData;
        if (userID > 100) {
            info.isWatcher = true;
        }
        this.gameServer.onLCUserSitDown(session, { userID, tableID, tableSetting, session, userInfo: info });
        this.gameServer.gateServer.sendMsg(session.gate, session, C_LOGIN_BY_USER_ID, { code: 0, info: { userID, roomID: 222, nickname: info.nickname, uuid: "12312" } });
        console.info("用户登录ID: " + info.userID + " \n主动请求");
    }
    ;
}
exports.SocketServer = SocketServer;
