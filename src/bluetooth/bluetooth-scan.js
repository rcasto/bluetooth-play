require('babel-polyfill');

var rpio = require('rpio');
var bluetooth = require('./bluetooth-lib');

var PIN_OUT = 11;
var TARGET = '54:40:AD:CF:46:82';

// Initialize pin out to low
rpio.open(PIN_OUT, rpio.OUTPUT, rpio.LOW);

bluetooth.scanBluetoothTimer(1, 10000, (candidates) => {
    console.log('Scan frame complete');
    var output_voltage = rpio.LOW;
    candidates.forEach((candidate) => {
        console.log(`Found: ${candidate.address} - ${candidate.name}`);
        if (candidate.address === TARGET) {
            output_voltage = rpio.HIGH;
        }
    });
    rpio.write(PIN_OUT, output_voltage);
    console.log();
}, (percentComplete) => {
    console.log(`Scan frame ${percentComplete}% complete`);
}, (error) => {
    console.error('An error occurred:', error);
});