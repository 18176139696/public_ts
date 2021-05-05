
import { gameConst, gameCMD, corresCMD } from "./define";
import { DisMiss } from "./DisMiss";
import { ttutil } from "./ttutil";
import { ServerUserItem } from "./ServerUserItem";
import { GameServer } from "./GameServer";


interface IWriteUserScore {
    Chair: number,
    Score: number
    Tax: number,
}


//每局详情
export interface IGameDetail {
    replayCode: string, //回放码
    round: number, //第几局
    time: number,//时间戳
    score: number[][]  //[[userID,score],[userID,score],] //这里用userID，可能座位会变
}

/**
 * 桌子类
 * @param id 桌子ID
 * @param roomInfo    房间信息
 * @param gameServer 游戏服务器
 * @constructor
 */
export class TableFrame {//游戏状态
    tableID = 0; //桌子号
    tableUserArray: ServerUserItem[] = []; //玩家数组
    tableWatcherMap = {}; //旁观者
    gameStatus = gameConst.GAME_STATUS_FREE; //游戏状态
    chairCount = 0; //椅子数量
    gameStart = false;
    gameMode = 0;
    REVENUE_DENOMINATOR = 1000;
    roomInfo: any = {};
    tableSetting = null; //桌子配置
    gameServer: GameServer = null;
    tableFrameSink = null; //桌子逻辑操作
    dismiss: DisMiss = null
    startTime = 0; //开始时间
    kickoutTimer = null //定时清掉所有人
    kickoutEndTime = 0; //什么时候清掉


    constructor(id, roomInfo, gameServer) {
        //游戏状态
        this.tableID = id; //桌子号
        this.chairCount = roomInfo["ChairCount"]; //游戏玩家
        this.gameMode = roomInfo["GameMode"];
        this.roomInfo = roomInfo;
        this.gameServer = gameServer;
        this.tableFrameSink = new TableFrameSink(this, this.roomInfo); //桌子逻辑操作

        if (gameconfig.Dismiss) {
            this.dismiss = new DisMiss(this)
        }
    }



    setTableUserData(config) {
        this.tableSetting = config;
        this.tableFrameSink && this.tableFrameSink.setTableUserData && this.tableFrameSink.setTableUserData();
    };

    getTableUserData() {
        if(gameconfig.GoldMode){
            return  gameconfig.tableUserData || {};
        }
        return this.tableSetting || {}
    };


    //真正开始的人数 <=chaircount
    getUserSetChairCount() {
        let tableSetting = this.getTableUserData()
        if (tableSetting && tableSetting.playerCount && tableSetting.playerCount > 1) { //这个以真实座位为准
            return tableSetting.playerCount
        }
        return this.chairCount
    };


    /**
     * 获取当前玩家个数
     * @returns {*}
     */
    getCurPlayerNum() {
        var userCount = 0
        for (var i = 0; i < this.chairCount; ++i) {
            var userItem = this.tableUserArray[i];
            if (userItem == null) continue;
            userCount++;
        }

        return userCount
    };

    /**
     * 获取房间信息
     * @returns {*}
     */
    getRoomInfo() {
        return this.roomInfo;
    };
    /**
     * 开始游戏
     */
    startGame() {

        //游戏没有开始且不是百人游戏的时候设置玩家状态
        if (!this.gameStart && this.gameMode != gameConst.START_MODE_HUNDRED) {
            for (var i = 0; i < this.chairCount; ++i) {
                var userItem = this.getTableUserItem(i);
                if (userItem != null) {
                    var userStatus = userItem.getUserStatus();
                    if (userStatus != gameConst.US_PLAYING) {
                        userItem.setUserStatus(gameConst.US_PLAYING, this.tableID, i);
                    }

                }
            }
        }

        //记录时间
        this.recordStartGameTime();

        this.gameStart = true;

        this.stopCloseTimer(); //清掉自动关闭
        this.sendKickoutPackate(null, true);

        this.tableFrameSink.onEventStartGame();

 
        this.sendTableStartData(); //房卡给大厅通知刷新游戏开始 
    };

    /**
     * 结束游戏
     * @param gameStatus 为游戏状态
     */
    concludeGame(gameStatus) {
        this.gameStart = false;
        this.gameStatus = gameStatus;


        for (var i = 0; i < this.chairCount; ++i) {
            var userItem = this.tableUserArray[i];
            if (!userItem) {
                continue;
            }
            userItem.setUserStatus(gameConst.US_SIT, this.tableID, i);
        }

        this.tableFrameSink.repositionSink();
        this.sendTableStatus();
    };


