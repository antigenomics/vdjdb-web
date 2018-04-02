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

const path = require('path');
const webpack = require('webpack');
const { CheckerPlugin } = require('awesome-typescript-loader');
const TypeScriptConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const base = {
    mode: 'development',
    devtool: false,
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
                test: /\.(component|styles)\.css$/,
                exclude: /node_modules/,
                loaders: [ 'raw-loader' ]
            },
            {
                test: /\.less$/,
                exclude: /\.component\.css$/,
                use: [ MiniCssExtractPlugin.loader, { loader: "css-loader", options: { minimize: true } }, { loader: "less-loader" } ]
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
        extensions: [ '.ts', '.tsx', '.js', '.json', '.css', '.less', '.html' ]
    },
    plugins: [
        new MiniCssExtractPlugin({ filename: 'bundle.css' }),
        new webpack.ContextReplacementPlugin(/angular([\\\/])core([\\\/])@angular/, path.resolve(__dirname, './src')),
        new webpack.ProvidePlugin({ 'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch' })
    ]
};

module.exports.base = base;
module.exports.buildPath = buildPath;
module.exports.getBaseConfiguration = () => base;
module.exports.getBuildPath = () => buildPath;