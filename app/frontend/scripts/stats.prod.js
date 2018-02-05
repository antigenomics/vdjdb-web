/*
 *        Copyright 2017 Bagaev Dmitry
 *
 *        Licensed under the Apache License, Version 2.0 (the "License");
 *        you may not use this file except in compliance with the License.
 *        You may obtain a copy of the License at
 *
 *            http://www.apache.org/licenses/LICENSE-2.0
 *
 *        Unless required by applicable law or agreed to in writing, software
 *        distributed under the License is distributed on an "AS IS" BASIS,
 *        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *        See the License for the specific language governing permissions and
 *        limitations under the License.
 *
 */

require('console.table');
require('console');

const fs = require("fs");
const path = require('path');
const pathToBundle = path.resolve(__dirname, '../../../public/bundles/');
const gzipSize = require('gzip-size');

if (fs.existsSync(pathToBundle + '/bundle.css')) {
    fs.unlinkSync(pathToBundle + '/bundle.css');
}

const bundleFiles = [
    {name: 'polyfills.bundle.js', count: true, start: true},
    {name: 'polyfills-ie.bundle.js', count: false, start: false},
    {name: 'vendor.bundle.js', count: true, start: true},
    {name: 'main.bundle.js', count: true, start: true},
    {name: 'annotations.module.chunk.js', count: true, start: false},
    {name: 'bundle.min.css', count: true, start: true}
];

let total = {startSize: 0, startGzip: 0, totalSize: 0, totalGzip: 0};

const bundleStats = bundleFiles.map((file, index) => {
    const stats = fs.statSync(pathToBundle + '/' + file.name);
    const size = (stats.size / 1024.0); //KB
    const gzip = (gzipSize.sync(fs.readFileSync(pathToBundle + '/' + file.name)) / 1024.0); //KB

    if (file.count) {
        total.totalSize += size;
        total.totalGzip += gzip;
    }

    if (file.start) {
        total.startSize += size;
        total.startGzip += gzip;
    }

    return {
        '#': index + 1,
        'File name': file.name,
        'Size': size.toFixed(2) + ' KB',
        'Compressed': gzip.toFixed(2) + ' KB',
        'Start': file.start
    }
}).concat([
    {
        '#': '>',
        'File name': 'Total',
        'Size': total.totalSize.toFixed(2) + ' KB',
        'Compressed': total.totalGzip.toFixed(2) + ' KB',
        'Start': ''
    },
    {
        '#': '>',
        'File name': 'On start',
        'Size': total.startSize.toFixed(2) + ' KB',
        'Compressed': total.startGzip.toFixed(2) + ' KB',
        'Start': ''
    },
]);

console.table('Frontend bundle statistics', bundleStats);