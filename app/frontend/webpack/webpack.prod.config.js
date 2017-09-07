console.log('Configuring frontend in production mode');

const path = require('path');
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const webpackMerge = require('webpack-merge'); // used to merge webpack configs
const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const AotPlugin = require('@ngtools/webpack').AotPlugin;
const DllBundlesPlugin = require('webpack-dll-bundles-plugin').DllBundlesPlugin;

const defaultConfiguration = require('./webpack.base.config');

defaultConfiguration.entry[ 'bundle.min.js' ] = [
    './app/main.ts'
];

defaultConfiguration.devtool = false;
defaultConfiguration.module.rules.push({
    test: /\.ts(x?)$/,
    exclude: /node_modules/,
    loaders: [ '@ngtools/webpack' ]
});

defaultConfiguration.plugins.push(
    new AotPlugin({
        tsConfigPath: './tsconfig.prod.json',
        entryModule: path.resolve(__dirname, '../app/app.module#AppModule')
    }),
    new webpack.DefinePlugin({
        buildMode: JSON.stringify('production')
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    new UglifyJSPlugin({
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
    }));

module.exports = defaultConfiguration;

