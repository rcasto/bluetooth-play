require('babel-polyfill');

var rpio = require('rpio');
var network = require('./network');
var routerFetch = require('./router-log/router-log-fetch');

var TARGET = 'FC:DB:B3:42:4C:18';
var TARGET_CONNECTED = TARGET.replace(/:/g, '-');
var PIN_OUT = 11;
var RETRY_COUNT = {
    NMAP: 3,
    CONNECTED: 1
};
var SCAN_DELAYS = {
    ROUTER_LOG: 20000,
    NMAP: 20000,
    CONNECTED: 10000
};
var SCANS = {
    ROUTER_LOG: 'routerlog',
    NMAP: 'nmap',
    CONNECTED: 'clients'
};

var currentOutput = rpio.LOW;
var currentRetryCount = resetRetryCounts();
var prevReport = null;

function resetRetryCounts() {
    return (currentRetryCount = {
        [SCANS.NMAP]: RETRY_COUNT.NMAP,
        [SCANS.CONNECTED]: RETRY_COUNT.CONNECTED
    });
}

function startCircuit(hasTarget, type) {
    if (hasTarget) {
        currentOutput = rpio.HIGH;
        resetRetryCounts();
    } else if (type !== SCANS.ROUTER_LOG) {
        if (currentRetryCount[type] > 0) {
            currentRetryCount[type]--;
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
SCAN_DELAYS.NMAP, 
function (report) {
    var hasTarget = network.getAddresses(report).some((address) => {
        return address.address === TARGET;
    });
    if (prevReport) {
        console.log('Report:', network.diffReports(prevReport, report));
    }
    prevReport = report;
    startCircuit(hasTarget, SCANS.NMAP);
}, onError);

// Router Log Scanner
// routerFetch.fetchSystemLogUpdatesTimer(SCAN_DELAYS.ROUTER_LOG, (logs) => {
//     var hasTarget = logs.some((log) => {
//         return log.address === TARGET;
//     });
//     console.log("Logs:", logs, hasTarget);
//     startCircuit(hasTarget, SCANS.ROUTER_LOG);
// }, onError);

// Connected Clients Scanner
routerFetch.fetchConnectedClientsTimer(SCAN_DELAYS.CONNECTED, (clients) => {
    var hasTarget = clients.some((client) => {
        return client === TARGET_CONNECTED;
    });
    console.log("Clients:", clients, hasTarget);
    startCircuit(hasTarget, SCANS.CONNECTED);
}, onError);

// Cleanup when stopping scans
process.on('exit', function () {
    rpio.close(PIN_OUT);
});