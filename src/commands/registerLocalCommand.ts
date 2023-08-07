/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { l10n } from 'vscode';
import { DockerExtensionKind, getVSCodeRemoteInfo } from '../utils/getVSCodeRemoteInfo';
import { registerCommand } from './registerCommands';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerLocalCommand(commandId: string, callback: (context: IActionContext, ...args: any[]) => any, debounce?: number): void {
    registerCommand(
        commandId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (context, ...args: any[]) => {
            await verifyIsRunningLocally(context);
            return callback(context, ...args);
        },
        debounce
    );
}

async function verifyIsRunningLocally(context: IActionContext): Promise<void> {
    const remoteInfo = getVSCodeRemoteInfo(context);

    if (remoteInfo.extensionKind !== DockerExtensionKind.local) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(l10n.t('This command cannot be used in a remote session.'));
    }
}
