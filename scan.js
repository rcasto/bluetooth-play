var btSerial = require('bluetooth-serial-port');

var serialPort = new btSerial.BluetoothSerialPort();

// Setup scan processing event handlers
serialPort.on('found', function (address, name) {
    console.log('Found:', address, ' - ', name);
});
serialPort.on('finished', function () {
    console.log('Scan finished.');
});

// Start the scanning process
console.log('Scan beginning.');
serialPort.inquire();