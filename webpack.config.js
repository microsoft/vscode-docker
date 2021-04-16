/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// @ts-check // Check this file for typing issues (helps prevent mistakes in options passed)
/* eslint-disable no-undef */ // Ignore the fact that the engine (which is webpack) is unknown

'use strict';

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
/* eslint-enable @typescript-eslint/no-var-requires */

const debugWebpack = !!process.env.DEBUG_WEBPACK;

/** @type {import('webpack').Configuration}*/ // Here's where we can get typing help even though it's JS
const config = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
    cache: true, // Makes 'watch' builds way faster after the first full build

    entry: {
        './extension.bundle': './src/extension.ts',
        './dockerfile-language-server-nodejs/lib/server': './node_modules/dockerfile-language-server-nodejs/lib/server.js',
    }, // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    devtool: 'nosources-source-map',
    externals: {
        vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                // Default TypeScript loader for .ts files
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            },
            {
                // Unpack UMD module headers used in some modules since webpack doesn't handle them.
                test: /dockerfile-language-service|vscode-languageserver-types/,
                use: { loader: 'umd-compat-loader' }
            }
        ]
    },
    plugins: [
        // Copy some needed resource files from external sources
        // @ts-expect-error: Class incompatibility with CopyPlugin
        new CopyPlugin({
            patterns: [
                './node_modules/vscode-azureextensionui/resources/**/*.svg',
                './node_modules/vscode-codicons/dist/codicon.{css,ttf}',
                './node_modules/open/xdg-open*',
            ],
        }),
    ],
    optimization: {
        minimizer: [
            // @ts-expect-error: Class incompatibility with TerserPlugin
            new TerserPlugin({
                terserOptions: {
                    /* eslint-disable @typescript-eslint/naming-convention */
                    // Keep class and function names so that stacks aren't useless and things like UserCancelledError work
                    keep_classnames: true,
                    keep_fnames: true,
                    /* eslint-enable @typescript-eslint/naming-convention */
                }
            }),
        ]
    },
    ignoreWarnings: [
        // Suppress some webpack warnings caused by dependencies
        {
            // Ignore some warnings from handlebars in code that doesn't get used anyway
            module: /node_modules\/handlebars\/lib\/index\.js/,
            message: /require\.extensions/,
        },
        {
            // Ignore a warning from applicationinsights
            module: /node_modules\/applicationinsights/,
            message: /Can't resolve 'applicationinsights-native-metrics'/
        },
        {
            // Ignore a warning from diagnostic-channel-publishers
            module: /node_modules\/diagnostic-channel-publishers/,
            message: /Can't resolve '@opentelemetry\/tracing'/
        },
        (warning) => false, // No other warnings should be ignored
    ]
};

if (debugWebpack) {
    // @ts-expect-error: Class incompatibility with BundleAnalyzerPlugin
    config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'static' }));
    console.log('Config:', config);
}

module.exports = config;

/* eslint-enable no-undef */
