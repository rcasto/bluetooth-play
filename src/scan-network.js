require('babel-polyfill');

var rpio = require('rpio');
var network = require('./network');
var routerFetch = require('./router-log/router-log-fetch');

var TARGET = 'FC:DB:B3:42:4C:18';
var PIN_OUT = 11;
var RETRY_COUNT = 3;
var SCAN_DELAY = 15000;

var currentOutput = rpio.LOW;
var currentRetryCount = 0;
var prevReport = null;

function startCircuit(hasTarget, isRouterLog) {
    if (hasTarget) {
        currentOutput = rpio.HIGH;
        currentRetryCount = RETRY_COUNT;
    } else if (!isRouterLog) {
        if (currentRetryCount > 0) {
            currentRetryCount--;
        } else {
            currentOutput = rpio.LOW;
        }
    }
    rpio.write(PIN_OUT, currentOutput);
}

function onError(error) {
    console.error('Something went wrong:', error);
}

// Initialize pin output and mode
rpio.open(PIN_OUT, rpio.OUTPUT, currentOutput);

// NMAP Scanner
network.scanTimer({
    range: [
        '192.168.0.100-115'
    ],
    // Playing with flags described here: https://nmap.org/book/man-performance.html
    flags: [
        '-n',
        '-T4',
        '--max-retries 3',
        '--max-rtt-timeout 100ms'
    ],
    timeout: 60
}, 
SCAN_DELAY, 
function (report) {
    var hasTarget = network.getAddresses(report).some((address) => {
        return address.address === TARGET;
    });
    if (prevReport) {
        console.log('Report:', network.diffReports(prevReport, report));
    }
    prevReport = report;
    startCircuit(hasTarget, false);
}, onError);

// Router Log Scanner
// routerFetch.fetchSystemLogUpdatesTimer(SCAN_DELAY, (logs) => {
//     var hasTarget = logs.some((log) => {
//         return log.address === TARGET;
//     });
//     console.log("Logs:", logs, hasTarget);
//     startCircuit(hasTarget, true);
// }, onError);

// Connected Clients Scanner
routerFetch.fetchConnectedClientsTimer(SCAN_DELAY, (clients) => {
    var hasTarget = clients.some((client) => {
        return client === TARGET;
    });
    console.log("Clients:", clients, hasTarget);
    startCircuit(hasTarget, false);
}, onError);

// Cleanup when stopping scans
process.on('exit', function () {
    rpio.close(PIN_OUT);
});