let fs = require("fs")
import "reflect-metadata"

const ATTRIBUTES_KEY = "server:attributes";
const WRITE_FILE_TIME = 90

interface IProperty {
    read: boolean, //后台可读
    write: boolean, //后台可写
    desc: string,//文字描述
}

interface IPropertyMap { [key: string]: IProperty }


//需要保存的属性 加了这个装饰器的都会保存到文件
export function property(options: IProperty): PropertyDecorator {
    return (target, propertyName: string) => {
        addAttribute(target, propertyName, options);
    };
}
/**
 * Returns model attributes from class by restoring this
 * information from reflect metadata
 */
function getAttributes(target): IPropertyMap {
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

/**
 * Sets attributes
 */
function setAttributes(target, attributes) {
    Reflect.defineMetadata(ATTRIBUTES_KEY, Object.assign({}, attributes), target);
}

/**
 * Adds model attribute by specified property name and
 * sequelize attribute options and stores this information
 * through reflect metadata
 */
function addAttribute(target, name, options) {
    let attributes = getAttributes(target);
    if (!attributes) {
        attributes = {};
    }
    attributes[name] = Object.assign({}, options);
    setAttributes(target, attributes);
}


/**
 *
 * @param key   所配置的key值 ， 不会在界面上显示， 会原样传回来
 * @param value 会在界面上显示
 * @param desc  对key值的描述
 * @param attr  wr这两种属性可选 ， r为必选， w可选 ， 没有w， 则表示只读， 不能修改
 * @returns {{key: *, value: *, desc: *, attr: (*|string)}}
 */

export class IControlConfig {
    configFileName = "";//保存文件名   
    //--------------------------------------------------------------------------------
    //基础库存控制, 游戏保证库存不为负， 且抽水只增不减
    @property({ read: true, write: true, desc: "当前库存" })
    nowStock = 25000000;           //初始库存 2500w
    @property({ read: true, write: false, desc: "当前抽水总和" })
    nowTax = 0;                    //当前抽水
    @property({ read: true, write: true, desc: "抽水比率" })
    taxRate = 0.05;                //抽水比率， 抽水比率应小于 低水位蓄水到正常水位的力度， 这样库存达到低水位时， 才能涨到正常水位
    //---------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------
    //进阶库存控制, 游戏通过 nowWater这个值的状态来 倾斜概率天平，  高水位时， 玩家赢的概率大于50%， 低水位时玩家赢的概率小于50%， 正常水位接近50%， 低水位玩家输钱的速度应该要大于抽水的比率， 这样库存才能上涨。
    @property({ read: true, write: true, desc: "高水位" })
    highWater = 100000000;         //库存 高水位
    @property({ read: true, write: true, desc: "正常水位" })
    normalWater = 50000000;        //正常水位
    @property({ read: true, write: true, desc: "低水位" })
    lowWater = 10000000;           //低水位
    @property({ read: true, write: true, desc: " 当前水位状态" })
    nowWater = 0;                  // 0表示正常水位， 1表示 高水位（库存降到正常水位时就会变成0）， -1表示低水位（库存升到正常水位时就会变成0），
    //----------------------------------------------------------------------------------
    @property({ read: true, write: false, desc: "游戏控描述" })
    controlDesc = "本游戏支持玩家权重控制， 基础的库存不为0， 及抽水机制， 支持高低水位";             //控制描述, 主要写给管理员看。


    constructor() {
        let saveAttributes = getAttributes(this)
        console.error("文件保存属性:", saveAttributes)
    }

    /**
     * 获取控制配置
     * 此方法为框架调用的方法，如果有控制配置，需要把控制的信息传返回
     * @returns {Array}
     */
    onGetControlConfig() {
        this.updateWaterLevel();
        let saveAttributes = getAttributes(this)
        let kv = {}
        let attributes: IPropertyMap = {}
        for (const key in saveAttributes) {
            let propertyInfo = saveAttributes[key]
            attributes[key] = propertyInfo
            if (propertyInfo.read) {
                let value = this[key]
                kv[key] = value
            }
        }

        return { attributes, kv };
    };



    /**
     * 检查且 格式化 配置数组， 把配置可写的value全转成数字， 不能转return false
     *
     * @private
     * @param {*} newKv //新的kv
     * @param {*} modifyRead //是不是从文件读的，从文件读的 则kv全部可写
     * @returns
     */
    private checkAndFormatConfig(newKv, modifyRead) {
        let newConfig = newKv;     //外部传进来的配置
        let { attributes, kv } = this.onGetControlConfig() //得到一份旧的， 好做比较
        let oldConfig = kv

        //新的值要可写，类型一样
        let resData: { [key: string]: any } = {};
        for (let key in newConfig) {
            let attri = attributes[key]
            //可写 且要类型一样
            if (modifyRead || (attri && attri.write)) {
                let oldV = oldConfig[key]
                let newV = newConfig[key]
                if (typeof oldV == typeof newV) {
                    resData[key] = newV
                }
                else {
                    logger.error("类型不匹配", key, newConfig)
                }
            }
        }
        return resData;
    };

    /**
     * 修改控制配置
     * 此方法为框架调用，如果有更新新的控制配置信息，会有新的配置，游戏逻辑自己更新配置
     */
    onModifyControlConfig(data, readFromFile = false) {
        let newKv = JSON.parse(data);
        let modifyReadValue = readFromFile //配置文件里面读取的话 要连可读的一起写入

        //过滤kv 只保留最终可写的kv
        let finalWriteKv = this.checkAndFormatConfig(newKv, modifyReadValue);
        if (Object.keys(finalWriteKv).length <= 0) {
            console.error("----------------------------------------------------");
            console.error("配置数组不合法， 转换失败");
            console.error(readFromFile ? "从文件中读取， 所以请联系本游戏作者" : "从web后台传过来，所以请联系web后台管理人员");
            console.error("原始数据如下");
            console.error(data);
            console.error("----------------------------------------------------");
            return false;
        }
        //------------------------------------------------------------------------------
        console.info("---------------------------------");
        console.info("转换配置数组成功");
        console.info(finalWriteKv);
        console.info("---------------------------------");

        for (const key in finalWriteKv) {
            this[key] = finalWriteKv[key]
        }
        //保存一下配置文件
        !readFromFile && this.saveConfig();
        return true;
    };



    /**
     *  更新水位, 每次 计算结果时都要调用
     */
    updateWaterLevel() {
        //更新一下水位
        //先判定当前水位
        if (this.nowWater == -1 && this.nowStock >= this.normalWater) {
            //恢复到正常水位
            this.nowWater = 0;
        }
        else if (this.nowWater == 1 && this.nowStock <= this.normalWater) {
            //恢复到正常水位
            this.nowWater = 0;
        }
        else if (this.nowWater == 0) {
            if (this.nowStock > this.highWater) {
                //切换到高水位
                this.nowWater = 1;
            }
            else if (this.nowStock < this.lowWater) {
                //切换到低水位
                this.nowWater = -1;
            }
        }
    };

    /**
     * 获取当前水位
     */
    getNowWater() {
        this.updateWaterLevel();
        return this.nowWater;
    };

    /**
     *  读取配置
     */
    startConfig() {
        //配置文件保存名
        this.configFileName = "./config/Config_" + gameconfig.RoomID + ".json"
        this.loadConfig()
        let delayTime = Math.floor(Math.random() * WRITE_FILE_TIME) //随机秒数 防止统一时间写文件

        setTimeout(() => {
            this.saveConfig()
            setInterval(() => { this.saveConfig() }, WRITE_FILE_TIME * 1000) //定时存盘
        }, delayTime * 1000);

    };
    /**
     *  读取配置
     */
    private loadConfig() {
        fs.readFile(this.configFileName, (err, data) => {
            try {
                if (err) {
                    logger.error("读取配置文件失败， 可能是第一次启动， 将使用默认配置文件");
                    this.saveConfig() //没有就创建一下
                    return;
                }
                this.onModifyControlConfig(data, true);
            }
            catch (e) {
                console.error(e);
            }

        });

    };

    /**
     * 保存配置文件， 在逻辑中要自己在适应时机保存一下
     */
    saveConfig() {
        let { kv } = this.onGetControlConfig();
        let saveData = kv //保存key-value
        let savePrettyJsonStr = JSON.stringify(saveData, null, 1); //美化

        fs.writeFile(this.configFileName, savePrettyJsonStr, (err) => {
            if (err) {
                logger.error("保存配置文件失败", this.configFileName, saveData);
                return
            }
            logger.info(this.configFileName, saveData)
        });
    };
}


