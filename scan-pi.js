var bluetooth = require('./bluetooth');

bluetooth.scanBluetoothTimer(1, 5000, (candidates) => {
    console.log('Scan frame complete');
    candidates.forEach((candidate) => {
        console.log(`Found: ${candidate.address} - ${candidate.name}`);
    });
    console.log();
}, (percentComplete) => {
    console.log(`Scan frame ${percentComplete}% complete`);
}, (error) => {
    console.error('An error occurred:', error);
});