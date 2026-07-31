const path = require('path');
module.exports = {
    port: 1882,
    userDir: path.resolve(__dirname, '_appdata'),
    dbPath: path.resolve(__dirname, '_db'),
    logPath: path.resolve(__dirname, '_logs'),
    imagesPath: path.resolve(__dirname, '_images'),
    widgetsFileDir: path.resolve(__dirname, '_widgets'),
    secureEnabled: false,
    httpEnabled: true,
    httpsEnabled: false
};
