"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
let fs = require("fs");
require("reflect-metadata");
const ATTRIBUTES_KEY = "server:attributes";
const WRITE_FILE_TIME = 90;
function property(options) {
    return (target, propertyName) => {
        addAttribute(target, propertyName, options);
    };
}
exports.property = property;
function getAttributes(target) {
    const attributes = Reflect.getMetadata(ATTRIBUTES_KEY, target);
    if (attributes) {
        return Object
            .keys(attributes)
            .reduce((copy, key) => {
            copy[key] = Object.assign({}, attributes[key]);
            return copy;
        }, {});
    }
}
function setAttributes(target, attributes) {
    Reflect.defineMetadata(ATTRIBUTES_KEY, Object.assign({}, attributes), target);
}
function addAttribute(target, name, options) {
    let attributes = getAttributes(target);
    if (!attributes) {
        attributes = {};
    }
    attributes[name] = Object.assign({}, options);
    setAttributes(target, attributes);
}
class IControlConfig {
    constructor() {
        this.configFileName = "";
        this.nowStock = 25000000;
        this.nowTax = 0;
        this.taxRate = 0.05;
        this.highWater = 100000000;
        this.normalWater = 50000000;
        this.lowWater = 10000000;
        this.nowWater = 0;
        this.controlDesc = "???????????????????????????????????? ?????????????????????0??? ?????????????????? ??????????????????";
        let saveAttributes = getAttributes(this);
        console.error("??????????????????:", saveAttributes);
    }
    onGetControlConfig() {
        this.updateWaterLevel();
        let saveAttributes = getAttributes(this);
        let kv = {};
        let attributes = {};
        for (const key in saveAttributes) {
            let propertyInfo = saveAttributes[key];
            attributes[key] = propertyInfo;
            if (propertyInfo.read) {
                let value = this[key];
                kv[key] = value;
            }
        }
        return { attributes, kv };
    }
    ;
    checkAndFormatConfig(newKv, modifyRead) {
        let newConfig = newKv;
        let { attributes, kv } = this.onGetControlConfig();
        let oldConfig = kv;
        let resData = {};
        for (let key in newConfig) {
            let attri = attributes[key];
            if (modifyRead || (attri && attri.write)) {
                let oldV = oldConfig[key];
                let newV = newConfig[key];
                if (typeof oldV == typeof newV) {
                    resData[key] = newV;
                }
                else {
                    logger.error("???????????????", key, newConfig);
                }
            }
        }
        return resData;
    }
    ;
    onModifyControlConfig(data, readFromFile = false) {
        let newKv = JSON.parse(data);
        let modifyReadValue = readFromFile;
        let finalWriteKv = this.checkAndFormatConfig(newKv, modifyReadValue);
        if (Object.keys(finalWriteKv).length <= 0) {
            console.error("----------------------------------------------------");
            console.error("???????????????????????? ????????????");
            console.error(readFromFile ? "????????????????????? ??????????????????????????????" : "???web?????????????????????????????????web??????????????????");
            console.error("??????????????????");
            console.error(data);
            console.error("----------------------------------------------------");
            return false;
        }
        console.info("---------------------------------");
        console.info("????????????????????????");
        console.info(finalWriteKv);
        console.info("---------------------------------");
        for (const key in finalWriteKv) {
            this[key] = finalWriteKv[key];
        }
        !readFromFile && this.saveConfig();
        return true;
    }
    ;
    updateWaterLevel() {
        if (this.nowWater == -1 && this.nowStock >= this.normalWater) {
            this.nowWater = 0;
        }
        else if (this.nowWater == 1 && this.nowStock <= this.normalWater) {
            this.nowWater = 0;
        }
        else if (this.nowWater == 0) {
            if (this.nowStock > this.highWater) {
                this.nowWater = 1;
            }
            else if (this.nowStock < this.lowWater) {
                this.nowWater = -1;
            }
        }
    }
    ;
    getNowWater() {
        this.updateWaterLevel();
        return this.nowWater;
    }
    ;
    startConfig() {
        this.configFileName = "./config/Config_" + gameconfig.RoomID + ".json";
        this.loadConfig();
        let delayTime = Math.floor(Math.random() * WRITE_FILE_TIME);
        setTimeout(() => {
            this.saveConfig();
            setInterval(() => { this.saveConfig(); }, WRITE_FILE_TIME * 1000);
        }, delayTime * 1000);
    }
    ;
    loadConfig() {
        fs.readFile(this.configFileName, (err, data) => {
            try {
                if (err) {
                    logger.error("??????????????????????????? ??????????????????????????? ???????????????????????????");
                    this.saveConfig();
                    return;
                }
                this.onModifyControlConfig(data, true);
            }
            catch (e) {
                console.error(e);
            }
        });
    }
    ;
    saveConfig() {
        let { kv } = this.onGetControlConfig();
        let saveData = kv;
        let savePrettyJsonStr = JSON.stringify(saveData, null, 1);
        fs.writeFile(this.configFileName, savePrettyJsonStr, (err) => {
            if (err) {
                logger.error("????????????????????????", this.configFileName, saveData);
                return;
            }
            logger.info(this.configFileName, saveData);
        });
    }
    ;
}
__decorate([
    property({ read: true, write: true, desc: "????????????" }),
    __metadata("design:type", Object)
], IControlConfig.prototype, "nowStock", void 0);
__decorate([
    property({ read: true, write: false, desc: "??????????????????" }),
    __metadata("design:type", Object)
], IControlConfig.prototype, "nowTax", void 0);
__decorate([
    property({ read: true, write: true, desc: "????????????" }),
    __metadata("design:type", Object)
], IControlConfig.prototype, "taxRate", void 0);
__decorate([
    property({ read: true, write: true, desc: "?????????" }),
    __metadata("design:type", Object)
], IControlConfig.prototype, "highWater", void 0);
__decorate([
    property({ read: true, write: true, desc: "????????????" }),
    __metadata("design:type", Object)
], IControlConfig.prototype, "normalWater", void 0);
__decorate([
    property({ read: true, write: true, desc: "?????????" }),
    __metadata("design:type", Object)
], IControlConfig.prototype, "lowWater", void 0);
__decorate([
    property({ read: true, write: true, desc: " ??????????????????" }),
    __metadata("design:type", Object)
], IControlConfig.prototype, "nowWater", void 0);
__decorate([
    property({ read: true, write: false, desc: "???????????????" }),
    __metadata("design:type", Object)
], IControlConfig.prototype, "controlDesc", void 0);
exports.IControlConfig = IControlConfig;
