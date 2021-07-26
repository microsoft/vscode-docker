/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

/* eslint-disable no-undef */ // Ignore the fact that the engine (which is VSCode) is unknown by the linter

// This is the extension entrypoint, which imports extension.bundle.js, the actual extension code.
//
// This is in a separate file so we can properly measure extension.bundle.js load time.

const perfStats = {
    loadStartTime: Date.now(),
    loadEndTime: undefined
};

Object.defineProperty(exports, "__esModule", { value: true });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const extension = require("./dist/extension.bundle");

async function activate(ctx) {
    return await extension.activateInternal(ctx, perfStats);
}

async function deactivate(ctx) {
    return await extension.deactivateInternal(ctx);
}

exports.activate = activate;
exports.deactivate = deactivate;

perfStats.loadEndTime = Date.now();

/* eslint-enable no-undef */
