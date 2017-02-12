var nmap = require('node-libnmap');
var opts = {
    verbose: true,
    // range: [
    //     '192.168.0.100-120'
    // ]
};

nmap.discover(function(err, report) {
    if (err) throw new Error(err);
 
    for (var item in report) {
        console.log(JSON.stringify(report[item]));
    }
});