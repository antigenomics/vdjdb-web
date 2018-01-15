const webpack = require('webpack');
const path = require('path');
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

// noinspection JSUnresolvedFunction
/**
 * Base configuration object for Webpack
 */
module.exports = {
    devtool: '#inline-source-map',
    entry: {
        'bundle.css': [
            './styles/main.less'
        ]
    },
    output: {
        path: buildPath,
        filename: '[name]',
        chunkFilename: '[name]-chunk.js',
        sourceMapFilename: 'bundle.map',
        publicPath: 'develop/webpack/bundles/'
    },
    externals: {},
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
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: [ "css-loader", "less-loader" ]
                })
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
        new ExtractTextPlugin('bundle.css'),
        new webpack.ContextReplacementPlugin(
            /angular([\\\/])core([\\\/])@angular/,
            path.resolve(__dirname, './app')
        ),
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        })
    ]
};