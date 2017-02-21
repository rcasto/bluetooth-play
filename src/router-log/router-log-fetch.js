var http = require('http');
var url = require('url');
var cheerio = require('cheerio');
var encrypt = require('./encrypt');
var config = require('./config.json');

var latestRecord = null;

// TP-Link Model No. TL-WR841N
var host = '192.168.0.1';
var loginPath = '/userRpm/LoginRpm.htm?Save=Save';
var systemLogPath = '/userRpm/SystemLogRpm.htm';
var menuPath = '/userRpm/MenuRpm.htm';
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

function extractSystemLogs(response) {
    var extractRegex = /"(.*)"/g;
    var responseText = cheerio.load(response)('script').eq(1).text();
    var systemLogs = [], systemLog;
    var address, timestamp, type, level;
    while ((systemLog = extractRegex.exec(responseText)) !== null) {
        systemLog = systemLog[1].split('\t');
        
        timestamp = systemLog[0];
        type = ((systemLog[1] && systemLog[1]) || '').trim();
        level = ((systemLog[2] && systemLog[2]) || '').trim();
        address = (systemLog[3] && systemLog[3].split(' ')) || [];
        address = ((address[4] || address[3]) || '').trim();
        
        systemLogs.push({
            timestamp: timestamp,
            address: address,
            type: type,
            level: level
        });
    }
    return systemLogs;
}

function extractConnectedClients(response) {
    var responseText = cheerio.load(response)('script').eq(1).text();
    // Create IIFE to not pollute global scope
    return (() => {
        console.log('Test before:', responseText);
        eval(responseText);
        // console.log('Test after:', hostList);
        return (typeof hostList !== "undefined" && hostList && hostList.filter((host) => {
            return typeof host === 'string';
        })) || [];
    })();
}

function findAnySystemLog(targets, systemLogs) {
    systemLogs = systemLogs || [];
    targets = targets || [];

    if (!Array.isArray(targets)) {
        targets = [targets];
    }

    var index = -1;
    systemLogs.some(function (log, i) {
        return targets.some(function (target) {
            if (log.address === target.address &&
                log.type === target.type &&
                log.level === target.level) {
                index = i;
                return true;
            }
            return false;
        });
        return false;
    });
    return index;
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
    return loginAndGetSecret()
        .then((secret) => {
            return fetchUrlResponse({
                host: host,
                path: `/${secret}${connectedClientsPath}?Page=1&vapIdx=`,
                headers: {
                    'Cookie': authCookie,
                    'Referer': `http://${host}/${secret}${connectedClientsPath}`
                }
            });
        })
        .then(extractConnectedClients);
}

function fetchSystemLogs() {
    return loginAndGetSecret()
        .then((secret) => {
            return fetchUrlResponse({
                host: host,
                path: `/${secret}${systemLogPath}`,
                headers: {
                    'Cookie': authCookie,
                    'Referer': `http://${host}/${secret}${menuPath}`
                }
            });
        })
        .then(extractSystemLogs);
}

function fetchSystemLogUpdates() {
    if (!latestRecord) {
        return fetchSystemLogs().then((systemLogs) => {
            if (systemLogs[0]) {
                latestRecord = systemLogs[0];
            }
            return [];
        });
    }
    return fetchSystemLogs()
        .then((systemLogs) => {
            return {
                logs: systemLogs,
                index: findAnySystemLog(latestRecord, systemLogs)
            };
        })
        .then((systemLogReport) => {
            if (systemLogReport.logs[0]) {
                latestRecord = systemLogReport.logs[0];
            }
            // Return all logs if latest record not found
            if (systemLogReport.index < 0) {
                systemLogReport.index = systemLogReport.logs.length;
            }
            return systemLogReport.logs.slice(0, systemLogReport.index);
        });
}

function fetchSystemLogUpdatesTimer(timerDelay, onLogUpdates, onError) {
    var timeoutid;
    (function _fetchSystemLogUpdates() {
        fetchSystemLogUpdates()
            .then(onLogUpdates)
            .then(function () {
                timeoutid = setTimeout(_fetchSystemLogUpdates, timerDelay);
            })
            .catch(onError);
    }());
    return () => clearTimeout(timeoutid);
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

// Testing
// fetchConnectedClientsTimer(10000, (response) => {
//     console.log('Response:', response);
// }, (error) => console.error(error));

module.exports = {
    fetchSystemLogs,
    fetchSystemLogUpdates,
    fetchSystemLogUpdatesTimer,
    fetchConnectedClients,
    fetchConnectedClientsTimer
};