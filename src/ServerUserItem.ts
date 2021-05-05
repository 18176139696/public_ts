
import { gameConst, gameEvent, gameCMD } from "./define";
export  class ServerUserItem {

    userID = null;							//用户ID
    gameID = null;                           //游戏ID
    tableID = null;		//桌子号
    chairID = null;		//椅子号
    userStatus = gameConst.US_FREE;			//玩家状态
    session = null;						//玩家socket
    gameServer = null;					//游戏服务器
    score = 0;							//分数
    diamond = 0;							//钻石
    nickname = "";							//玩家昵称
    sex = 0;							//0：男 1：女
    isAndroid = 0;							//是否是机器人
    vipLevel = 0;                   //会员等级
    weight = 1.0;							//输赢权值
    otherInfo = null;                    //其它信息
    markDelete = false;                //是否标志要被删除了
    online = 0;                //是否在线
    offlineTs = 0;                //下线时间戳
    initialScore = 0;                   //初始欢乐豆
    
    head = "http://5b0988e595225.cdn.sohucs.com/images/20171227/db32c56c1ca748968550ddcc48bd0a9e.jpeg";
    cards: number[] = []

    constructor(session, gameServer) {
        this.session = session;						//玩家socket
        this.gameServer = gameServer;					//游戏服务器

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
    /**
     * 设置用户状态
     * @param userStatus 状态
     * @param tableID 桌子号
     * @param chairID 椅子号
     */
    setUserStatus(userStatus, tableID, chairID) {
        var oldTableID = this.tableID;
        var oldChairID = this.chairID;
        var oldStatus = this.userStatus;
        //新的信息
        this.tableID = tableID;
        this.chairID = chairID;
        this.userStatus = userStatus;
        //提交玩家变化事件
        //this.gameServer.emit(gameEvent.EVENT_USER_STATUS, this, oldTableID, oldChairID, oldStatus);
        this.gameServer.eventUserItemStatus(this, oldTableID, oldChairID, oldStatus);
    }

    /**
     * 设置用户状态不通知服务器
     */
    setUserStatusNoNotify(userStatus, tableID, chairID) {
        //新的信息
        this.tableID = tableID;
        this.chairID = chairID;
        this.userStatus = userStatus;
    }

    /**
     * 设置用户分数
     * @param newScore 新分数
     */
    setUserScore(newScore) {
        this.score = newScore;
        this.gameServer.emit(gameEvent.EVENT_USER_SCORE, this);
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

    isWatcher () {
        return this.chairID == 0xFFFF;
    };
}
