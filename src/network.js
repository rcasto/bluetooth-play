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
            console.log(buildAddressString(address));
        });
    console.log();
}

function buildAddressString(address) {
    return `${address.address} - ${address.vendor}`;
}
function buildAddressBag(report) {
    var bag = {};
    getAddresses(report).forEach(function (address) {
        bag[address.address] = address;
    });
    return bag;
}
// With reference to the first report are the +'s and -'s
function diffReports(report1, report2) {
    var address1Bag = buildAddressBag(report1);
    var address2Bag = buildAddressBag(report2);
    Object.keys(address2Bag).forEach(function (address) {
        if (address1Bag[address]) {
            delete address1Bag[address];
        } else { // added in the second report
            console.log('(+)', buildAddressString(address2Bag[address]));
        }
    });
    // Leftover addresses in bag 1 were removed in the second report
    Object.keys(address1Bag).forEach(function (address) {
        console.log('(-)', buildAddressString(address1Bag[address]));
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
    diffReports,
    scan,
    scanTimer
};