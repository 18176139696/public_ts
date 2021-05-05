"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ttutil_1 = require("./ttutil");
const AndroidItem_1 = require("./AndroidItem");
const define_1 = require("./define");
class AndroidManager {
    constructor(gameServer) {
        this.androidItemArray = [];
        this.gameServer = null;
        this.androidItemArray = [];
        this.gameServer = gameServer;
    }
    createAndroidItem(userItem) {
        var androidItem = new AndroidItem_1.AndroidItem(userItem, this);
        this.androidItemArray.push(androidItem);
    }
    ;
    deleteAndroidUserItem(userItem) {
        var androidItem = this.searchAndroidByUserItem(userItem);
        if (androidItem != null)
            androidItem.clearAllTimer();
        ttutil_1.ttutil.arrayRemove(this.androidItemArray, androidItem);
    }
    ;
    clearAll() {
        for (var i = 0; i < this.androidItemArray.length; ++i) {
            this.androidItemArray[i].clearAllTimer();
        }
        this.androidItemArray.length = 0;
    }
    ;
    broadToClient(mainCMD, subCMD, data) {
        process.nextTick(() => {
            for (var i = 0; i < this.androidItemArray.length; ++i) {
                var androidItem = this.androidItemArray[i];
                if (!androidItem.serverUserItem.markDelete) {
                    androidItem.emit(define_1.gameEvent.EVENT_ANDROID, mainCMD, subCMD, data);
                }
            }
        });
    }
    ;
    sendDataToClient(userItem, mainCMD, subCMD, data) {
        var android = this.searchAndroidByUserItem(userItem);
        if (android == null) {
            return false;
        }
        else {
            process.nextTick(() => {
                if (!userItem.markDelete) {
                    android.emit(define_1.gameEvent.EVENT_ANDROID, mainCMD, subCMD, data);
                }
            });
            return true;
        }
    }
    ;
    sendDataToServer(userItem, mainCMD, subCMD, data) {
        let userID = userItem.userID;
        let msg = { mainCMD, subCMD, data, userID };
        process.nextTick(() => {
            if (!userItem.markDelete) {
                this.gameServer.emit(define_1.gameEvent.EVENT_ANDROID, { userID }, msg, null, userItem);
            }
        });
    }
    ;
    searchAndroidByUserItem(userItem) {
        for (var i = 0; i < this.androidItemArray.length; ++i) {
            if (this.androidItemArray[i].getMeUserItem() == userItem) {
                return this.androidItemArray[i];
            }
        }
        return null;
    }
    ;
    searchAndroidByUserID(userID) {
        for (var i = 0; i < this.androidItemArray.length; ++i) {
            if (this.androidItemArray[i].getUserID() == userID) {
                return this.androidItemArray[i];
            }
        }
        return null;
    }
    ;
}
exports.AndroidManager = AndroidManager;
