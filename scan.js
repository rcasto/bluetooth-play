var btSerial = require('bluetooth-serial-port');

/*
    Find Bluetooth candidates nearby and return them as a list
*/
function scanBluetooth() {
    return new Promise((resolve, reject) => {
        var serialPort = new btSerial.BluetoothSerialPort();
        var candidates = [];
        // Setup scan processing event handlers
        serialPort.on('found', (address, name) => {
            candidates.push({
                address,
                name
            });
        });
        serialPort.on('failure', (err) => reject(err));
        serialPort.on('finished', () => {
            resolve(candidates);
        });
        // Start the scan
        serialPort.inquire();
    });
}

function findChannelForAddress(address) {
    console.log('Address:', address);
    return new Promise((resolve, reject) => {
        var serialPort = new btSerial.BluetoothSerialPort();
        serialPort.findSerialPortChannel(address, resolve, reject);
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
        scanBluetooth().then((candidates) => {
            candidates.forEach((candidate) => {
                console.log(`Found: ${candidate.address} - ${candidate.name}`);
            });
        })
        .catch((err) => console.error('Error here:', err))
        .then(() => {
            // console.log(`Attempting to connect to candidate: ${candidate.address} - ${candidate.name}`);
            findChannelForAddress('12:05:80:47:04:CD')
                .then((channel) => {
                    console.log(`Channel: ${channel}`);
                })
                .catch((err) => console.error(err))
                .then(() => process.exit());
        }); // finally not supported it looks like
    } else {
        console.log('Goodbye.');
        process.exit();
    }
});