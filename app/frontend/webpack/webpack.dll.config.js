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

console.log('Configuring frontend dll in development mode');

const path = require('path');
const base = require('./webpack.base.config');
const webpack = require('webpack');

const configuration = base.getBaseConfiguration();

configuration.mode = 'production';
configuration.resolve.extensions = [ '.js' ];
configuration.entry = {
    polyfills: [
        'core-js',
        'reflect-metadata',
        'zone.js'
    ],
    vendor: [
        '@angular/compiler',
        '@angular/platform-browser',
        '@angular/platform-browser-dynamic',
        '@angular/core',
        '@angular/common',
        '@angular/forms',
        '@angular/router',
        'rxjs',
        'd3',
        'gzip-js'
    ]
};

configuration.output.filename = '[name].dll.js';
configuration.output.library = '[name]_[hash]';
configuration.plugins = [
    new webpack.DllPlugin({
        path: path.join(base.getBuildPath(), "[name]-manifest.json"),
        name: "[name]_[hash]"
    })
];

module.exports = configuration;