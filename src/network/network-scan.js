require('babel-polyfill');

var isRaspberryPi = !process.argv.some((arg) => arg.toLowerCase() === '-nopi');

var rpio;
if (isRaspberryPi) {
    rpio = require('rpio');
} else {
    // mock object
    rpio = {
        write: () => { },
        close: () => { },
        open: () => { }
    };
}

var network = require('./network-lib');
var routerFetch = require('./router-info/router-info');

var TARGET = 'FC:DB:B3:42:4C:18';
var TARGET_CONNECTED = TARGET.replace(/:/g, '-');
var PIN_OUT = 11;
var RETRY_COUNT = {
    NMAP: 2,
    CONNECTED: 1
};
var SCAN_DELAYS = {
    NMAP: 15000,
    CONNECTED: 5000
};
var SCANS = {
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
    } else if (currentRetryCount[type] > 0) {
        currentRetryCount[type]--;
    } else {
        currentOutput = rpio.LOW;
    }
    rpio.write(PIN_OUT, currentOutput);
}

function cleanup() {
    rpio.close(PIN_OUT);
    process.exit();
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
        console.log('NMAP Report:', network.diffReports(prevReport, report));
    }
    prevReport = report;
    startCircuit(hasTarget, SCANS.NMAP);
}, onError);

// Connected Clients Scanner
routerFetch.fetchConnectedClientsTimer(SCAN_DELAYS.CONNECTED, (clients) => {
    var hasTarget = clients.some((client) => {
        return client === TARGET_CONNECTED;
    });
    console.log("Connected Clients:", clients, hasTarget);
    startCircuit(hasTarget, SCANS.CONNECTED);
}, onError);

// Cleanup when stopping scans
process.on('exit', cleanup);
process.on('SIGINT', cleanup);