require('babel-polyfill');

var rpio = require('rpio');
var network = require('./network');

var TARGET = 'FC:DB:B3:42:4C:18';
var PIN_OUT = 11;
var RETRY_COUNT = 2;
var SCAN_DELAY = 15000;

var currentOutput = rpio.LOW;
var currentRetryCount = 0;
var prevReport = null;

// Initialize pin output and mode
rpio.open(PIN_OUT, rpio.OUTPUT, currentOutput);

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
    ]
}, 
SCAN_DELAY, 
function (report) {
    var hasTarget = network.getAddresses(report).some(function (address) {
        return address.address === TARGET;
    });
    if (hasTarget) {
        currentOutput = rpio.HIGH;
        currentRetryCount = RETRY_COUNT;
    } else if (currentRetryCount > 0) {
        currentRetryCount--;
    } else {
        currentOutput = rpio.LOW;
    }
    rpio.write(PIN_OUT, currentOutput);
    // if (prevReport) {
    //     network.diffReports(prevReport, report);
    // } else {
    //     network.printReport(report);
    // }
    // prevReport = report;
}, function (error) {
    console.error('Something went wrong:', error);
});