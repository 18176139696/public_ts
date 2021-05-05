"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("./define");
class ITableFrameSink {
    constructor(tableFrame, roomInfo) {
        this.minReadyCount = 2;
        this.timeMng = [];
        this.tableFrame = tableFrame;
        this.roomInfo = roomInfo;
        this.chairCount = roomInfo["ChairCount"];
        this.timeMng = [];
    }
    onDismiss() { }
    ;
    onEventConcludeGame(chair, userItem, concludeReason) {
        switch (concludeReason) {
            case define_1.gameConst.GER_NORMAL:
                this.onGameConculde();
                return true;
            case define_1.gameConst.GER_USER_LEAVE:
            case define_1.gameConst.GER_NETWORK_ERROR:
                return true;
            case define_1.gameConst.GER_DISMISS:
                this.onDismiss();
                return true;
            default:
                return false;
        }
    }
    ;
    broadCastGameData(subCMD, chairID, data, onlyPlaying = null) {
        if (onlyPlaying) {
            this.tableFrame.sendTableData(define_1.gameCMD.MDM_GF_GAME, subCMD, chairID, data);
        }
        else {
            this.tableFrame.broadCastTableData(define_1.gameCMD.MDM_GF_GAME, subCMD, chairID, data);
        }
    }
    ;
    setGameTimer(func, timerID, time, ...params) {
        var that = this;
        var args = null;
        if (arguments.length > 3)
            args = Array.prototype.slice.call(arguments, 3);
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
    }
    ;
    killGameTimer(timerID) {
        for (var i = 0; i < this.timeMng.length; ++i) {
            if (this.timeMng[i].key == timerID) {
                clearTimeout(this.timeMng[i].value);
                this.timeMng.splice(i, 1);
                break;
            }
        }
    }
    ;
    clearAllTimer() {
        for (var i = 0; i < this.timeMng.length; ++i) {
            clearTimeout(this.timeMng[i].value);
        }
        this.timeMng.length = 0;
    }
    ;
    WriteScore(chairID, addScore) {
        if (addScore <= 0)
            return 0;
        let tax = addScore > 0 ? Math.floor(this.roomInfo.Revenue * addScore) : 0;
        let scoreInfo = {
            Chair: chairID,
            Score: addScore,
            Tax: tax
        };
        if (addScore > 0) {
            scoreInfo.Score -= tax;
        }
        this.tableFrame.writeUserScore(scoreInfo);
        return tax;
    }
    canStartGame(userCount) {
        let curCount = this.tableFrame.getCurPlayerNum();
        let tableSeting = this.tableFrame.getTableUserData();
        let minReadyCount = this.minReadyCount;
        if (tableSeting && tableSeting.minReadyCount) {
            minReadyCount = tableSeting.minReadyCount;
        }
        return (userCount >= curCount && userCount >= minReadyCount);
    }
    onUserCancelReady(chairID, userItem) {
    }
}
exports.ITableFrameSink = ITableFrameSink;
