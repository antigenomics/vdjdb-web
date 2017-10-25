console.log('Running webpack in production mode');

const path = require('path');
const glob = require('glob-all');
const webpack = require('webpack');
const TSLintPlugin = require('tslint-webpack-plugin');
const PurifyCSSPlugin = require('purifycss-webpack');

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
        exclude: [ './app/main.prod.ts', './app/build/**/*.ts' ],
        fix: false,
        project: path.resolve(__dirname, '../tsconfig.ngfactory.json'),
        typeCheck: true
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    new PurifyCSSPlugin({
        paths: glob.sync([
            path.join(__dirname, '../views/**/*.html'),
            path.join(__dirname, '../app/**/*.html'),
            path.join(__dirname, '../lib/aot/build/**/*.js')
        ]),
        purifyOptions: {
            info: true,
            minify: true,
            output: path.join(__dirname, '../../../public/bundles/bundle.min.css')
        }
    })
);



module.exports = defaultConfiguration;

