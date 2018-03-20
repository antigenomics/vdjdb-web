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
const webpack = require('webpack');
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const defaultConfiguration = Object.create(require('./webpack.base.config'));
const { TsConfigPathsPlugin, CheckerPlugin } = require('awesome-typescript-loader');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');


defaultConfiguration.entry[ 'bundle.js' ] = [
    'webpack-dev-server/client?http://localhost:8080',
    './src/main.dev.ts'
];

defaultConfiguration.module.rules.push({
    test: /\.ts(x?)$/,
    exclude: [ /e2e/, /node_modules/ ],
    loaders: [ 'awesome-typescript-loader', 'angular-router-loader', 'angular2-template-loader' ]
});

defaultConfiguration.resolve.plugins = [
    new TsConfigPathsPlugin()
];

defaultConfiguration.resolve.alias = {
    'external': path.resolve(__dirname, '../src/external'),
    'pages': path.resolve(__dirname, '../src/app/pages'),
    'utils': path.resolve(__dirname, '../src/app/utils'),
    'shared': path.resolve(__dirname, '../src/app/shared'),
    'environments': path.resolve(__dirname, '../src/app/environments')
};

defaultConfiguration.plugins.push(new CheckerPlugin());
defaultConfiguration.plugins.push(new HardSourceWebpackPlugin());
defaultConfiguration.plugins.push(new webpack.DllReferencePlugin({ manifest: require(path.join(buildPath, 'polyfills-manifest.json')) }));
defaultConfiguration.plugins.push(new webpack.DllReferencePlugin({ manifest: require(path.join(buildPath, 'vendor-manifest.json')) }));

module.exports = defaultConfiguration;