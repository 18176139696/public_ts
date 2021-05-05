/* 房卡类桌子 带录像功能接口
 * @Author: xk.qr 
 * @Date: 2020-05-12 10:11:06 
 * @Last Modified by: xk.qr
 * @Last Modified time: 2020-05-12 20:10:38
 */

import { Video } from "./Video";
import { ITableFrameSink } from "../ITableFrameSink";
import { gameCMD } from "../define";
import { ttutil } from "../ttutil";
import { IGameDetail } from "../TableFrame";

//玩家要包含这两种属性
export interface IFangkaPlayer {
    score: number;//积分
    singleScore: number;//单局积分
}

export interface IBigEndInfo {
    chairID: number,
    userID: number,
    head: string,
    nickname: string,
    score: number,
    gameID: number,
}


export abstract class IFangKaTableFrameSink extends ITableFrameSink {

    private video: Video = null;  //录像对象
    private statusTime: number = 0;
    private gameDetailArray: IGameDetail[] = [];//战绩每局详情

    constructor(tableFrame: any, roomInfo: any) {
        super(tableFrame, roomInfo)
    }
    abstract getCurRound() //当前局数

    repositionSink(clear?) {
        this.video = null
        if (clear) {
            this.gameDetailArray = []
        }
    }


    onActionUserStandUp(chair, userItem) {
    }
    onActionUserSitDown(chair: any, userItem: any) {
        return

    }
    onActionOffline(chairID: any, userItem: any) {
        return
    }
    onGameConculde() {
        return
    }
    checkStandup(userItem: any): boolean {
        return true
    }

    recordTimeTick() {
        this.statusTime = Date.now() / 1000;
    };

    /**
     * 获取剩余时间
     * @param totalTime 定时器的时间
     * @returns {number}
     */
    public getLeftTimeTick(totalTime: number): number {
        let passTime = (Date.now() / 1000) - this.statusTime;
        return Math.floor(totalTime - passTime < 0 ? 0 : totalTime - passTime);
    };


    newVideo() {
        this.video = new Video(this.getCurRound(), this.tableFrame.getTableUserData().roomCode)
    };
    getReplayKey() {
        if (this.video) {
            this.video.getReplayKey()
        }
    }
    isVideoOpen() {
        return !!this.video
    };



    public AddSceneData(data: any) {
        if (this.video) {
            this.video.AddSceneData(data);
        }
    }
    public AddVideoData(subCmd: number, data: any) {
        if (this.video) {
            this.video.AddVideoData(subCmd, data);
        }
    }
    public appendVideoData(subCmd: number, data: any) {
        if (this.video) {
            this.video.appendVideoData(subCmd, data);
        }
    }

    saveVideoFile() {
        if (this.video) {
            this.video.saveVideo();
        }
    }

    //发送给所有(包括观察者)
    sendToAll(subCMD, data, needRecord = true, excludeUserIDArray = []) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.sendToAll(gameCMD.MDM_GF_GAME, subCMD, data, excludeUserIDArray)
    };

    //发送给所有观战的人
    sendToWatcher(subCMD, data, needRecord = false) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.send2Watcher(gameCMD.MDM_GF_GAME, subCMD, data, [])
    };

    //发送给单个玩家
    sendToPlayer(subCMD, chairID, data, needRecord = false) {
        if (needRecord) {
            this.AddVideoData(subCMD, data);
        }
        this.tableFrame.sendToPlayer(gameCMD.MDM_GF_GAME, subCMD, chairID, data)
    };


    /**
     *  传入players 写入本局回放和结算
     *
     * @param {*} [gameEnd={}]
     * @returns·
     */
    writeGameEndInfo(players: IFangkaPlayer[], gameEnd = {}) {
        if (this.getCurRound() == 1) {
            this.tableFrame.autoCostDiamond() //扣钻石
        }
        let replayCode = ""
        if (this.video) {
            replayCode = this.tableFrame.writeGameReplay(this.getCurRound(), this.video.getVideoRecord(), gameEnd)
            logger.info("回放数据", this.video.getVideoRecord())
        }
        let gameDetail = this.getGameDetailInfo(replayCode, players)
        this.gameDetailArray.push(gameDetail)
        logger.info("写入本局回放和结算", replayCode, gameDetail)
    }


    getBigEndInfo(players: IFangkaPlayer[]) {
        let { bigEndInfo } = this.getTotalInfo(players)
        return bigEndInfo
    }

    private getTotalInfo(players: IFangkaPlayer[]) {
        let totalScore: number[] = [];
        let bigEndInfo: IBigEndInfo[] = []; //可能要给客户端显示用 直接返回
        for (let i = 0; i < players.length; ++i) {
            let userItem = this.tableFrame.getTableUserItem(i);
            let player = players[i]
            if (userItem && player) {
                totalScore[i] = player.score; //积分,
                bigEndInfo.push({
                    chairID: i,
                    userID: userItem.userID,
                    head: userItem.head,
                    nickname: userItem.nickname,
                    score: player.score,
                    gameID: userItem.gameID,
                })
            }
        }

        return { totalScore, bigEndInfo }
    }


    writeBattle(players: IFangkaPlayer[],gameEndMsgArray:any[] =[]) {
        let { totalScore } = this.getTotalInfo(players)
        this.tableFrame.writeGameResult2(totalScore, this.gameDetailArray,gameEndMsgArray);
    }

    //战绩每局详情
    private getGameDetailInfo(replayCode: string, players: IFangkaPlayer[]): IGameDetail {

        let gameDetail = {
            replayCode,
            round: this.getCurRound(),
            time: ttutil.getTimestamp(),
            score: [],
        }
        let playerInfo = []
        for (let chairID = 0; chairID < players.length; ++chairID) {
            let userID = 0
            let player = players[chairID]
            let userItem = this.tableFrame.getTableUserItem(chairID);
            if (userItem) {
                userID = userItem.userID
                playerInfo.push([userID, player.singleScore])
            }

        }
        gameDetail.score = playerInfo
        return gameDetail;
    }
}
