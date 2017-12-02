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

console.log('Configuring frontend in development mode');

const path = require('path');
const webpackMerge = require('webpack-merge'); // used to merge webpack configs
const defaultConfiguration = Object.create(require('./webpack.base.config'));
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const DllBundlesPlugin = require('webpack-dll-bundles-plugin').DllBundlesPlugin;
const { CheckerPlugin } = require('awesome-typescript-loader');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

defaultConfiguration.entry[ 'bundle.js' ] = [
    'webpack-dev-server/client?http://localhost:8080',
    './src/main.dev.ts'
];

defaultConfiguration.module.rules.push({
    test: /\.ts(x?)$/,
    exclude: [ /e2e/,  /node_modules/ ],
    loaders: [ 'awesome-typescript-loader', 'angular2-template-loader' ]
});

defaultConfiguration.plugins.push(new CheckerPlugin());
defaultConfiguration.plugins.push(new HardSourceWebpackPlugin());
defaultConfiguration.plugins.push(new DllBundlesPlugin({
    bundles: {
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
            'rxjs'
        ]
    },
    dllDir: './webpack/dll/',
    webpackConfig: webpackMerge(defaultConfiguration, {
        devtool: false,
        plugins: [ new UglifyJSPlugin({
            parallel: true,
            uglifyOptions: {
                ie8: false,
                warnings: true,
                ecma: 5,
                compress: {
                    sequences: true,  // join consecutive statemets with the “comma operator”
                    properties: true,  // optimize property access: a["foo"] → a.foo
                    dead_code: true,  // discard unreachable code
                    drop_debugger: true,  // discard “debugger” statements
                    unsafe: false, // some unsafe optimizations (see below)
                    conditionals: true,  // optimize if-s and conditional expressions
                    comparisons: true,  // optimize comparisons
                    evaluate: true,  // evaluate constant expressions
                    booleans: true,  // optimize boolean expressions
                    loops: true,  // optimize loops
                    unused: true,  // drop unused variables/functions
                    hoist_funs: true,  // hoist function declarations
                    hoist_vars: false, // hoist variable declarations
                    if_return: true,  // optimize if-s followed by return/continue
                    join_vars: true,  // join var declarations
                    cascade: true,  // try to cascade `right` into `left` in sequences
                    side_effects: true,  // drop side-effect-free statements
                    warnings: true,   // warn about potentially dangerous optimizations/code,
                    inline: true,
                    reduce_vars: true,
                    passes: 10
                },
                mangle: {
                    keep_fnames: true
                }
            }
        }) ]
    })
}));

module.exports = defaultConfiguration;