/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

require('console.table');
require('console');

const fs = require("fs");
const path = require('path');
const glob = require('glob');
const pathToBundle = path.resolve(__dirname, '../../../public/bundles/');
const gzipSize = require('gzip-size');

if (fs.existsSync(pathToBundle + '/bundle.css')) {
    fs.unlinkSync(pathToBundle + '/bundle.css');
}

const types = [
    { name: 'core', test: (file) => file.includes('runtime') || file.includes('main') || file.includes('vendor') },
    { name: 'modules', test: (file) => !Number.isNaN(Number(file.split('.')[0])) },
    { name: 'styles', test: (file) => file.endsWith('css') },
    { name: 'polyfills', test: (file) => file.includes('polyfills') },
    { name: 'unknown', test: () => true }
];

const bundleFiles = glob.sync(pathToBundle + '/*.@(js|css)').map((file) => {
    const stats = fs.statSync(file);
    const size = (stats.size / 1024.0); //KB
    const compressed = (gzipSize.sync(fs.readFileSync(file)) / 1024.0); //KB
    const name = path.basename(file);

    const type = types.find((t) => t.test(name));
    return { name, size, compressed, type }
});

const lengthReducer = (prev, file, key) => {
    const length = String(file[key]).length;
    return prev > length ? prev : length;
};

const rowDelimeterLengths = {
    name: bundleFiles.reduce((prev, file) => lengthReducer(prev, file, 'name'), 0),
    size: bundleFiles.reduce((prev, file) => lengthReducer(prev, file, 'size'), 0),
    compressed: bundleFiles.reduce((prev, file) => lengthReducer(prev, file, 'compressed'), 0),
    type: bundleFiles.reduce((prev, file) => lengthReducer(prev, file, 'type'), 0)
};

const createFillerRow = (delimiter) => ({
    Name: ''.padStart(rowDelimeterLengths.name, delimiter),
    Size: ''.padStart(rowDelimeterLengths.size, delimiter),
    Compressed: ''.padStart(rowDelimeterLengths.compressed, delimiter),
    Type: ''.padStart(rowDelimeterLengths.type, delimiter)
});

const fillerRows = {
    empty: createFillerRow(''),
    dashed: createFillerRow('-')
}

const memorySizePrettifier = (size, key) => size.toFixed(2).padStart(rowDelimeterLengths[key] - 3) + ' KB'

const rows = [];
types.forEach((type) => {
    if (type.name !== 'unknown') {
        const typeFilteredFiles = bundleFiles.filter((file) => file.type.name === type.name);
        typeFilteredFiles.sort((a, b) => a.size < b.size).forEach((file) => {
            rows.push({
                Name: file.name,
                Size: memorySizePrettifier(file.size, 'size'),
                Compressed: memorySizePrettifier(file.compressed, 'compressed'),
                Type: file.type.name
            })
        });
        rows.push(fillerRows.dashed);
    }
});

rows.push(fillerRows.empty);

const totalStatisticTypes = [
    { name: 'Application (start)', types: ['core', 'styles'] },
    { name: 'Application (modules)', types: ['modules'] },
    { name: 'Application (total)', types: ['core', 'styles', 'modules'] },
    { name: 'Polyfills', types: ['polyfills'] }
];

totalStatisticTypes.forEach((statistic) => {
    const filtered = bundleFiles.filter((file) => statistic.types.includes(file.type.name));
    const size = filtered.reduce((prev, file) => prev + file.size, 0);
    const compressed = filtered.reduce((prev, file) => prev + file.compressed, 0);
    rows.push({
        'Name': statistic.name,
        'Size': memorySizePrettifier(size, 'size'),
        'Compressed': memorySizePrettifier(compressed, 'compressed')
    })
})

console.table('Frontend bundle statistic', rows);