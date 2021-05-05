"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class IAndroidUserSink {
    constructor(androidItem) {
        this.timeMng = [];
        this.androidUserItem = null;
        this.timeMng = [];
        this.androidUserItem = androidItem;
    }
    onEventFrameMessage(subCMD, data) {
        return true;
    }
    ;
    setGameTimer(func, timerID, time) {
        let that = this;
        let args = null;
        if (arguments.length > 3)
            args = Array.prototype.slice.call(arguments, 3);
        this.killGameTimer(timerID);
        let timer = setTimeout(function () {
            for (let i = 0; i < that.timeMng.length; ++i) {
                if (that.timeMng[i].value == timer) {
                    that.timeMng.splice(i, 1);
                    break;
                }
            }
            func.apply(that, args);
        }, time * 1000);
        this.timeMng.push({ key: timerID, value: timer });
    }
    ;
    killGameTimer(timerID) {
        for (let i = 0; i < this.timeMng.length; ++i) {
            if (this.timeMng[i].key == timerID) {
                clearTimeout(this.timeMng[i].value);
                this.timeMng.splice(i, 1);
                break;
            }
        }
    }
    ;
    clearAllTimer() {
        for (let i = 0; i < this.timeMng.length; ++i) {
            clearTimeout(this.timeMng[i].value);
        }
        this.timeMng.length = 0;
    }
    ;
}
exports.IAndroidUserSink = IAndroidUserSink;
