/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionKind, env, extensions } from 'vscode';
import { extensionId } from '../constants';

export enum DockerExtensionKind {
    /**
     * Extension running in a remote environment
     */
    workspace = 'workspace',

    /**
     * Extension running in local environment, but remote enironment does exist
     */
    ui = 'ui',

    /**
     * No remote environment
     */
    local = 'local'
}

export enum RemoteKind {
    ssh = 'ssh',
    wsl = 'wsl',
    devContainer = 'devContainer',
    unknown = 'unknown'
}

export interface IVSCodeRemoteInfo {
    extensionKind: DockerExtensionKind;
    remoteKind: RemoteKind | undefined;
}

export function getVSCodeRemoteInfo(context?: IActionContext): IVSCodeRemoteInfo {
    let extensionKind: DockerExtensionKind;
    let remoteKind: RemoteKind | undefined;

    const remoteName: string | undefined = env.remoteName;
    const extension = extensions.getExtension(extensionId);
    if (remoteName && extension) {
        switch (remoteName.toLowerCase()) {
            case 'ssh-remote':
                remoteKind = RemoteKind.ssh;
                break;
            case 'wsl':
                remoteKind = RemoteKind.wsl;
                break;
            case 'attached-container':
            case 'dev-container':
                // We don't actually care about the difference between the above two types
                remoteKind = RemoteKind.devContainer;
                break;
            default:
                remoteKind = RemoteKind.unknown;
        }

        if (extension.extensionKind === ExtensionKind.UI) {
            extensionKind = DockerExtensionKind.ui;
        } else {
            extensionKind = DockerExtensionKind.workspace;
        }
    } else {
        extensionKind = DockerExtensionKind.local;
    }

    if (context) {
        context.telemetry.properties.extensionKind = extensionKind;
        context.telemetry.properties.remoteKind = remoteKind;
        context.telemetry.properties.rawRemoteKind = remoteName;
    }

    return {
        extensionKind,
        remoteKind
    };
}
