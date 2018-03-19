/*
 *        Copyright 2017 Bagaev Dmitry
 *
 *        Licensed under the Apache License, Version 2.0 (the "License");
 *        you may not use this file except in compliance with the License.
 *        You may obtain a copy of the License at
 *
 *            http://www.apache.org/licenses/LICENSE-2.0
 *
 *        Unless required by applicable law or agreed to in writing, software
 *        distributed under the License is distributed on an "AS IS" BASIS,
 *        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *        See the License for the specific language governing permissions and
 *        limitations under the License.
 *
 */

console.log('Running webpack in production mode');

const path = require('path');
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const glob = require('glob-all');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const PurifyCSSPlugin = require('purifycss-webpack');

module.exports = {
    mode: 'production',
    optimization: { minimize: true },
    devtool: false,
    stats: 'errors-only',
    entry: {
        'styles': [ './styles/main.less' ],
        'polyfills-ie.bundle.js': [ './src/polyfills-ie.js' ]
    },
    output: {
        path: buildPath,
        filename: '[name]',
        chunkFilename: '[name]-chunk.js',
    },
    module: {
        rules: [
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
        extensions: [ '.js', '.css', '.less' ]
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(),
        new MiniCssExtractPlugin({ filename: 'styles.css' }),
        new PurifyCSSPlugin({
            paths: glob.sync([
                path.join(__dirname, '../views/**/*.html'),
                path.join(__dirname, '../src/app/**/*.html')
            ]),
            purifyOptions: {
                info: true,
                minify: true,
                output: path.join(__dirname, '../../../public/bundles/bundle.min.css'),
                whitelist: [
                    'success', 'warning', 'error', 'info',
                    'circle', 'icon', 'violet', 'circular', 'circle',
                    'text', 'alignment', 'big', 'hover-inside-icon', 'overview', 'pre', 'code' ]
            }
        })
    ]
};

