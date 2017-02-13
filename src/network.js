var nmap = require('libnmap');

function getItemAddresses(item) {
    if (!item || !item.host) {
        return [];
    }
    let addresses;
    return Array.prototype.concat.apply([], item.host.map(function (host) {
        addresses = host.address || [];
        return addresses.map(function (address) {
            address = address.item || {};
            return {
                address: address.addr || '',
                addressType: address.addrtype || '',
                vendor: address.vendor || ''
            };
        });
    }));
}

function getAddresses(report) {
    report = report || {};
    return Array.prototype.concat.apply([], Object.keys(report).map(function (item) {
        return getItemAddresses(report[item]);
    }));
}

function printReport(report) {
    getAddresses(report)
        .forEach(function (address) {
            console.log(address.address, '-', address.vendor);
        });
    console.log();
}

function scan(options) {
    return new Promise((resolve, reject) => {
        nmap.scan(options, function (err, report) {
            if (err) {
                return reject(err);
            }
            return resolve(report);
        });
    });
}

function scanTimer(options, scanInterval, onReport, onError) {
    var timeoutid;
    (function _scan() {
        scan(options)
            .then(onReport)
            .then(function () {
                timeoutid = setTimeout(_scan, scanInterval);
            })
            .catch(onError);
    }());
    return () => clearTimeout(timeoutid);
}

module.exports =  {
    getAddresses,
    printReport,
    scan,
    scanTimer
};