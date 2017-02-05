var bluetooth = require('./bluetooth');

// Prompt User to begin bluetooth scan
process.stdout.write('Start bluetooth scan? (y/n)  ');
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (text) => {
    text = text && text.toLowerCase().trim();
    if (text === 'y' || text === 'yes') {
        console.log('Starting scan...');
        bluetooth.scanBluetooth(5, (percentComplete) => {
            console.log(`Scanning ${percentComplete}% complete`);
        }).then((candidates) => {
            console.log('Scanning complete');
            candidates.forEach((candidate) => {
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