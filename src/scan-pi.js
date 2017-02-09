require("babel-polyfill");

var rpio = require('rpio');
var bluetooth = require('./bluetooth');

var PIN_OUT = 8;

// Initialize pin out to low
rpio.open(12, rpio.OUTPUT, rpio.LOW);

for (var i = 0; i < 5; i++) {
    /* On for 1 second */
    rpio.write(PIN_OUT, rpio.HIGH);
    rpio.sleep(1);

    /* Off for half a second (500ms) */
    rpio.write(PIN_OUT, rpio.LOW);
    rpio.msleep(500);
}

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
