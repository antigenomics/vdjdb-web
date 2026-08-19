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

// Karma configuration. Plugins are required by path because this file sits outside
// app/frontend/, where node_modules lives, so Karma's own resolution would not find them.
//
// The framework is '@angular-devkit/build-angular', not the '@angular/cli' this file used to
// name: that was the Angular CLI 1.x plugin, and the builder has been
// @angular-devkit/build-angular:karma since the Angular 6 upgrade. Naming the old one made the
// runner fail to start, which is part of why nothing here had run in a long time.
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('../../app/frontend/node_modules/karma-jasmine'),
      require('../../app/frontend/node_modules/karma-chrome-launcher'),
      require('../../app/frontend/node_modules/karma-jasmine-html-reporter'),
      require('../../app/frontend/node_modules/karma-coverage-istanbul-reporter'),
      require('../../app/frontend/node_modules/@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false // leave the Jasmine spec runner output visible in a browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../../target/frontend-coverage'),
      reports: ['html', 'lcovonly'],
      fixWebpackSourcePaths: true
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    // Defaults suit CI; `ng test --watch` overrides them for local work.
    autoWatch: false,
    singleRun: true,
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      // The sandbox cannot be used in the container CI runs in.
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    }
  });
};
