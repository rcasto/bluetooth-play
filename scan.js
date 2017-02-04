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

function findChannelForAddress(address) {
    console.log('Address:', address);
    return new Promise((resolve, reject) => {
        var serialPort = new btSerial.BluetoothSerialPort();
        serialPort.findSerialPortChannel(address, resolve, reject); // there is no error object passed to reject
    });
}

// Prompt User to begin bluetooth scan
process.stdout.write('Start bluetooth scan? (y/n)  ');
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (text) => {
    text = text && text.toLowerCase().trim();
    if (text === 'y' || text === 'yes') {
        console.log('Starting scan...');
        scanBluetooth(5, (percentComplete) => {
            console.log(`Scanning ${percentComplete}% complete`);
        }).then((candidates) => {
            candidates.forEach((candidate) => {
                console.log('Scanning complete');
                console.log(`Found: ${candidate.address} - ${candidate.name}`);
            });
        })
        .catch((err) => console.error('Error here:', err))
        .then(() => {
            process.exit();
        }); // finally not supported it looks like
    } else {
        console.log('Goodbye.');
        process.exit();
    }
});