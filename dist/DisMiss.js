"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("./define");
const JIESAN_NULL = -1;
const JIESAN_NOT_AGREE = 0;
const JIESAN_AGREE = 1;
class DisMiss {
    constructor(tableFrame) {
        this.tableFrame = null;
        this.dismissEndTime = 0;
        this.dismissTimer = null;
        this.dismissAgreeData = [];
        this.starter = null;
        this.tableFrame = tableFrame;
    }
    onDismissTimeout() {
        this.doDismissGame();
    }
    ;
    getLeftTime() {
        return this.dismissEndTime - Math.floor(Date.now() / 1000);
    }
    ;
    getDismissData() {
        let lefTime = this.getLeftTime();
        let agreeData = this.dismissAgreeData;
        return { lefTime, agreeData, starter: this.starter };
    }
    ;
    onUserDismissReq(userItem) {
        if (this.dismissTimer) {
            var errMsg = "解散进行中";
            this.tableFrame.sendTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_DISMISS_START, userItem.chairID, { errMsg });
            return;
        }
        var lefTime = 60;
        this.dismissEndTime = Math.floor(Date.now() / 1000) + lefTime;
        this.dismissTimer = setTimeout(this.onDismissTimeout.bind(this), lefTime * 1000);
        this.dismissAgreeData = [];
        for (let i = 0; i < this.tableFrame.getUserSetChairCount(); i++) {
            let userItem = this.tableFrame.getTableUserItem(i);
            if (userItem) {
                this.dismissAgreeData[i] = JIESAN_NULL;
            }
        }
        var chairID = userItem.chairID;
        this.dismissAgreeData[chairID] = JIESAN_AGREE;
        this.starter = chairID;
        this.tableFrame.broadCastTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_DISMISS_START, null, this.getDismissData());
    }
    ;
    onDismissAgree(userItem, agree) {
        if (!this.dismissTimer) {
            logger.error("用户非法请求同意解散", userItem.nickname);
            return;
        }
        agree = agree || JIESAN_NOT_AGREE;
        this.dismissAgreeData[userItem.chairID] = agree;
        var chairID = userItem.chairID;
        let msg = this.getDismissData();
        msg.chairID = chairID;
        msg.agree = agree;
        this.tableFrame.broadCastTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_DISMISS_AGREE, null, msg);
        if (this.isAllAgree()) {
            logger.info("所有人都同意解散了，开始解散");
            this.doDismissGame();
        }
        if (agree == JIESAN_NOT_AGREE) {
            this.dismissGameFail();
        }
    }
    ;
    isAllAgree() {
        if (this.dismissAgreeData.length == 0) {
            return false;
        }
        var agreeCount = 0;
        for (let index = 0; index < this.dismissAgreeData.length; index++) {
            if (this.dismissAgreeData[index] == JIESAN_AGREE) {
                agreeCount++;
            }
        }
        return agreeCount == this.dismissAgreeData.length;
    }
    ;
    resetDismissData() {
        this.dismissAgreeData = [];
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
        }
        this.dismissTimer = null;
        this.dismissEndTime = 0;
        this.starter = null;
    }
    ;
    dismissGameFail() {
        this.resetDismissData();
        this.tableFrame.broadCastTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_DISMISS_END, null, { success: 0 });
    }
    ;
    doDismissGame() {
        this.resetDismissData();
        this.tableFrame.broadCastTableData(define_1.gameCMD.MDM_GF_FRAME, define_1.gameCMD.SUB_GF_DISMISS_END, null, { success: 1 });
        this.tableFrame.tableFrameSink.onEventConcludeGame(null, null, define_1.gameConst.GER_DISMISS);
    }
    ;
}
exports.DisMiss = DisMiss;
