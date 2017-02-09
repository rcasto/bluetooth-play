require("babel-polyfill");

var rpio = require('rpio');
var bluetooth = require('./bluetooth');

var PIN_OUT = 11;

// Initialize pin out to low
rpio.open(PIN_OUT, rpio.OUTPUT, rpio.LOW);

bluetooth.scanBluetoothTimer(1, 10000, (candidates) => {
    console.log('Scan frame complete');
    candidates.forEach((candidate) => {
        console.log(`Found: ${candidate.address} - ${candidate.name}`);
    });
    var output_voltage = rpio.LOW;
    if (candidates.length > 0) {
        output_voltage = rpio.HIGH;
    }
    rpio.write(PIN_OUT, output_voltage);
    console.log('Writing voltage:', output_voltage);
    console.log();
}, (percentComplete) => {
    console.log(`Scan frame ${percentComplete}% complete`);
}, (error) => {
    console.error('An error occurred:', error);
});
