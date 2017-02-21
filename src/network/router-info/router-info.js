var http = require('http');
var url = require('url');
var cheerio = require('cheerio');
var encrypt = require('./encrypt');
var config = require('./config.json');

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
    var responseText = cheerio.load(response)('script').eq(1).text();
    // Create IIFE to not pollute global scope
    return (() => {
        try {
            var hostList = eval(`(() => { ${responseText} return hostList; })()`);
            return (hostList && hostList.filter((host) => {
                return typeof host === 'string';
            })) || [];
        } catch(error) {
            console.error('Extraction error:', error);
            return [];
        }
    })();
}

function extractNumConnectedClients(response) {
    var responseText = cheerio.load(response)('script').eq(0).text();
    // Create IIFE to not pollute global scope
    return (() => {
        try {
            var hostParams = eval(`(() => { ${responseText} return wlanHostPara; })()`);
            return (hostParams && hostParams.length && hostParams[0]) || 0;
        } catch (error) {
            console.error('Extraction error:', error);
            return 0;
        }
    })();
}

function loginAndGetSecret() {
    return fetchUrlResponse({
        host: host,
        path: loginPath,
        headers: {
            'Cookie': authCookie
        }
    })
    .then(extractSecretFromResponse); 
}

function fetchUrlResponse(options) {
    return new Promise((resolve, reject) => {
        http.get(options, (res) => {
            var response = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                response += chunk;
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
                    return fetchUrlResponse({
                        host: host,
                        path: `/${secret}${connectedClientsPath}?Page=${page}&vapIdx=`,
                        headers: {
                            'Cookie': authCookie,
                            'Referer': `http://${host}/${secret}${connectedClientsPath}`
                        }
                    });
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

module.exports = {
    fetchConnectedClients,
    fetchConnectedClientsTimer
};