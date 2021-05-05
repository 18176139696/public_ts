/// <reference types="socket.io" />
/// <reference types="node" />
import { TableFrame } from "./TableFrame";
import { ServerUserItem } from "./ServerUserItem";
import { SocketServer } from "./SocketServer";
import { AndroidManager } from "./AndroidManager";
import { EventEmitter } from "events";
import { ITableFrameSink } from "./ITableFrameSink";
import { IAndroidUserSink } from "./IAndroidUserSink";
import { IControlConfig } from "./IControlConfig";
export declare class GameServer extends EventEmitter {
    roomID: number;
    PORT: number;
    tableFrame: TableFrame[];
    serverUserArray: ServerUserItem[];
    logCorresSock: SocketIO.Socket;
    roomInfo: any;
    androidManager: AndroidManager;
    serverSocket: SocketServer;
    userMap: {};
    gateServer: SocketServer;
    userRoomMap: {
        [roomCode: number]: TableFrame;
    };
    serverStarted: boolean;
    moduleEnName: string;
    constructor();
    initGlobal<T extends ITableFrameSink, A extends IAndroidUserSink, C extends IControlConfig>(tableFrameSink: T, androidUserSink: A, controlConfig: C): void;
    init(): boolean;
    onGameStart(): boolean;
    connectLogonCorres(): void;
    sendLCData(eventName: any, msg: any): void;
    send2LogServer(eventName: any, msg: any): void;
    onCorresEvent(): void;
    onPlazaMsg(session: any, eventName: any, data: any, callback: any): void;
    onLCModifyUserWeight(session: any, data: any, callback: any): void;
    onLCGetRoomControl(session: any, data: any, callback: any): void;
    onLCModifyRoomControl(session: any, data: any, callback: any): void;
    onUserOffline(session: any, data: any, callback: any): boolean;
    onUserRelogin(session: any, data: any, callback: any): boolean;
    getGameConfig(): {};
    onLCUserScore(session: any, data: any, callback: any): boolean;
    createUser(session: any, data: any): any;
    checkSitDown(data: any): (string | number)[];
    onWatcherSitdown(tableID: any, data: any): (string | number)[] | (number | {
        userID: any;
        roomID: any;
        tableID: any;
        chairID: any;
        isWatcher: boolean;
    })[];
    onLCUserSitDown(session: any, data: any, callback: any): {
        code: string | number | {
            userID: any;
            roomID: any;
            tableID: any;
            chairID: any;
            isWatcher: boolean;
        } | {
            userID: any;
            roomID: any;
            tableID: any;
            chairID: any;
            tableSetting: any;
            players: any;
        };
        info: string | number | {
            userID: any;
            roomID: any;
            tableID: any;
            chairID: any;
            isWatcher: boolean;
        } | {
            userID: any;
            roomID: any;
            tableID: any;
            chairID: any;
            tableSetting: any;
            players: any;
        };
        session: any;
    };
    enterUserRoom(data: any): (string | number)[] | (number | {
        userID: any;
        roomID: any;
        tableID: any;
        chairID: any;
        isWatcher: boolean;
    })[] | (number | {
        userID: any;
        roomID: any;
        tableID: any;
        chairID: any;
        tableSetting: any;
        players: any;
    })[];
    getEmptyTable(): any;
    getNotFullTable(): any;
    doSitDown(data: any, table: any, chairID: any): (string | number)[] | (number | {
        userID: any;
        roomID: any;
        tableID: any;
        chairID: any;
        tableSetting: any;
        players: any;
    })[];
    onLCUserLeave(session: any, data: any, callback: any): void;
    createAndroid(info: any): ServerUserItem;
    onLCRoomInfo(data: any): any;
    start(): void;
    onClientSocketEvent(session: any, data: any, androidUserItem: any): void;
    stop(): void;
    onAsynEvent(): void;
    eventUserItemScore(userItem: any): boolean;
    eventUserItemStatus(userItem: any, oldTableID: any, oldChairID: any, oldStatus: any): boolean;
    onClientLogonEvent(subCMD: any, data: any, userItem: any, session: any): boolean;
    onClientFrameEvent(subCMD: any, data: any, userItem: any, androidUserItem: any): boolean;
    onClientGameEvent(subCMD: any, data: any, userItem: any, androidUserItem: any): any;
    getUserItemByUserID(userID: any): any;
    deleteUserItem(userItem: any, notify?: boolean, notifyPlaza?: boolean): void;
    onUserStandUp(session: any, data: any, callback: any): void;
    sendData(userItem: any, mainCMD: any, subCMD: any, data: any): boolean;
    getUserLogonPackage(serverUserItem: any): any;
    sendUserEnter(enterUserItem: any): boolean;
    sendToastMsg(userItem: any, message: any): boolean;
    sendRequestFailure(userItem: any, message: any, type?: any): boolean;
    recordError(type: any, content: any): void;
    writeBigGameResultLog(tableSetting: any, playerInfo: any, roundDetail: any): void;
    writeGoldRecord(userID: any, addGold: any, leftGold: any, desc: any): void;
    writeGameLog(gameData: any): void;
    onSubGameNotice(data: any): void;
    onGetRoomDetail(session: any, data: any, callback: any): void;
    onAdminDisMiss(session: any, data: any, callback: any): void;
    getAllUserInThisGame(): string[];
    getAllRoomCodeInThisGame(): any[];
    dealOffline(): void;
    foreachTable(cb: (tableFrame: TableFrame) => void): void;
    broadCast(msg: any): void;
}
