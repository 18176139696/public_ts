import { AndroidItem } from "./AndroidItem";
import { GameServer } from "./GameServer";
export declare class AndroidManager {
    androidItemArray: AndroidItem[];
    gameServer: GameServer;
    constructor(gameServer: any);
    createAndroidItem(userItem: any): void;
    deleteAndroidUserItem(userItem: any): void;
    clearAll(): void;
    broadToClient(mainCMD: any, subCMD: any, data: any): void;
    sendDataToClient(userItem: any, mainCMD: any, subCMD: any, data: any): boolean;
    sendDataToServer(userItem: any, mainCMD: any, subCMD: any, data: any): void;
    searchAndroidByUserItem(userItem: any): AndroidItem;
    searchAndroidByUserID(userID: any): AndroidItem;
}
