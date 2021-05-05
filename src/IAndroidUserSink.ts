import {AndroidItem} from "./AndroidItem";
export  abstract class IAndroidUserSink {
    public timeMng: any[] = [];                           //计时器管理器
    protected androidUserItem: AndroidItem = null;


    constructor(androidItem: AndroidItem) {
        this.timeMng = [];
        this.androidUserItem = androidItem;
    }
    //场景消息
    abstract  onEventSceneMessage(gameStatus, data) 
    //游戏消息
    abstract  onEventGameMessage(subCMD, data) 

    // 游戏框架消息
    onEventFrameMessage(subCMD, data) {
        return true;
    };


    /**
     * 定时器功能
     * @param func  定时器回调函数
     * @param timerID 定时器标识
     * @param time 定时器时间  1s
     */

    public setGameTimer(func, timerID, time) {
        let that = this;
        let args = null;
        if (arguments.length > 3)
            args = Array.prototype.slice.call(arguments, 3);	//貌似性能不好？

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
    };

    /**
     * 删除定时器
     * @param timerNum 定时器标识
     */
    public killGameTimer(timerID) {
        for (let i = 0; i < this.timeMng.length; ++i) {
            if (this.timeMng[i].key == timerID) {
                clearTimeout(this.timeMng[i].value);
                this.timeMng.splice(i, 1);
                break;
            }
        }
    };

    /**
     *清除所有定时器
     */
    public clearAllTimer() {
        for (let i = 0; i < this.timeMng.length; ++i) {
            clearTimeout(this.timeMng[i].value);
        }
        this.timeMng.length = 0;
    };

}