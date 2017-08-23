const webpack = require('webpack');
const path = require('path');
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

/**
 * Base configuration object for Webpack
 */
module.exports = {
    devtool: '#inline-source-map',
    entry: {
        'bundle.min.css': [
            './styles/global.css',
            './styles/bootstrap/css/bootstrap.min.css',
            './styles/bootstrap/css/theme.min.css',
            './styles/font-awesome/css/font-awesome.min.css'
        ]
    },
    output: {
        path: buildPath,
        filename: '[name]',
        sourceMapFilename: 'bundle.map',
        publicPath: 'bundles/'
    },
    externals: {},
    module: {
        rules: [
            {
                test: /\.component\.css$/,
                exclude: /node_modules/,
                loaders: [ 'raw-loader' ]
            },
            {
                test: /\.css$/,
                exclude: /\.component\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader"
                })
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader',
                options: {
                    name: 'fonts/[name].[ext]',
                    publicPath: 'http://localhost:9000/assets/bundles/'
                }
            },
            {
                test: /\.html$/,
                exclude: /node_modules/,
                loaders: [ 'raw-loader' ]
            }
        ]
    },
    resolve: {
        extensions: [ '.ts', '.tsx', '.js', '.json', '.css', '.html' ]
    },
    plugins: [
        new ExtractTextPlugin('bundle.min.css'),
        new webpack.ContextReplacementPlugin(
            /angular(\\|\/)core(\\|\/)@angular/,
            path.resolve(__dirname, './app')
        ),
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        })
    ]
};