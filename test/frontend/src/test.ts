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

// This file is required by karma.conf.js and loads recursively all the .spec and framework files

// Resolved by explicit path, like the Angular imports below: this file lives outside
// app/frontend/, so webpack has no node_modules to resolve a bare specifier against.
import '../../../app/frontend/node_modules/zone.js/dist/long-stack-trace-zone';
import '../../../app/frontend/node_modules/zone.js/dist/proxy.js';
import '../../../app/frontend/node_modules/zone.js/dist/sync-test';
import '../../../app/frontend/node_modules/zone.js/dist/jasmine-patch';
import '../../../app/frontend/node_modules/zone.js/dist/async-test';
import '../../../app/frontend/node_modules/zone.js/dist/fake-async-test';
import { getTestBed } from '../../../app/frontend/node_modules/@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '../../../app/frontend/node_modules/@angular/platform-browser-dynamic/testing';

// Unfortunately there's no typing for the `__karma__` variable. Just declare it as any.
declare const __karma__: any;
declare const require: any;

// Prevent Karma from running prematurely.
__karma__.loaded = function () {};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
// Then we find all the tests. Specs live beside the code they cover, under the application
// source - this used to scan './', the directory this file sits in, which holds no specs at all
// and so reported success without running anything.
const context = require.context('../../../app/frontend/src/app', true, /\.spec\.ts$/);
// And load the modules.
context.keys().map(context);
// Finally, start Karma to run the tests.
__karma__.start();
