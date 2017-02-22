var http = require('http');
var url = require('url');
var cheerio = require('cheerio');
var encrypt = require('./encrypt');
var config = require('./config.json');

// Data usage metrics
var dataUsage = 0; // bytes

// TP-Link Model No. TL-WR841N
var host = '192.168.0.1';
var loginPath = '/userRpm/LoginRpm.htm?Save=Save';
var connectedClientsPath = '/userRpm/WlanStationRpm.htm';

// Create authorization cookie
var password = encrypt.hex_md5(config.password);
var auth = `Basic ${encrypt.Base64Encoding(`${config.username}:${password}`)}`;
var authCookie = `Authorization=${encodeURIComponent(auth)};path=/`;

function extractSecretFromResponse(response) {
    var responseText = cheerio.load(response)('script').text();
    var responseUrl = /"(.*)"/.exec(responseText)[1];
    var responseUrlObj = url.parse(responseUrl);
    return responseUrlObj.pathname.split('/')[1];
}

function extractConnectedClients(response) {
    try {
        var responseText = cheerio.load(response)('script').eq(1).text();
        var hostList = eval(`(() => { ${responseText} return hostList; })()`);
        return (hostList && hostList.filter((host) => {
            return typeof host === 'string';
        })) || [];
    } catch(error) {
        console.error('Extraction error:', error);
        return [];
    }
}

function extractNumConnectedClients(response) {
    try {
        var responseText = cheerio.load(response)('script').eq(0).text();
        var hostParams = eval(`(() => { ${responseText} return wlanHostPara; })()`);
        return (hostParams && hostParams.length && hostParams[0]) || 0;
    } catch (error) {
        console.error('Extraction error:', error);
        return 0;
    }
}

function loginAndGetSecret() {
    return fetch({
        host: host,
        path: loginPath,
        headers: {
            'Cookie': authCookie
        }
    })
    .then(extractSecretFromResponse); 
}

function fetch(options, numChunks) {
    return new Promise((resolve, reject) => {
        http.get(options, (res) => {
            var response = '';
            var numProcessedChunks = 0;
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                response += chunk;
                numProcessedChunks++;
                dataUsage += chunk.byteLength || Buffer.byteLength(chunk);
                if (numChunks && numProcessedChunks >= numChunks) {
                    res.destroy();
                    resolve(response);
                }
            });
            res.on('error', reject);
            res.on('end', () => resolve(response));
        });
    });
}

function fetchConnectedClients() {
    return new Promise((resolve, reject) => {
        var connectedClients = [];
        var numConnectedClients;
        (function _fetchConnectedClients(page) {
            loginAndGetSecret()
                .then((secret) => {
                    // Only need the first chunk of data
                    // to get what is needed
                    return fetch({
                        host: host,
                        path: `/${secret}${connectedClientsPath}?Page=${page}&vapIdx=`,
                        headers: {
                            'Cookie': authCookie,
                            'Referer': `http://${host}/${secret}${connectedClientsPath}`
                        }
                    }, 1);
                })
                .then((response) => {
                    if (!numConnectedClients) {
                        numConnectedClients = extractNumConnectedClients(response);
                    }
                    Array.prototype.push.apply(connectedClients, extractConnectedClients(response));
                    if (connectedClients.length >= numConnectedClients) {
                        return resolve(connectedClients);
                    }
                    return _fetchConnectedClients(page + 1);
                })
                .catch(reject);
        })(1);
    });
}

function fetchConnectedClientsTimer(timerDelay, onResults, onError) {
    var timeoutid;
    (function _fetchConnectedClients() {
        fetchConnectedClients()
            .then(onResults)
            .then(function () {
                timeoutid = setTimeout(_fetchConnectedClients, timerDelay);
            })
            .catch(onError);
    }());
    return () => clearTimeout(timeoutid);
}

function getDataUsageInBytes() {
    return dataUsage;
}

module.exports = {
    fetchConnectedClients,
    fetchConnectedClientsTimer,
    getDataUsageInBytes
};