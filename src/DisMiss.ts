import { gameCMD, gameConst } from "./define";
import {TableFrame} from "./TableFrame";


const JIESAN_NULL = -1
const JIESAN_NOT_AGREE = 0
const JIESAN_AGREE = 1

/**
 * 桌子类
 * @param id 桌子ID
 * @param roomInfo    房间信息
 * @param gameServer 游戏服务器
 * @constructor
 */

export  class DisMiss {
    tableFrame:TableFrame = null
    dismissEndTime = 0; //解散时间
    dismissTimer = null;
    dismissAgreeData = [];
    starter = null;


    constructor(tableFrame) {
        this.tableFrame = tableFrame
    }



    //解散时间到 默认都同意解散 
    onDismissTimeout() {
        this.doDismissGame()
    };


    //还有多少秒解散
    getLeftTime() {
        return this.dismissEndTime - Math.floor(Date.now() / 1000)
    };

    //获取当前解散数据 
    getDismissData() {
        let lefTime = this.getLeftTime()
        let agreeData = this.dismissAgreeData;
        return { lefTime, agreeData, starter: this.starter }
    };



    //某人发起解散
    onUserDismissReq(userItem) {
        if (this.dismissTimer) {
            var errMsg = "解散进行中"
            this.tableFrame.sendTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_DISMISS_START, userItem.chairID, { errMsg });
            return
        }

        var lefTime = 60
        this.dismissEndTime = Math.floor(Date.now() / 1000) + lefTime
        this.dismissTimer = setTimeout(this.onDismissTimeout.bind(this), lefTime * 1000);
        this.dismissAgreeData = [];
        //初始化data
        for (let i = 0; i < this.tableFrame.getUserSetChairCount(); i++) {
            let userItem = this.tableFrame.getTableUserItem(i);
            if (userItem) {
                this.dismissAgreeData[i] = JIESAN_NULL //构造解散数据
            }
        }

        //广播
        var chairID = userItem.chairID
        this.dismissAgreeData[chairID] = JIESAN_AGREE; //发起者默认解散
        this.starter = chairID;
        this.tableFrame.broadCastTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_DISMISS_START, null, this.getDismissData());
    };

    //同意解散
    onDismissAgree(userItem, agree) {
        if (!this.dismissTimer) {
            logger.error("用户非法请求同意解散", userItem.nickname)
            return
        }
        agree = agree || JIESAN_NOT_AGREE
        this.dismissAgreeData[userItem.chairID] = agree

        var chairID = userItem.chairID

        let msg:any = this.getDismissData()
        msg.chairID = chairID;
        msg.agree = agree;
        this.tableFrame.broadCastTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_DISMISS_AGREE, null, msg);
        if (this.isAllAgree()) {
            logger.info("所有人都同意解散了，开始解散")
            this.doDismissGame()
        }

        if (agree == JIESAN_NOT_AGREE) {
            this.dismissGameFail()
        }

    };


    //是不是所有人都同意了
    isAllAgree() {
        if (this.dismissAgreeData.length == 0) {
            return false;
        }
        var agreeCount = 0
        for (let index = 0; index < this.dismissAgreeData.length; index++) {
            if (this.dismissAgreeData[index] == JIESAN_AGREE) {
                agreeCount++;
            }
        }

        return agreeCount == this.dismissAgreeData.length
    };

    //重置
    resetDismissData() {
        this.dismissAgreeData = []
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer); //清除定时器
        }
        this.dismissTimer = null
        this.dismissEndTime = 0
        this.starter = null;
    };


    //房间解散失败
    dismissGameFail() {
        this.resetDismissData()
        //广播失败
        this.tableFrame.broadCastTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_DISMISS_END, null, { success: 0 });
    };

    //房间解散
    doDismissGame() {
        this.resetDismissData()
        this.tableFrame.broadCastTableData(gameCMD.MDM_GF_FRAME, gameCMD.SUB_GF_DISMISS_END, null, { success: 1 });
        this.tableFrame.tableFrameSink.onEventConcludeGame(null, null, gameConst.GER_DISMISS);


    };
}