/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { Platform, PlatformOS } from '../../utils/platform';

export type ScaffoldedFileType = '.dockerignore' | 'Dockerfile' | 'docker-compose.yml' | 'docker-compose.debug.yml';

export interface ScaffoldingWizardContext extends IActionContext {
    // These come from user choice
    platform?: Platform;
    platformOS?: PlatformOS;
    ports?: number[];
    scaffoldCompose?: boolean;
    workspaceFolder?: vscode.WorkspaceFolder;

    // A project file (.NET Core), entrypoint file (Python), or package.json (Node). For applicable platforms, guaranteed to be defined after the prompt phase.
    artifact?: string;

    // Other properties that get calculated or set later
    overwriteAll?: boolean;
}
