var btSerial = require('bluetooth-serial-port');

/*
    Find Bluetooth candidates nearby and return them as a list
*/
function scanBluetooth(numScans, progressFunc) {
    var totalScans = numScans;
    // Always runs at least 1 scan, or else why call it in the first place?
    if (!numScans || numScans < 0) {
        numScans = 1;
    }
    return new Promise((resolve, reject) => {
        var serialPort = new btSerial.BluetoothSerialPort();
        var candidates = {};
        // Setup scan processing event handlers
        serialPort.on('found', (address, name) => {
            if (!candidates[address]) {
                candidates[address] = {
                    address,
                    name
                };
            }
        });
        serialPort.on('failure', reject);
        serialPort.on('finished', () => {
            numScans--;
            if (numScans > 0) {
                progressFunc && progressFunc(100 * (1 - (numScans / totalScans)));
                serialPort.inquire();
            } else {
                let candidatesList = Object.keys(candidates).map((address) => {
                    return candidates[address];
                });
                resolve(candidatesList);
            }
        });
        // Start the initial scan
        serialPort.inquire();
    });
}

function scanBluetoothTimer(numScansPerCheck, delayBetweenScans, onCandidates, onProgress, onError) {
    var timeoutId = null;
    scanBluetooth(numScansPerCheck, onProgress).then(function _scan(candidates) {
        onCandidates(candidates);
        timeoutId = setTimeout(() => scanBluetooth(numScansPerCheck, onProgress)
                            .then(_scan, onError), delayBetweenScans);
    }, onError);
    return () => clearTimeout(timeoutId);
}

function findChannelForAddress(address) {
    return new Promise((resolve, reject) => {
        var serialPort = new btSerial.BluetoothSerialPort();
        serialPort.findSerialPortChannel(address, resolve, reject); // there is no error object passed to reject
    });
}

module.exports = {
    scanBluetooth,
    scanBluetoothTimer,
    findChannelForAddress
};