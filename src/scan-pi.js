require("babel-polyfill");

var rpio = require('rpio');
var bluetooth = require('./bluetooth');

var PIN_OUT = 8;

// Initialize pin out to low
rpio.open(12, rpio.OUTPUT, rpio.LOW);

bluetooth.scanBluetoothTimer(1, 10000, (candidates) => {
    console.log('Scan frame complete');
    candidates.forEach((candidate) => {
        console.log(`Found: ${candidate.address} - ${candidate.name}`);
    });
    console.log();

    var output_voltage = rpio.LOW;
    if (candidates.length > 0) {
        output_voltage = rpio.HIGH;
    }
    console.log('Writing voltage:', output_voltage);
    rpio.write(PIN_OUT, output_voltage);
}, (percentComplete) => {
    console.log(`Scan frame ${percentComplete}% complete`);
}, (error) => {
    console.error('An error occurred:', error);
});
