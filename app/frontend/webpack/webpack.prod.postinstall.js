require('console.table');

const fs = require("fs");
const path = require('path');
const pathToBundle = path.resolve(__dirname, '../../../public/bundles/');
const gzipSize = require('gzip-size');

function getStats(fileName) {
    const stats = fs.statSync(pathToBundle + '/' + fileName);
    const size = (stats.size / 1024.0).toFixed(2);
    const gzip = (gzipSize.sync(fs.readFileSync(pathToBundle + '/' + fileName)) / 1024.0).toFixed(2);

    return {
        fileName: fileName,
        size: size,
        gzip: gzip
    }
}

if (fs.existsSync(pathToBundle + '/bundle.css')) {
    fs.unlinkSync(pathToBundle + '/bundle.css');
}

const bundleFiles = [
    'bundle.min.js',
    'bundle.min.css'
];

var total = {
    size: 0,
    gzip: 0
};

const bundleStats = bundleFiles
    .map(function (fileName, index) {
        const stats = getStats(fileName);
        total.size += parseFloat(stats.size);
        total.gzip += parseFloat(stats.gzip);
        return {
            '#': index + 1,
            'File name': stats.fileName,
            'Size': stats.size += ' KB',
            'gzip': stats.gzip += ' KB'
        }
    })
    .concat([
        {
            '#': '',
            'File name': '================',
            'Size': '===========',
            'gzip': '==========='
        },
        {
            '#': '',
            'File name': '',
            'Size': total.size.toFixed(2) + ' KB',
            'gzip': total.gzip.toFixed(2) + ' KB'
        }
    ]);
console.table('Fronted bundle statistics', bundleStats);
