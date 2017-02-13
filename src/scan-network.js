require("babel-polyfill");

var rpio = require('rpio');
var network = require('./network');

var TARGET = 'FC:DB:B3:42:4C:18';
var PIN_OUT = 11;

// Initialize pin out to low
rpio.open(PIN_OUT, rpio.OUTPUT, rpio.LOW);

network.scanTimer({
    range: [
        '192.168.0.100-120'
    ]
}, 
10000, 
function (report) {
    var output_voltage = rpio.LOW;
    console.log('Scan complete');
    network.getAddresses(report)
        .forEach(function (address) {
            console.log(address.address, '-', address.vendor);
            if (address.address === TARGET) {
                output_voltage = rpio.HIGH;
            }
        });
    rpio.write(PIN_OUT, output_voltage);
    console.log();
}, function (error) {
    console.error('Something went wrong:', error);
});