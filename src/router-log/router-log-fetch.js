var http = require('http');
var url = require('url');
var cheerio = require('cheerio');
var encrypt = require('./encrypt');
var config = require('./config.json');

var latestRecords = [];
var num_latest_records = 3;

// TP-Link Model No. TL-WR841N
var host = '192.168.0.1';
var loginPath = '/userRpm/LoginRpm.htm?Save=Save';
var systemLogPath = '/userRpm/SystemLogRpm.htm';
var menuPath = '/userRpm/MenuRpm.htm';

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
    var systemLogs = [], systemLog, address, timestamp;
    while ((systemLog = extractRegex.exec(responseText)) !== null) {
        systemLog = systemLog[1].split('\t');
        
        timestamp = systemLog[0];
        address = systemLog[3].split(' ');
        address = address[4] || address[3];
        
        systemLogs.push({
            timestamp: timestamp,
            address: address
        });
    }
    return systemLogs;
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
                log.timestamp === target.timestamp) {
                index = i;
                return true;
            }
            return false;
        });
        return false;
    });
    return index;
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

function fetchSystemLogs() {
    return fetchUrlResponse({
        host: host,
        path: loginPath,
        headers: {
            'Cookie': authCookie
        }
    })
    .then((response) => {
        var secret = extractSecretFromResponse(response);
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
    if (latestRecords.length <= 0) {
        return fetchSystemLogs().then((systemLogs) => {
            if (systemLogs.length > 0) {
                if (systemLogs[2]) {
                    latestRecords.push(systemLogs[2]);
                }
                if (systemLogs[1]) {
                    latestRecords.push(systemLogs[1]);
                }
                latestRecords.push(systemLogs[0]);
            }
            return [];
        });
    }
    return fetchSystemLogs()
        .then((systemLogs) => {
            return {
                logs: systemLogs,
                index: findAnySystemLog(latestRecords, systemLogs)
            };
        })
        .then((systemLogReport) => {
            console.log('Set latest:', latestRecords);
            if (systemLogReport.logs[0] &&
                findAnySystemLog(systemLogReport.logs[0], latestRecords) < 0) {
                if (latestRecords.length === num_latest_records) {
                    latestRecords.shift();
                }
                latestRecords.push(systemLogReport.logs[0]);
            }
            // Return all logs if latest record not found
            if (systemLogReport.index < 0) {
                console.log('Huh?', latestRecords, systemLogReport);
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

module.exports = {
    fetchSystemLogs,
    fetchSystemLogUpdates,
    fetchSystemLogUpdatesTimer
};