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

module.exports = function (config) {
    config.set({
        basePath: '',

        frameworks: ['jasmine'],

        plugins: [
            require('../../app/frontend/node_modules/karma-jasmine'),
            require('../../app/frontend/node_modules/karma-chrome-launcher'),
            require('../../app/frontend/node_modules/karma-ie-launcher'),
            require('../../app/frontend/node_modules/karma-safari-launcher'),
            require('../../app/frontend/node_modules/karma-firefox-launcher'),
            require('../../app/frontend/node_modules/karma-opera-launcher'),
            require('../../app/frontend/node_modules/karma-jasmine-html-reporter'),
            require('../../app/frontend/node_modules/karma-coverage-istanbul-reporter')
        ],

        exclude: [
            '../../app/frontend/node_modules/**/*spec.js'
        ],

        client:{
            clearContext: false // leave Jasmine Spec Runner output visible in browser
        },

        coverageIstanbulReporter: {

            reports: [ 'html', 'lcovonly' ],

            fixWebpackSourcePaths: true

        },

        reporters: ['progress', 'kjhtml'],

        port: 9876,

        colors: true,

        logLevel: config.LOG_INFO,

        autoWatch: true,

        // browsers: ['Chrome', 'IE', 'Safari', 'Firefox', 'Opera'],
        browsers: [ 'Chrome' ],

        coverageReporter: {
            dir: 'coverage/',
            reporters: [
                { type: 'text-summary' },
                { type: 'json', subdir: '.', file: 'coverage-final.json' },
                { type: 'html' }
            ]
        },

        singleRun: false
    });
};