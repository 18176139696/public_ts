import { gameConst, gameCMD } from "./define";
import {TableFrame} from "./TableFrame";


export abstract class ITableFrameSink {
    roomInfo: any;
    chairCount: number; //椅子数
    tableFrame: TableFrame; //桌子框架类
    minReadyCount:number  = 2;//客戶端不传值就使用此默认值
    private timeMng = []; //计时器管理器

    constructor(tableFrame, roomInfo) {
        this.tableFrame = tableFrame;					//桌子框架类
        this.roomInfo = roomInfo;						//房间信息 
        this.chairCount = roomInfo["ChairCount"];		//椅子数
        this.timeMng = [];								//计时器管理器
    }

    abstract onGameMessageEvent(subCMD, data, userItem) //游戏消息事件
    abstract onEventSendGameScene(chairID, userItem, gameStatus) //场景消息

    abstract onActionOffline(chairID, userItem)  //掉线 
    abstract onActionUserStandUp(chair, userItem)  //玩家起立
    abstract onActionUserSitDown(chair, userItem)  //玩家坐下

    abstract repositionSink() //复位桌子（ableFrame.concludeGame 回调该方法）
    abstract onEventStartGame() //游戏开始，上层回调此函数
    abstract onGameConculde() //游戏结束

    abstract checkStandup(userItem): boolean; //点退出的时候,问sink，该玩家是否能够退出


    onDismiss() { }; //游戏解散(房卡需要重写这个函数)

    /**
     * 游戏开始，上层回调此函数 处理完显示调用 this.tableFrame.concludeGame函数
     */
    onEventConcludeGame(chair, userItem, concludeReason) {
        switch (concludeReason) {
            case gameConst.GER_NORMAL:
                this.onGameConculde();
                return true;

            case gameConst.GER_USER_LEAVE:
            case gameConst.GER_NETWORK_ERROR:
                return true;

            case gameConst.GER_DISMISS:
                this.onDismiss()
                return true;

            default:
                return false;
        }
    };



    /**
     * 广播游戏消息
     * @param subCMD
     * @param chairID
     * @param data
     * @param onlyPlaying  是否只是发送给在玩的玩家， 非旁观用户
     */
    broadCastGameData(subCMD, chairID, data, onlyPlaying = null) {
        //chairID = chairID == null ? gameConst.INVALID_CHAIR : chairID;

        if (onlyPlaying) {
            this.tableFrame.sendTableData(gameCMD.MDM_GF_GAME, subCMD, chairID, data);
        }
        else {
            this.tableFrame.broadCastTableData(gameCMD.MDM_GF_GAME, subCMD, chairID, data);
        }
    };

    /**
     * 游戏定时器
     * @param func 回调函数
     * @param timerID 计时器ID
     * @param time 时间
     */
    setGameTimer(func, timerID, time, ...params: any[]) {
        var that = this;
        var args = null;
        if (arguments.length > 3)
            args = Array.prototype.slice.call(arguments, 3);	//貌似性能不好？

        this.killGameTimer(timerID);
        var timer = setTimeout(function () {

            for (var i = 0; i < that.timeMng.length; ++i) {
                if (that.timeMng[i].value == timer) {
                    that.timeMng.splice(i, 1);
                    break;
                }
            }
            func.apply(that, args);
        }, time * 1000);

        that.timeMng.push({ key: timerID, value: timer });
    };

    /**
     * 删除定时器
     * @param timerID
     */
    killGameTimer(timerID) {
        for (var i = 0; i < this.timeMng.length; ++i) {
            if (this.timeMng[i].key == timerID) {
                clearTimeout(this.timeMng[i].value);
                this.timeMng.splice(i, 1);
                break;
            }
        }
    };

    clearAllTimer() {
        for (var i = 0; i < this.timeMng.length; ++i) {
            clearTimeout(this.timeMng[i].value);
        }
        this.timeMng.length = 0;
    };
    //用户写分
    WriteScore(chairID,addScore) {
        //未下注不写分
        if(addScore <= 0 ) return 0;
        let tax = addScore>0?Math.floor(this.roomInfo.Revenue * addScore):0;
        let scoreInfo = {
            Chair: chairID,
            Score: addScore,
            Tax: tax
        };
        if(addScore > 0){
            scoreInfo.Score -= tax;
        }
        this.tableFrame.writeUserScore(scoreInfo);
        return  tax;
    }

    //START_MODE_ALL_READY模式 准备后判断游戏能否开始
    canStartGame(userCount: number): boolean {
        let curCount = this.tableFrame.getCurPlayerNum();
        let tableSeting = this.tableFrame.getTableUserData();
        let minReadyCount = this.minReadyCount;
        if (tableSeting && tableSeting.minReadyCount) {
            minReadyCount = tableSeting.minReadyCount;
        }
        return (userCount  >= curCount && userCount >= minReadyCount)
    }

    //用户取消准备
    onUserCancelReady(chairID: any, userItem: any){

    }
}