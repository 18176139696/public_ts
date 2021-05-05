import {ttutil} from "./ttutil";
import {AndroidItem} from "./AndroidItem";
import {GameServer} from "./GameServer";
import { gameEvent } from "./define";


export  class AndroidManager {

    androidItemArray:AndroidItem[] = [];
    gameServer:GameServer = null;

    constructor(gameServer) {
        this.androidItemArray = [];
        this.gameServer = gameServer;
    }


    createAndroidItem(userItem) {
        var androidItem = new AndroidItem(userItem, this);
        this.androidItemArray.push(androidItem);
    };

    deleteAndroidUserItem(userItem) {
        var androidItem = this.searchAndroidByUserItem(userItem);
        if (androidItem != null) androidItem.clearAllTimer();

        ttutil.arrayRemove(this.androidItemArray, androidItem);
    };

    clearAll() {
        for (var i = 0; i < this.androidItemArray.length; ++i) {
            this.androidItemArray[i].clearAllTimer();
        }
        this.androidItemArray.length = 0;
    };

    broadToClient(mainCMD, subCMD, data) {
        process.nextTick(() => {
            //防止要发送消息时， 因为nextTick的原因， 导致实际操作时， userItem已经离开了
            for (var i = 0; i < this.androidItemArray.length; ++i) {
                var androidItem = this.androidItemArray[i];
                if (!androidItem.serverUserItem.markDelete) {
                    androidItem.emit(gameEvent.EVENT_ANDROID, mainCMD, subCMD, data);
                }
            }
        });
    };
    /**
     * @param userItem is a ServerUserItem
     * @param mainCMD
     * @param subCMD
     * @param data
     */
    sendDataToClient(userItem, mainCMD, subCMD, data) {
        var android = this.searchAndroidByUserItem(userItem);
        if (android == null) {
            return false
        } else {
            process.nextTick(() => {
                //防止要发送消息时， 因为nextTick的原因， 导致实际操作时， userItem已经离开了

                if (!userItem.markDelete) {
                    android.emit(gameEvent.EVENT_ANDROID, mainCMD, subCMD, data);
                }
            });
            return true;
        }
    };
    /**
     *  发送数据到服务端
     * @param userItem
     * @param mainCMD
     * @param subCMD
     * @param data
     */
    sendDataToServer(userItem, mainCMD, subCMD, data) {

        let userID = userItem.userID
        let msg = {mainCMD,subCMD,data,userID};
        process.nextTick(() => {
            //防止要发送消息时， 因为nextTick的原因， 导致实际操作时， userItem已经离开了
            if (!userItem.markDelete) {
                this.gameServer.emit(gameEvent.EVENT_ANDROID, { userID }, msg, null, userItem);
            }


        });
    };
    /**
     * it search the android by serveritem
     * @param userItem
     */
    searchAndroidByUserItem(userItem) {
        for (var i = 0; i < this.androidItemArray.length; ++i) {
            if (this.androidItemArray[i].getMeUserItem() == userItem) {
                return this.androidItemArray[i];
            }
        }
        return null;
    };

    searchAndroidByUserID(userID) {
        for (var i = 0; i < this.androidItemArray.length; ++i) {
            if (this.androidItemArray[i].getUserID() == userID) {
                return this.androidItemArray[i];
            }
        }
        return null;
    };

}
