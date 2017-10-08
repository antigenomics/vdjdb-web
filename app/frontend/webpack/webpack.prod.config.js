console.log('Configuring webpack in production mode');

const path = require('path');
const webpack = require('webpack');
const TSLintPlugin = require('tslint-webpack-plugin');

const defaultConfiguration = require('./webpack.base.config');

defaultConfiguration.entry[ 'vendor.min.js' ] = [
    './node_modules/zone.js/dist/zone.min.js'
];
defaultConfiguration.stats = 'errors-only';
defaultConfiguration.devtool = false;

defaultConfiguration.plugins.push(
    new TSLintPlugin({
        config: path.resolve(__dirname, '../tslint.json'),
        files: [ './app/**/*.ts' ],
        exclude: [ './app/main.prod.ts' ],
        fix: false,
        project: path.resolve(__dirname, '../tsconfig.ngfactory.json'),
        typeCheck: true
    }),
    new webpack.NoEmitOnErrorsPlugin()
);



module.exports = defaultConfiguration;

