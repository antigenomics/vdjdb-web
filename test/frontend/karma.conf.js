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
 */

'use strict';

module.exports = config => {
    config.set({
        files: [ 'dll/polyfills.dll.js', 'dll/vendor.dll.js', 'karma.entry.js' ],

        frameworks: [ 'jasmine' ],

        plugins: [
            require('../../app/frontend/node_modules/karma-jasmine'),
            require('../../app/frontend/node_modules/karma-chrome-launcher'),
            require('../../app/frontend/node_modules/karma-jasmine-html-reporter'),
            require('../../app/frontend/node_modules/karma-coverage-istanbul-reporter'),
            require('../../app/frontend/node_modules/karma-webpack'),
            require('../../app/frontend/node_modules/karma-sourcemap-loader')
        ],

        phantomJsLauncher: {
            exitOnResourceError: true
        },

        preprocessors: {
            'karma.entry.js': [ 'webpack', 'sourcemap' ]
        },

        client: {
            clearContext: false // leave Jasmine Spec Runner output visible in browser
        },

        coverageIstanbulReporter: {
            reports: [ 'html', 'lcovonly' ],
            fixWebpackSourcePaths: true
        },

        reporters: [ 'progress', 'kjhtml' ],

        port: 9876,

        colors: true,

        logLevel: config.LOG_INFO,

        autoWatch: true,

        browsers: [ 'Chrome' ],

        singleRun: false,

        webpack: require('./webpack.test.js'),
        webpackServer: {
            noInfo: true
        }
    });
};