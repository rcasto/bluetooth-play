require('babel-polyfill');

var rpio = require('rpio');
var network = require('./network');
var routerFetch = require('./router-log/router-log-fetch');

var TARGET = 'FC:DB:B3:42:4C:18';
var PIN_OUT = 11;
var RETRY_COUNT = 2;
var SCAN_DELAY = 15000;

var currentOutput = rpio.LOW;
var currentRetryCount = 0;
var prevReport = null;

function startCircuit(hasTarget) {
    if (hasTarget) {
        currentOutput = rpio.HIGH;
        currentRetryCount = RETRY_COUNT;
    } else if (currentRetryCount > 0) {
        currentRetryCount--;
    } else {
        currentOutput = rpio.LOW;
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
    var hasTarget = network.getAddresses(report).some(function (address) {
        return address.address === TARGET;
    });
    startCircuit(hasTarget);
}, onError);

// Router Log Scanner
routerFetch.fetchSystemLogUpdatesTimer(SCAN_DELAY, function (logs) {
    var hasTarget = logs.some((log) => {
        return log.address === TARGET;
    });
    startCircuit(hasTarget);
}, onError);

// Cleanup when stopping scan
process.on('exit', function () {
    rpio.close(PIN_OUT, rpio.PIN_RESET);
});