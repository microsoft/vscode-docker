/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { MessageItem } from "vscode";
import { IActionContext, parseError } from "vscode-azureextensionui";
import { isLinux } from "../../src/utils/osVersion";
import { wrapError } from "../../src/utils/wrapError";
import { openExternal } from './openExternal';

const connectionMessage = 'Unable to connect to Docker. Please make sure you have installed Docker and that it is running.';

export namespace internal {
    // Exported for tests
    export const installDockerUrl = 'https://aka.ms/AA37qtj';
    export const linuxPostInstallUrl = 'https://aka.ms/AA37yk6';
    export const troubleshootingUrl = 'https://aka.ms/AA37qt2';
}

// tslint:disable-next-line:no-any
export function showDockerConnectionError(context: IActionContext, error: any): Error {
    let message = connectionMessage;
    let items: (MessageItem & { url: string })[] = [];

    items.push({ title: 'Install Docker', url: internal.installDockerUrl });
    if (isLinux()) {
        message = `${message} Also make sure you've followed the Linux post-install instructions "Manage Docker as a non-root user".`;
        items.push({ title: 'Linux Post-Install Instructions', url: internal.linuxPostInstallUrl });
    }
    items.push({ title: 'Additional Troubleshooting', url: internal.troubleshootingUrl });

    let wrappedError = wrapError(error, message);

    // Don't wait
    context.errorHandling.suppressDisplay = true;
    vscode.window.showErrorMessage(parseError(wrappedError).message, ...items).then(response => {
        if (response) {
            // tslint:disable-next-line:no-floating-promises
            openExternal(response.url);
        }
    });

    return wrappedError;
}

// tslint:disable-next-line:no-any no-unsafe-any
export function throwDockerConnectionError(context: IActionContext, error: any): never {
    throw showDockerConnectionError(context, error);
}
