export declare class SocketServer {
    socketMap: {};
    sidMap: {};
    nowSocketID: number;
    IO: any;
    gameServer: any;
    PORT: number;
    constructor(gameServer: any, port: any);
    start(): void;
    stop(): void;
    addSocket(socket: any): number;
    delSocket(socket: any): void;
    bindSocket(sid: any, socketID: any): void;
    getSocket(sid: any): any;
    sendMsg(sid: any, session: any, eventName: any, data: any): void;
    sendBySocketID(socketID: any, session: any, eventName: any, data: any): void;
    broadCast(session: any, eventName: any, data: any): void;
    onError(socket: any, err: any): void;
    onDisConnect(socket: any, reason: any): void;
    getFreePos(): {
        tableID: number;
        chairID: any;
    };
    onConnect(socket: any): void;
    onMessage(socket: any, session: any, eventName: any, data: any): void;
    onLocalMessage(socket: any, session: any, eventName: any, data: any): void;
    onLocalDisConnect(socket: any, session: any): void;
    onAuth(socket: any, data: any): void;
    createTestSocket(socket: any, session: any, userID: any): void;
}
