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

const webpack = require('webpack');
const path = require('path');
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const { CheckerPlugin } = require('awesome-typescript-loader');
const TypeScriptConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    mode: 'development',
    devtool: false,
    entry: {
        'styles': [ 'webpack-dev-server/client?http://localhost:8080', './styles/main.less' ],
        'bundle.js': [ 'webpack-dev-server/client?http://localhost:8080', './src/main.dev.ts' ]
    },
    output: {
        path: buildPath,
        filename: '[name]',
        chunkFilename: '[name]-chunk.js',
        sourceMapFilename: 'bundle.map',
        publicPath: 'develop/webpack/bundles/'
    },
    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                exclude: [ /e2e/, /node_modules/ ],
                loaders: [ { loader: 'cache-loader', options: { cacheDirectory: path.resolve(__dirname, '../node_modules/.cache') } },
                    'awesome-typescript-loader', 'angular-router-loader', 'angular2-template-loader' ]
            },
            {
                test: /\.(component|styles)\.css$/,
                exclude: /node_modules/,
                loaders: [ 'raw-loader' ]
            },
            {
                test: /\.less$/,
                exclude: /\.component\.css$/,
                use: [
                    { loader: MiniCssExtractPlugin.loader },
                    { loader: "css-loader", options: { minimize: true } },
                    { loader: "less-loader" } ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader',
                options: {
                    name: 'fonts/[name].[ext]',
                    publicPath: '/assets/bundles/'
                }
            },
            {
                test: /\.html$/,
                exclude: /node_modules/,
                loaders: [ 'raw-loader' ]
            },
            {
                test: /\.(png|gif)$/,
                loader: 'url-loader?limit=1024&name=images/[name].[ext]!image-webpack-loader'
            },
            {
                test: /\.jpg$/,
                loader: 'file-loader',
                options: {
                    name: 'images/[name].[ext]'
                }
            }
        ]
    },
    resolve: {
        extensions: [ '.ts', '.tsx', '.js', '.json', '.css', '.less', '.html' ],
        plugins: [
            new TypeScriptConfigPathsPlugin({ configFile: path.resolve(__dirname, '../tsconfig.json') }),
        ],
        alias: {
            'external': path.resolve(__dirname, '../src/external'),
            'pages': path.resolve(__dirname, '../src/app/pages'),
            'utils': path.resolve(__dirname, '../src/app/utils'),
            'shared': path.resolve(__dirname, '../src/app/shared'),
            'environments': path.resolve(__dirname, '../src/app/environments')
        }
    },
    plugins: [
        new MiniCssExtractPlugin({ filename: 'styles.css' }),
        new CheckerPlugin(),
        new webpack.DllReferencePlugin({ manifest: require(path.join(buildPath, 'polyfills-manifest.json')) }),
        new webpack.DllReferencePlugin({ manifest: require(path.join(buildPath, 'vendor-manifest.json')) }),
        new webpack.ContextReplacementPlugin(/angular([\\\/])core([\\\/])@angular/, path.resolve(__dirname, './src')),
        new webpack.ProvidePlugin({ 'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch' })
    ]
};