    /**
     * 发送桌子状态
     */
    sendTableStatus() {
        this.broadCastTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_GAME_STATUS, null, {
            gameStatus: this.gameStatus
        });
    };
    /**
     * 解散游戏
     */
    dismissGame() {

    };


    /**
     * 玩家掉线
     * @param chairID 椅子号
     * @param userItem 用户
     * @returns {boolean}
     */
    onUserOffline(userItem) {

        if (userItem instanceof ServerUserItem == false) {
            logger.error("performOfflineAction: userItem not instanceof ServerUserItem");
            return false;
        }
        var chairID = userItem.chairID
        if (chairID >= this.chairCount) {
            logger.error("performOfflineAction: chairID >= ", this.chairCount);
            return false;
        }

        if (userItem.tableID == null) return;
        if (userItem.chairID == null) return;

        //坐下条件判断
        logger.info("用户掉线, 用户ID: " + userItem.getUserID());

        this.setUserOnline(userItem, gameConst.ONLINE_DEF_OFFLINE) //通知掉线
        if (this.tableFrameSink.onActionOffline) {
            this.tableFrameSink.onActionOffline(chairID, userItem); //玩家掉线
        }

        return true;
    };

    onUserRelogin(userItem) {

        logger.info("玩家重新登录", userItem.nickname, userItem.online)
        this.setUserOnline(userItem, gameConst.ONLINE_DEF_ONLINE) //通知上线

        return true;
    };

    getCurRound() {
        let round = 0
        if (this.dismiss && this.tableFrameSink.getCurRound && this.tableFrameSink.getCurRound() > 0) { //还未开始
            round = this.tableFrameSink.getCurRound()
        }

        return round
    };

    checkStandup(userItem) {
        if (this.tableFrameSink.checkStandup) {
            return this.tableFrameSink.checkStandup(userItem)
        }
        return true
    };

    onUserStandUp(userItem) {
        //如果是观战玩家
        if (userItem && userItem.isWatcher()) {
            this.gameServer.deleteUserItem(userItem); //直接退出
            return;
        }
        let round = this.getCurRound()
        if (round > 0) { //开始了 就要直接判断了
            logger.info("onUserStandUp:round,", round)
            logger.info("请求解散", userItem.nickname, userItem.userID)
            this.dismiss.onUserDismissReq(userItem)

            return { code: 0, info: "正在解散" }
            //this.gameServer.sendLCData("UserStandUpSuccess", { userID: userItem.userID, success: 0 }); // 这里要通知 坐下失败 大厅解锁状态
        }
        else if (!this.checkStandup(userItem)) {
            return { code: 2, info: "您当前正在游戏,还不能退出" }
        }
        else {
            this.gameServer.deleteUserItem(userItem) //直接退出
            return { code: 0, info: "退出成功" }
        }
    }



    onAdminJiesan() {
        let round = this.getCurRound()
        logger.info("强制解散:round,", round)
        if (round > 0) { //开始了 就要直接判断了
            this.tableFrameSink.onEventConcludeGame(null, null, gameConst.GER_DISMISS);
        }
        else {
            for (let i = 0; i < this.getUserSetChairCount(); ++i) {
                let userItem = this.getTableUserItem(i);
                if (userItem) {
                    this.gameServer.deleteUserItem(userItem) //直接退出
                }
            }

        }
    };

    /**
     * 坐下操作
     * @param chairID 椅子号
     * @param userItem 用户
     * @returns {boolean}
     */
    performSitDownAction(chairID, userItem) {
        if (userItem instanceof ServerUserItem == false) {
            logger.error("performSitDownAction: userItem not instanceof ServerUserItem");
            return false;
        }

        if (chairID >= this.chairCount) {
            logger.error("performSitDownAction: chairID >= this.chairCount");
            return false;
        }

        if (userItem.tableID == null) return;
        if (userItem.chairID == null) return;

        var tableUserItem = this.getTableUserItem(chairID);

        if (tableUserItem != null) {
            logger.info("椅子已经被捷足先登");
            logger.info("椅子上的ID: " + tableUserItem.getUserID() + " 昵称: " + tableUserItem.getNickname() + " 是否为机器人: " + tableUserItem.isAndroid);
            this.gameServer.sendRequestFailure(userItem, "椅子已经被捷足先登");
            return false;
        }
        //坐下条件判断


        //坐下
        this.tableUserArray[chairID] = userItem;

        userItem.setUserStatus(gameConst.US_SIT, this.tableID, chairID);

        this.tableFrameSink.onActionUserSitDown(chairID, userItem);

        logger.info(`用户坐下成功: userID=${userItem.getUserID()} ,nickname=${userItem.nickname}, 
                tableID=${this.tableID}, chairID=${chairID}`);

        return true;
    };

    performStandUpActionNotNotifyPlaza(userItem) {
        if (userItem && userItem.isWatcher()) {
            delete this.getWatcher()[userItem.userID];
            return true;
        }

        if (userItem instanceof ServerUserItem == false) {
            logger.error("userItem not instanceof ServerUserItem");
            return true;
        }
        logger.info("performStandUpActionNotNotifyPlaza, 用户ID: " + userItem.getUserID());
        if (userItem.tableID != this.tableID) return true;
        if (userItem.chairID >= this.chairCount) return true;

        var tableUserItem = this.getTableUserItem(userItem.chairID);

        if (this.gameStart && userItem.userStatus == gameConst.US_PLAYING) {
            //结束游戏

            this.tableFrameSink.onEventConcludeGame(userItem.chairID, userItem, gameConst.GER_USER_LEAVE);

            //离开
            if (this.tableUserArray[userItem.chairID] != userItem)
                return true;
        }

        //玩家起立(非旁观玩家)
        if (tableUserItem == userItem) {
            this.tableFrameSink.onActionUserStandUp(userItem.chairID, userItem);
            this.tableUserArray[userItem.chairID] = null;

            if (this.efficacyStartGame()) {
                this.startGame();
            }
        }

        return true;
    };


    /**
     * 用户数量
     */
    getSitUserCount() {
        var userCount = 0;
        for (var i = 0; i < this.chairCount; ++i) {
            if (this.getTableUserItem(i)) {
                userCount++;
            }
        }

        return userCount;
    };

    /**
     * 获取位置玩家
     * @param chairID 椅子ID
     * @returns {*}
     */
    getTableUserItem(chairID) {
        if (chairID >= this.chairCount) return null;
        return this.tableUserArray[chairID];
    };


    /**
     * 设置游戏状态
     * @param gameStatus
     */
    setGameStatus(gameStatus) {
        this.gameStatus = gameStatus;
    };
    /**
     * 获取游戏状态
     * @returns {number|*}
     */
    getGameStatus() {
        return this.gameStatus;
    };
    /**
     * 获得空闲位置
     * @returns
     */
    getFreeChairID() {
        for (var i = 0; i < this.getUserSetChairCount(); ++i) {
            if (this.tableUserArray[i] == null)
                return i;
        }

        return null;
    };

    /**
     * 获得空闲位置
     * @returns
     */
    getChairInfoArray() {
        let info = []
        for (var i = 0; i < this.getUserSetChairCount(); ++i) {
            let userItem = this.getTableUserItem(i);
            if (userItem) {
                info.push(i);
                info.push(userItem.chairID);
            }
        }
        return info;
    };

    /**
     * 游戏事件主函数
     * @param subCMD 游戏消息命令
     * @param data 游戏数据
     * @param userItem 消息用户
     * @returns {boolean}
     */
    onEventSocketGame(subCMD, data, userItem) {
        if (userItem == null) return false;
        if (this.tableFrameSink == null) return false;

        return this.tableFrameSink.onGameMessageEvent(subCMD, data, userItem);
    };

    /**
     * 框架消息主函数
     * @param subCMD 游戏消息命令
     * @param data 数据
     * @param userItem 消息用户
     * @returns {boolean}
     */
    onEventSocketFrame(subCMD, data, userItem) {
        logger.info("tableFrame::onEventSocketFrame", userItem.nickname)
        switch (subCMD) {
            case gameCMD.SUB_GF_GAME_OPTION:
                var chairID = userItem.getChairID();
                //告诉自己桌子上又那些人
                // this.gameServer.sendUserInfoPacket(userItem)    
                //发送桌子状态
                this.gameServer.sendData(userItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_GAME_STATUS, {
                    gameStatus: this.gameStatus
                });

                this.sendKickoutPackate(chairID);
                //场景消息
                this.tableFrameSink.onEventSendGameScene(chairID, userItem, this.gameStatus);
                return true;

            case gameCMD.SUB_GF_USER_READY:
                var chairID = userItem.getChairID();
                if (this.getTableUserItem(chairID) != userItem) {
                    return false;
                }

                if (userItem.getUserStatus() != gameConst.US_SIT) {
                    return true;
                }
                //钩子事件 tableFrameSink的 onActionUserOnReady需要时在补充
                if (!this.efficacyStartGame()) {
                    userItem.setUserStatus(gameConst.US_READY, this.tableID, chairID);
                } else {
                    this.startGame();
                }

                return true;
            case gameCMD.SUB_GF_CANCEL_USER_READY:
                var chairID = userItem.getChairID();
                if (this.getTableUserItem(chairID) != userItem) {
                    return false;
                }

                if (userItem.getUserStatus() != gameConst.US_READY) {
                    return true;
                }
                //钩子事件 tableFrameSink的 onActionUserOnReady需要时在补充
                userItem.setUserStatus(gameConst.US_SIT, this.tableID, chairID);
                this.tableFrameSink.onUserCancelReady(chairID,userItem);
                return true;
            case gameCMD.SUB_GF_USER_CHAT:
                this.onUserChat(userItem, data)
                return true;
            case gameCMD.SUB_GF_DISMISS_AGREE:
                logger.info("用户同意解散", data)
                this.dismiss.onDismissAgree(userItem, data.agree)
                return true;
            case gameCMD.SUB_GF_USE_ITEM: //使用道具 item_id item_num chairID
                logger.info("使用道具", data)
                const { item_id, item_num = 1, userID, gameID } = data
                this.broadCastTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_USE_ITEM, null, { from: userItem.gameID, item_id, to: gameID });
                return true;
        }

        return false;
    };

    /**
     * 游戏开始判断
     * @returns {boolean}
     */
    efficacyStartGame() {
        //游戏开始或者是百人游戏时，不检测
        if (this.gameStart || this.gameMode == gameConst.START_MODE_HUNDRED) return false;

        var userCount = 0;

        for (var i = 0; i < this.chairCount; ++i) {
            var userItem = this.tableUserArray[i];
            if (userItem == null) continue;

            if (userItem.userStatus != gameConst.US_READY)
                return false;
            userCount++;
        }


        switch (Number(this.gameMode)) {
            //桌子上玩家准备好就开始 不要求满桌  如牛牛
            case gameConst.START_MODE_ALL_READY:
                return this.tableFrameSink.canStartGame(userCount);
            //满桌准备好开始游戏 如 斗地主 麻将之类
            case gameConst.START_MODE_FULL_READY:
                return userCount == this.getUserSetChairCount();
            //百人游戏让游戏自己去实现
            case gameConst.START_MODE_HUNDRED:
            default:
                return false;
        }

        return false;
    };

    /**
     * 记录游戏开始时间
     */
    recordStartGameTime() {
        var date = new Date();
        this.startTime = date.getTime();
    };

    /**
     * 获取游戏时长
     * @return number 秒数
     */
    getGameTime() {
        var date = new Date();
        var passTime = Math.floor((date.getTime() - this.startTime) / 1000);
        return passTime;
    };

    /**
     * 广播本桌
     * @param mainCMD
     * @param subCMD
     * @param chairID
     * @param data
     */
    broadCastTableData(mainCMD, subCMD, chairID, data) {
        this.sendTableData(mainCMD, subCMD, chairID, data);
    };

    /**
     * 发送游戏消息
     * @param mainCMD 主命令
     * @param subCMD 子命令
     * @param chairID 椅子号
     * @param data 数据
     * @param excludeIDs  那些userID不发
     * @returns {boolean}
     */
    sendTableData(mainCMD, subCMD, chairID, data, excludeIDs = null) {
        //构造对象
        if (chairID == null) {
            this.sendToAll(mainCMD, subCMD, data, excludeIDs)
            return true;
        } else {
            this.sendToPlayer(mainCMD, subCMD, chairID, data)
            return true;
        }
    };

    /**
     * 广播消息
     *
     * @param {*} mainCMD
     * @param {*} subCMD
     * @param {*} data
     * @param {*} [excludeUserIDArray=[]] //不发给谁[userID]
     * @param {boolean} [includeWatcher=true] //是否发给观战者
     * @returns
     */
    sendToAll(mainCMD, subCMD, data, excludeUserIDArray = [], includeWatcher = true) {
        //构造对象
        for (var i = 0; i < this.chairCount; ++i) {
            var userItem = this.getTableUserItem(i);
            if (userItem == null) continue;
            if (excludeUserIDArray && excludeUserIDArray.length > 0 && excludeUserIDArray.indexOf(userItem.userID) > -1) {
                continue;
            }
            this.gameServer.sendData(userItem, mainCMD, subCMD, data);
        }

        //发送给观战者
        if (includeWatcher) {
            this.send2Watcher(mainCMD, subCMD, data, excludeUserIDArray) //发送给所有观战者}  
        };
        return true;
    }

    /**
     * 单独发送给某个玩家
     *
     * @param {*} mainCMD
     * @param {*} subCMD
     * @param {*} chairID
     * @param {*} data
     * @returns
     */
    sendToPlayer(mainCMD, subCMD, chairID, data) {
        var userItem = this.getTableUserItem(chairID);
        if (userItem == null) return true;
        this.gameServer.sendData(userItem, mainCMD, subCMD, data);
        return true;
    }


    //发送给所有观战者 excludeIDs除外
    send2Watcher(mainCMD, subCMD, data, excludeUserIDArray) {
        let watchers = this.getWatcher();
        for (var userID in watchers) {
            let userItem = watchers[userID];
            if (excludeUserIDArray && excludeUserIDArray.length > 0 && excludeUserIDArray.indexOf(userItem.userID) > -1) {
                continue;
            }
            this.gameServer.sendData(userItem, mainCMD, subCMD, data);
        }
    };


    /**
     * 游戏场景消息
     * @param userItem 用户
     * @param msg 发送消息
     * @returns {boolean}
     */
    sendGameScene(userItem, msg) {
        if (userItem == null) return false;
        this.gameServer.sendData(userItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_GAME_SCENE, msg);
        return true;
    };


    /**
     * 写分操作
     * @param scoreInfoArray 为一个Array, array里面为对象，具体参考writeUserScore
     * @returns {boolean}
     */
    writeTableScore(scoreInfoArray) {

        for (var i in scoreInfoArray) {
            this.writeUserScore(scoreInfoArray[i]);
        }

        return true;
    };
    /**
     * 个人写分操作
     * @param scoreInfo
     *        具体对象为
     *        {
     *          Chair:x,
     *          Score:x,    //为游戏分数减去税收的值
     *          Tax:x，
     *      }
     * @returns {boolean}
     */
    writeUserScore(scoreInfo: IWriteUserScore) {
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

        var o: any = {};
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

        //不是体验房才写分
        if (!gameconfig.FreeMode) {
            this.gameServer.sendLCData(corresCMD.WRITE_SCORE, o);
            return o //返回数据
        }

        return false


    };


    /**
     * 写分 
     */
    bulkWriteScore(scoreArray) {
        this.gameServer.sendLCData(corresCMD.WRITE_SCORE, scoreArray);
    };



    // desc 描述
    writeDiamond(userID, diamond, desc) {
        //不是体验房才写分
        if (!gameconfig.FreeMode) {
            this.gameServer.sendLCData(corresCMD.WRITE_DIAMOND, { userID, diamond, desc });
        }
    };

    autoCostDiamond() {

        //不是体验房才写分
        if (!gameconfig.FreeMode) {
            let tableSetting = this.getTableUserData()

            let playersArray = []
            for (let i = 0; i < this.getUserSetChairCount(); ++i) {
                let userItem = this.getTableUserItem(i);
                if (userItem) {
                    playersArray.push(userItem.userID)
                }
            }

            this.gameServer.sendLCData(corresCMD.COST_DIAMOND, { tableSetting, userIDs: playersArray });
            logger.info("开始扣费", { tableSetting, userIDs: playersArray })
        }


    };
    costDiamond() {
        logger.error("这个接口废弃掉了，不需要再调用，第一局系统会自动调用扣费")
        return

    };

    writeScoreArray(infoArray) {
        //不是体验房才写分
        if (!gameconfig.FreeMode) {
            this.gameServer.sendLCData(corresCMD.WRITE_SCORE_NEW, infoArray);
        }
    };




    /**
     * 检查分数不够退出, 一般正常游戏结束后调用，在this.concludeGame(status)后调用，参数为写分的结构体
     *  * @param scoreInfo
     *        具体对象为
     *        {
     *          Chair:x,
     *          Score:x,    //为游戏分数减去税收的值
     *          Tax:x
     *      }
     */
    checkUserScore(chairID) {
        var userItem = this.getTableUserItem(chairID);
        if (userItem == null) return false;

        var score = userItem.getUserScore();
        if (score < this.roomInfo.MinSitScore) {
            //发送数据
            this.gameServer.sendRequestFailure(userItem, "您的分数不够继续游戏，请关闭游戏窗口", gameConst.KICK_TYPE);
            this.gameServer.deleteUserItem(userItem, true);
        }
    };

    /**
     * 检查个人分数不够退出  一般正常游戏结束后调用，，在this.concludeGame(status)后调用，参数为写分的结构体
     * @param scoreInfoArray 为一个Array, array里面为对象，具体参考writeUserScore
     */
    checkTableUsersScore() {
        for (var i = 0; i < this.chairCount; ++i) {
            this.checkUserScore(i);
        }

        return true;
    };

    /**
     * 发送  捕鱼事件， 协调服会 回发所有捕鱼服务端
     * @param userItem
     * @param data
     * @returns {boolean}
     */
    sendFishNotice(data) {

        var o: any = {};
        o.data = data || {};
        o.data.gameName = this.roomInfo.GameName;
        o.data.roomName = this.roomInfo.RoomName;
        o.data.tableID = this.tableID;


        this.gameServer.onSubGameNotice(o);

    };
    /**
     * 计算税收
     * @param chair 用户椅子
     * @param score 用户分数
     * @param isSysBanker 是不是系统坐庄,系统坐庄不需要判断椅子号（椅子为0xffff）
     * @returns {number} 返回税收
     */
    calculateRevenue(chair, score, isSysBanker = false) {
        if (isSysBanker) {
            var revenue = score * this.roomInfo["Revenue"] / this.REVENUE_DENOMINATOR;
            return Math.floor(revenue);
        }
        if (chair >= this.chairCount) return 0;
        if (this.roomInfo["Revenue"] > 0 && score > 0) {
            var userItem = this.getTableUserItem(chair);
            if (userItem == null) return 0;
            var revenue = score * this.roomInfo["Revenue"] / this.REVENUE_DENOMINATOR;
            return Math.floor(revenue);
        }
        return 0;
    };


    /**
     * 发送用户数据 本桌一个指定的userItem
     * @param mainCMD
     * @param subCMD
     * @param userItem
     * @param data
     */
    sendTableUserItemData(userItem, subCMD, data) {
        if (!userItem) return false;
        if (this.tableID != userItem.getTableID()) return false;

        this.gameServer.sendData(userItem, gameCMD.MDM_GF_GAME, subCMD, data);
        return true;
    };

    /**
     * 踢出用户
     * @param chairID 椅子号
     * @param msg{string} 踢出原因
     * @param type
     */
    kickOutUserItem(chairID, msg, type?) {
        var userItem = this.getTableUserItem(chairID);
        if (userItem == null) return;
        //发送数据
        this.gameServer.sendRequestFailure(userItem, msg, type);
        this.gameServer.deleteUserItem(userItem, true);

    };

    //发送房间信息
    getRoomInfoPackage() {
        let tableSetting = this.getTableUserData();

        if (tableSetting) {
            tableSetting.round = this.getCurRound()
        }

        //发送房间信息
        let msg: any = {
            gameName: this.roomInfo.GameName,
            roomName: this.roomInfo.RoomName,
            tableID: this.tableID,
            chairCount: this.getUserSetChairCount(),
            tableSetting
        }

        if (this.dismiss && this.dismiss.getLeftTime() > 0) //正在解散
        {
            msg.dismissData = this.dismiss.getDismissData()
        }


        return msg
        // this.gameServer.sendData(userItem, gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_ROOM_INFO, msg);
    };


    //发送房间信息
    getUserInfoPacakge(serverUserItem) {
        let userInfo = []
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

        //自己第一个进入
        userInfo.push(copyAttr(serverUserItem));
        for (var i = 0; i < this.getUserSetChairCount(); ++i) {
            var userItem = this.getTableUserItem(i);
            if (userItem == null || userItem == serverUserItem) continue;
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

        return userInfo
    };



    onUserChat(userItem, data) {
        //发送房间信息
        var nickname = userItem.nickname
        var chairID = userItem.chairID
        var text = data.text
        logger.info("onUserChat", data)
        this.broadCastTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_USER_CHAT, null, {
            nickname,
            chairID,
            text
        });


    };

    //踢出所有人
    kickoutAllUser(notify = true) {
        logger.info("踢掉所有人")
        for (var i = 0; i < this.chairCount; i++) {
            var chairID = i
            var userItem = this.getTableUserItem(chairID);
            if (userItem) {
                this.gameServer.deleteUserItem(userItem, notify)
            }
        }

        let watchers = this.getWatcher();
        for (let userID in watchers) {
            let userItem = watchers[userID];
            if (userItem) {
                this.gameServer.deleteUserItem(userItem, notify)
            }
        }

    };
    //玩家上下线
    setUserOnline(userItem: ServerUserItem, online) {

        userItem.online = online;
        this.sendTableData(gameCMD.MDM_GR_USER, gameCMD.SUB_GR_USER_ONLINE, null, {
            chairID: userItem.chairID,
            online: userItem.online
        }) //广播掉线

        if (online == gameConst.ONLINE_DEF_ONLINE) {
            userItem.offlineTs = 0;
        }
        else {
            userItem.offlineTs = Date.now() //记录掉线时间
        }

    };

    //添加观战者
    addWatcher(userItem) {
        this.tableWatcherMap[userItem.userID] = userItem;

    };


    getWatcher() {
        return this.tableWatcherMap
    };


    //开始计时关闭
    startCloseTimer() {
        if (gameconfig.AutoKickoutTime) { //没自动开始就剔除所有人
            this.stopCloseTimer();
            this.kickoutEndTime = Math.floor(Date.now() / 1000) + gameconfig.AutoKickoutTime //踢人时间
            logger.error("startCloseTimer", this.kickoutEndTime)
            this.kickoutTimer = setTimeout(() => {
                this.kickoutTimer = null
                this.kickoutAllUser()
            }, gameconfig.AutoKickoutTime * 1000);

        }
    };

    stopCloseTimer() {
        if (gameconfig.AutoKickoutTime) { //没自动开始就剔除所有人
            this.kickoutTimer && clearTimeout(this.kickoutTimer);
            this.kickoutTimer = null
        }
    };

    //发送房间解散消息
    getKickoutLeftTime() {
        return this.kickoutEndTime - Math.floor(Date.now() / 1000)
    };

    //发送房间消息
    sendKickoutPackate(chairID, isClose = false) {
        if (gameconfig.AutoKickoutTime) { //没自动开始就剔除所有人
            let dialogName = "AutoCloseRoom"
            if (isClose) {
                this.sendDialogCMD(chairID, { isClose: isClose, dialogName })
            } else {
                if (this.kickoutTimer) {
                    let leftTime = this.getKickoutLeftTime();
                    let dialogData = { dialogName, leftTime }
                    this.sendDialogCMD(chairID, dialogData)
                }

            }

        }

    };
    //给客户端发送对话框
    sendDialogCMD(chairID, dialogData) {
        this.sendTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_CMD_DIALOG, chairID, dialogData);
    };


    //发送房间消息
    getTablePlayers() {
        let chairInfo = []
        for (var i = 0; i < this.chairCount; i++) {
            var chairID = i
            var userItem = this.getTableUserItem(chairID);
            if (userItem) {
                chairInfo[chairID] = userItem.userID
            }
        }
        return chairInfo
    };


    private getPlayerArray() {
        let playerArray = []
        for (let i = 0; i < this.getUserSetChairCount(); ++i) {
            let userItem = this.getTableUserItem(i);
            if (userItem) {
                playerArray.push(userItem)
            }
        }

        return playerArray

    }


    /**
     * 战绩2.0 减少冗余
     *
     * @param {number[]} totalScore  总结算得分[12,20,-10,-22]
     * @param {IGameDetail[]} gameDetailArray 每局得分
     */
    writeGameResult2(totalScore: number[], gameDetailArray: IGameDetail[],gameEndMsgArray:any[]= []) {
        let playerArray = this.getPlayerArray()
        this.writeGameResultForCustom(playerArray, totalScore, gameEndMsgArray, gameDetailArray)
    }

    //totalScore 总结算得分[12,20,-10,-22]
    //gameResultArray 你的每局小结算数组[]
    writeGameResult(totalScore, gameResultArray) {
        let playerArray = this.getPlayerArray()
        this.writeGameResultForCustom(playerArray, totalScore, gameResultArray)

    };

    //zp:写入战绩自定义方法
    //参数一：玩家数组
    //参数二：玩家总分数组
    //参数三：每局详情,数组
    writeGameResultForCustom(playerArray, totalScore, gameResultArray, gameDetailArray = []) {
        try {
            let tableSetting = this.getTableUserData()
            let uuid = ttutil.getUUID()
            let roomID = this.roomInfo.RoomID

            let timestamp = ttutil.getTimestamp()
            let { roomCode, clubID, baoxID, } = tableSetting

            let playerResult = []
            let playersArray = []
            let clubScoreInfoArray = []

            let biggestScore = 0// 赢的最多的分数
            let sortScore = totalScore.slice(0).sort((a, b) => { return b - a }) //从大到小排列
            if (sortScore.length > 0) {
                biggestScore = sortScore[0]
            }

            let bigWinnerUserID = 0

            for (let i = 0; i < playerArray.length; ++i) {
                let userItem = playerArray[i];
                if (userItem) {
                    let { userID, gameID, nickname, head, diamond } = userItem
                    let score = totalScore[i] || 0
                    let bigWinner = 0
                    if (score == biggestScore) {
                        bigWinner = 1 //大赢家
                        bigWinnerUserID = userID
                    }
                    playersArray.push({ chairID: i, userID, gameID, nickname, head, score, diamond, bigWinner })
                    clubScoreInfoArray.push({ clubID, userID, score, baoxID, bigWinner })
                    let item = { userID, uuid, roomID, score, timestamp, clubID, bigWinner }
                    playerResult.push(JSON.stringify(item)) //插入数据
                }
            }

            let players = JSON.stringify(playersArray) //在场玩家
            let json = JSON.stringify(gameResultArray) //每局详情
            let totalScore_str = JSON.stringify(totalScore)//总结算积分
            let tableSetting_str = JSON.stringify(tableSetting) //总结算积分
            let gameDetail_str = JSON.stringify(gameDetailArray)

            let writeData = {
                uuid, roomID, baoxID, roomCode, clubID,
                gameName: this.roomInfo.RoomName,
                moduleEnName: this.roomInfo.moduleEnName,
                timestamp, bigWinner: bigWinnerUserID,
                tableSetting: tableSetting_str, players, score: totalScore_str, json,
                gameDetail: gameDetail_str
            }
            if (clubID) {
                this.gameServer.sendLCData(corresCMD.SAVE_CLUB_SCORE, { tableSetting, clubScoreInfoArray });//俱乐部积分存档
            }

            this.gameServer.send2LogServer("game_result", JSON.stringify(writeData)) //游戏数据
            this.gameServer.send2LogServer("player_game_result", playerResult) //玩家也要插入
        }
        catch (err) {
            logger.error("totalScore", totalScore)
            logger.error("gameResultArray", gameResultArray)
            logger.error("写入战绩错误", err)
        }
    };

    //游戏录像回放
    //replayData 你要保存的对象  返回key
    writeGameReplay(round, replayData, gameEndInfo = {}) {
        if (this.getGameStatus() == gameConst.GAME_STATUS_FREE) return
        try {
            let tableSetting = this.getTableUserData() || {}
            let players = this.getPlayerInfoArray()
            let { roomCode, clubID, baoxID } = tableSetting
            let roomID = this.roomInfo.RoomID
            let timestamp = ttutil.getTimestamp()
            let randomNum = Math.floor(Math.random() * 900000) + 100000
            let uuid = `${roomCode}_${round}_${timestamp}_${randomNum}`

            let gameResult = {
                moduleEnName: this.roomInfo.moduleEnName,
                uuid, roomID, roomCode, clubID, round, timestamp,
                tableSetting: JSON.stringify(tableSetting),
                players: JSON.stringify(players),
                json: JSON.stringify(replayData),
                gameEndInfo: JSON.stringify(gameEndInfo)
            }
            this.gameServer.send2LogServer("game_replay", JSON.stringify(gameResult))
            return uuid
        }
        catch (err) {
            logger.error("写入战绩错误", err)
        }
    };



    getPlayerInfoArray() {
        let playersArray = []
        for (let i = 0; i < this.getUserSetChairCount(); ++i) {
            let userItem = this.getTableUserItem(i);
            if (userItem) {
                let { userID, gameID, nickname, head, diamond, score } = userItem
                playersArray.push({ chairID: i, userID, gameID, nickname, head, score, diamond })

            }
        }

        return playersArray
    }

    sendTableStartData() {
        if (!gameconfig.FreeMode) {
            let tableSetting = this.getTableUserData()
            let { roomCode = 0 } = tableSetting
            if (roomCode) //房卡才发吧
            {
                let roomID = this.roomInfo.RoomID
                let tableID = this.tableID
                let round = this.getCurRound()
                let data = {
                    roomID,
                    tableID,
                    round,
                    tableSetting,
                    players: this.getTablePlayers()
                }
                this.gameServer.sendLCData(corresCMD.TABLE_START, data);
                logger.info("游戏桌子开始 发送刷新数据", data)
            }

        }

    }

}




