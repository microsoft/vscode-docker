// This is a stub to provide only the part of node_modules/vscode-languageserver/lib/files.js that is used by dockerfile-language-server-node

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
/**
 * @deprecated Use the `vscode-uri` npm module which provides a more
 * complete implementation of handling VS Code URIs.
 */
function uriToFilePath(uri) {
    let parsed = url.parse(uri);
    if (parsed.protocol !== 'file:' || !parsed.path) {
        return undefined;
    }
    let segments = parsed.path.split('/');
    for (var i = 0, len = segments.length; i < len; i++) {
        segments[i] = decodeURIComponent(segments[i]);
    }
    if (process.platform === 'win32' && segments.length > 1) {
        let first = segments[0];
        let second = segments[1];
        // Do we have a drive letter and we started with a / which is the
        // case if the first segement is empty (see split above)
        if (first.length === 0 && second.length > 1 && second[1] === ':') {
            // Remove first slash
            segments.shift();
        }
    }
    return path.normalize(segments.join('/'));
}
exports.uriToFilePath = uriToFilePath;


function resolveModule(workspaceRoot, moduleName) {
    throw new Error('Not implemented');
}
exports.resolveModule = resolveModule;
function resolve(moduleName, nodePath, cwd, tracer) {
    throw new Error('Not implemented');
}
exports.resolve = resolve;
function resolveGlobalNodePath(tracer) {
    throw new Error('Not implemented');
}
exports.resolveGlobalNodePath = resolveGlobalNodePath;
function resolveGlobalYarnPath(tracer) {
    throw new Error('Not implemented');
}
exports.resolveGlobalYarnPath = resolveGlobalYarnPath;
function resolveModulePath(workspaceRoot, moduleName, nodePath, tracer) {
    throw new Error('Not implemented');
}
exports.resolveModulePath = resolveModulePath;
function resolveModule2(workspaceRoot, moduleName, nodePath, tracer) {
    throw new Error('Not implemented');
}
exports.resolveModule2 = resolveModule2;
