var loginCorresIO = require('socket.io-client');
function LogServer(gameServer) {
    this.gameServer = gameServer;
    this.logCorresSock = null;
    this.loggerServerURI = null;
    this.isConnect = false;
}
var p = LogServer.prototype;
p.start = function (loggerServerURI) {
    if (!loggerServerURI) {
        logger.info("使用本地文件日志服务器");
        return;
    }
    logger.info("开始连接日志服务器", loggerServerURI);
    this.logCorresSock = loginCorresIO.connect(loggerServerURI);
    this.logCorresSock.on("connect", (data) => {
        this.isConnect = true;
        this.loggerServerUR = loggerServerURI;
        logger.info("连接日志服务器成功");
    });
    this.logCorresSock.on("disconnect", (reason) => {
        this.isConnect = false;
        logger.info("日志服务器断开", reason);
    });
};
p.send2LogServer = function (topic, data) {
    if (this.isConnect) {
        this.logCorresSock.emit("msg", topic, data);
    }
    else {
        logger.error("游戏日志存入本地文件", topic, data);
    }
};
p.setTableData = function (tableData) {
};
