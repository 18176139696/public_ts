import moment = require("moment");

let fs = require('fs');
let clone = require("clone")

export class Video {
    private Record: Array<any>;
    private videoID: string;
    private lastCmdTime = 0;
    private videoStartTime = 0;//录像开始时间
    private videoEndTime = 0;//录像结束时间
    private round = 0;//
    private roomCode = 0;//录像结束时间

    constructor(round: number, roomCode: number) {
        this.videoID = ""
        this.Record = [];
        this.lastCmdTime = 0; //上条命令的时间
        this.videoStartTime = Date.now()
        this.videoStartTime = 0
        this.round = round
        this.roomCode = roomCode
    }

    //场景消息放第一条
    public AddSceneData(oldData) {
        let data = clone(oldData)
        this.Record.unshift(data);
    }

    private createReplayKey() {
        this.videoID = moment().format("MMDDhhmmss") + "_" + this.roomCode + "_" + this.round + "_" + this.videoStartTime + "_"
    };

    getReplayKey() {
        if (!this.videoID) this.createReplayKey() //没有就用当前的时间创建一个
        return this.videoID
    };

    public AddVideoData(subCMD, oldData) {
        let data = clone(oldData)
        let time = 0
        let nowTs = Date.now()
        if (this.Record.length > 0) {
            time = Math.min(nowTs - this.lastCmdTime, 5 * 1000) //消息间隔不能超过5秒（玩家长时间不操作）            
        }
        this.Record.push({ subCMD: subCMD, data: data, time });
        this.lastCmdTime = nowTs
    }

    public appendVideoData(subCMD, oldData) {
        let data = clone(oldData)
        let tempLen = this.Record.length;
        let lastRecord = this.Record[tempLen - 1];
        if (lastRecord) {
            if (Array.isArray(lastRecord)) {
                lastRecord.push({ subCMD: subCMD, data: data });
            } else {
                let newRecord = [lastRecord];
                newRecord.push({ subCMD: subCMD, data: data });
                this.Record[tempLen - 1] = newRecord;
            }
        } else {
            this.Record.push({ subCMD: subCMD, data: data });
        }
    }

    public getVideoRecord() {
        return this.Record;
    }

    public getVideoString() {
        return JSON.stringify(this.Record);
    }

    public saveVideo() {
        if (!this.Record) return;
        let rFileName = this.getReplayKey();
        fs.writeFile(rFileName, this.getVideoString(), { 'flag': 'w' }, function (err) {
            if (err) {
                logger.error("writeFile err = ", rFileName, "fileName = ", rFileName);
                return;
            }
        });
    };
}
