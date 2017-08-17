console.log('Configuring frontend in development mode');

const webpack = require('webpack');
const defaultConfiguration = Object.create(require('./webpack.base.config'));

defaultConfiguration.entry['bundle.min.js'] = [
    'webpack/hot/dev-server',
    'webpack-dev-server/client?http://localhost:8080',
    './app/main.ts'
];

defaultConfiguration.module.rules.push({
    test: /\.ts(x?)$/,
    exclude: /node_modules/,
    loaders: [ 'awesome-typescript-loader', 'angular2-template-loader' ]
});

defaultConfiguration.plugins.push(
    new webpack.DefinePlugin({
        buildMode: JSON.stringify('development')
    }),
    new webpack.HotModuleReplacementPlugin());

module.exports = defaultConfiguration;