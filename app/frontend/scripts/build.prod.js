/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const closureCompiler = require('google-closure-compiler').compiler;
const glob = require('glob');

console.log('Building frontend in production mode.');

const files = [
    'node_modules/zone.js/dist/zone.js',
    'node_modules/@angular/core/@angular/core.js',
    'node_modules/@angular/common/@angular/common.js',
    'node_modules/@angular/compiler/@angular/compiler.js',
    'node_modules/@angular/router/@angular/router.js',
    'node_modules/@angular/forms/@angular/forms.js',
    'node_modules/@angular/platform-browser/@angular/platform-browser.js',
    'vendor/zone_extern.js'
].concat(glob.sync('./lib/aot/**/*.js')).concat(glob.sync('./lib/rxjs-dist/rxjs/**/*.js'));

const compiler = new closureCompiler({
    js: files,
    language_in: 'ES6_STRICT',
    language_out: 'ES5',
    compilation_level: 'SIMPLE_OPTIMIZATIONS',
    entry_point: './lib/aot/main.prod.js',
    js_output_file: '../../public/bundles/bundle.min.js',
    create_source_map: '%outname%.map',
    warning_level: 'QUIET',
    rewrite_polyfills: false,
    dependency_mode: 'strict',
    process_common_js_modules: true,
    js_module_root: [
        'node_modules/@angular/core',
        'node_modules/@angular/common',
        'node_modules/@angular/compiler',
        'node_modules/@angular/platform-browser',
        'node_modules/@angular/router',
        'node_modules/@angular/forms',
        'lib/rxjs-dist'
    ]
});

compiler.run(function (exitCode, stdout, stderr) {
    if (exitCode === 0) {
        console.log('Build successful.');
    } else {
        console.error(stderr);
    }
});