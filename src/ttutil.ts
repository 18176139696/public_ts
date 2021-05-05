const uuidv4 = require("uuid/v4");

class __ttutil {
    constructor(){}
    arrayRemove(array, element) {
        for (var i = 0, len = array.length; i < len; ++i) {
            if (array[i] == element) {
                array.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    getUUID() {
        return uuidv4();
    }


    random(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    getTimestamp() {
        return Math.floor(Date.now() / 1000)
    }

};


 let  ttutil = new __ttutil()

 export  {ttutil}
