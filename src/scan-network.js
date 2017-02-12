require("babel-polyfill");

// var rpio = require('rpio');
var network = require('./network');

var TARGET = 'FC:DB:B3:42:4C:18';
var PIN_OUT = 11;

network.scanTimer({
    range: [
        '192.168.0.100-120'
    ]
}, 
10000, 
function (report) {
    network.getAddresses(report)
        .forEach(function (address) {
            console.log(address.address, '-', address.vendor);
        });
    console.log();
}, function (error) {
    console.error('Something went wrong:', error);
});