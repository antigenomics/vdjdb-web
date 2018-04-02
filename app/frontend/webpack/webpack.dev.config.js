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

const base = require('./webpack.base.config');
const path = require('path');
const webpack = require('webpack');
const { CheckerPlugin } = require('awesome-typescript-loader');
const TypeScriptConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const configuration = base.getBaseConfiguration();

configuration.entry = {
    'styles.js': [ './styles/main.less' ],
    'bundle.js': [ 'webpack-dev-server/client?http://localhost:8080', './src/main.dev.ts' ]
};

configuration.module.rules.push({
    test: /\.ts(x?)$/,
    exclude: [ /e2e/, /node_modules/ ],
    loaders: [ { loader: 'cache-loader', options: { cacheDirectory: path.resolve(__dirname, '../node_modules/.cache') } },
        'awesome-typescript-loader', 'angular-router-loader', 'angular2-template-loader' ]
});

configuration.resolve.plugins = [
    new TypeScriptConfigPathsPlugin({ configFile: path.resolve(__dirname, '../tsconfig.json') })
];

configuration.resolve.alias = {
    'external': path.resolve(__dirname, '../src/external'),
    'pages': path.resolve(__dirname, '../src/app/pages'),
    'utils': path.resolve(__dirname, '../src/app/utils'),
    'shared': path.resolve(__dirname, '../src/app/shared'),
    'environments': path.resolve(__dirname, '../src/app/environments')
}

const plugins = [
    new CheckerPlugin(),
    new webpack.DllReferencePlugin({ manifest: require(path.join(base.getBuildPath(), 'polyfills-manifest.json')), extensions: [ '.js' ] }),
    new webpack.DllReferencePlugin({ manifest: require(path.join(base.getBuildPath(), 'vendor-manifest.json')), extensions: [ '.js' ] }),
];

configuration.plugins.push(...plugins);

module.exports = configuration;
