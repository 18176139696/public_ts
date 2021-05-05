import { TableFrame } from "./TableFrame";
export declare class DisMiss {
    tableFrame: TableFrame;
    dismissEndTime: number;
    dismissTimer: any;
    dismissAgreeData: any[];
    starter: any;
    constructor(tableFrame: any);
    onDismissTimeout(): void;
    getLeftTime(): number;
    getDismissData(): {
        lefTime: number;
        agreeData: any[];
        starter: any;
    };
    onUserDismissReq(userItem: any): void;
    onDismissAgree(userItem: any, agree: any): void;
    isAllAgree(): boolean;
    resetDismissData(): void;
    dismissGameFail(): void;
    doDismissGame(): void;
}
