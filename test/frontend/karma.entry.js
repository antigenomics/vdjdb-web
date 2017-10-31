require('../../app/frontend/node_modules/reflect-metadata');
require('../../app/frontend/node_modules/core-js');
require('../../app/frontend/node_modules/zone.js/dist/zone');
require('../../app/frontend/node_modules/zone.js/dist/long-stack-trace-zone');
require('../../app/frontend/node_modules/zone.js/dist/async-test');
require('../../app/frontend/node_modules/zone.js/dist/fake-async-test');
require('../../app/frontend/node_modules/zone.js/dist/sync-test');
require('../../app/frontend/node_modules/zone.js/dist/proxy');
require('../../app/frontend/node_modules/zone.js/dist/jasmine-patch');

const browserTesting = require('../../app/frontend/node_modules/@angular/platform-browser-dynamic/testing');
const coreTesting = require('../../app/frontend/node_modules/@angular/core/testing');
const context = require.context('./app/', true, /\.spec\.ts$/);

Error.stackTraceLimit = Infinity;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000;

coreTesting.TestBed.resetTestEnvironment();
coreTesting.TestBed.initTestEnvironment(
    browserTesting.BrowserDynamicTestingModule,
    browserTesting.platformBrowserDynamicTesting()
);

context.keys().forEach(context);