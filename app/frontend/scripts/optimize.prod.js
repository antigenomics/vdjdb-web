/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const purify = require('purify-css');
const bundles = path.resolve(__dirname, '../../../public/bundles/');
const sources = path.resolve(__dirname, '../src/app/');
const views   = path.resolve(__dirname, '../views/');

// Disable build-in angular assets mangling for core files
const names = ['main.', 'runtime.', 'polyfills.', 'styles.'];
const files = glob.sync(bundles + '/*.@(js|css)').filter((file) => names.some((name) => file.includes(name))).map((path) => {
    return {
        basename: path.replace(/\\/g, '/').replace(/.*\//, ''),
        dirname: path.replace(/\\/g, '/').replace(/\/[^\/]*$/, ''),
        extension: path.split('.').pop(),
        path: path,
    }
});

// Optimize css assets with PurifyCSS
const moved = files.map((file) => {
    const mvPath = file.dirname + '/' + names.find((n) => file.basename.includes(n)) + file.extension;
    fs.renameSync(file.path, mvPath);
    return mvPath;
});

const content = [ bundles + '/*.js', sources + '/*.html', views + '/*.html' ];
const css = moved.filter((path) => path.split('.').pop() === 'css');

css.forEach((filename) => {
    purify(content, [ filename ], {
        info: true,
        minify: true,
        output: filename,
        whitelist: [
            'success', 'warning', 'error', 'info', 'checkmark', 'box', 'sign', 'remove',
            'circle', 'icon', 'violet', 'circular', 'circle',
            'text', 'alignment', 'big', 'hover-inside-icon', 'overview', 'pre', 'code', 'auth', 'account',
            'mail', 'lock', 'basic'
        ]
    });
});

// Remove unnecessary index.html file
if (fs.existsSync(bundles + '/index.html')) {
    fs.unlinkSync(bundles + '/index.html');
}