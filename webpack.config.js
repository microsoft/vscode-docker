/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// See https://github.com/Microsoft/vscode-azuretools/wiki/webpack for guidance

'use strict';

/* eslint-disable @typescript-eslint/no-var-requires */
const process = require('process');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const dev = require('vscode-azureextensiondev');
/* eslint-enable @typescript-eslint/no-var-requires */

let DEBUG_WEBPACK = !!process.env.DEBUG_WEBPACK;

let config = dev.getDefaultWebpackConfig({
    projectRoot: __dirname,
    verbosity: DEBUG_WEBPACK ? 'debug' : 'normal',

    externalNodeModules: [
        // Modules that we can't easily webpack for some reason.
        // These and their dependencies will be copied into node_modules rather than placed in the bundle
        // Keep this list small, because all the subdependencies will also be excluded
    ],
    entries: {
        // Note: Each entry is a completely separate Node.js application that cannot interact with any
        // of the others, and that individually includes all dependencies necessary (i.e. common
        // dependencies will have a copy in each entry file, no sharing).

        // Separate module for the language server (doesn't share any code with extension.js)
        './dockerfile-language-server-nodejs/lib/server': './node_modules/dockerfile-language-server-nodejs/lib/server.js'
    },

    loaderRules: [

        {
            // Unpack UMD module headers used in some modules since webpack doesn't
            // handle them.
            test: /dockerfile-language-service|vscode-languageserver-types/,
            use: { loader: 'umd-compat-loader' }
        }

    ], // end of loaderRules

    plugins: [
        // Replace vscode-languageserver/lib/files.js with a modified version that doesn't have webpack issues
        new webpack.NormalModuleReplacementPlugin(
            /[/\\]vscode-languageserver[/\\]lib[/\\]files\.js/,
            require.resolve('./resources/vscode-languageserver-files-stub.js')
        ),

        // Copy files to dist folder where the runtime can find them
        new CopyWebpackPlugin({
            patterns: [
                // node_modules/vscode-codicons/dist/codicon.css, .ttf -> dist/node_modules/vscode-codicons/dist/codicon.css, .ttf
                { from: './node_modules/vscode-codicons/dist/codicon.css', to: 'node_modules/vscode-codicons/dist' },
                { from: './node_modules/vscode-codicons/dist/codicon.ttf', to: 'node_modules/vscode-codicons/dist' },
            ]
        }),
    ]
});

if (DEBUG_WEBPACK) {
    console.log('Config:', config);
}

module.exports = config;
