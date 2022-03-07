/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { Platform } from '../../utils/platform';

export type ScaffoldedFileType = '.dockerignore' | 'Dockerfile' | 'docker-compose.yml' | 'docker-compose.debug.yml' | 'requirements.txt';

export interface ScaffoldingWizardContext extends IActionContext {
    // These are set at the beginning
    scaffoldType: 'all' | 'compose' | 'debugging';

    // These come from user choice
    platform?: Platform;
    ports?: number[];
    debugPorts?: number[];
    scaffoldCompose?: boolean;
    workspaceFolder?: vscode.WorkspaceFolder;

    // A project file (.NET Core), entrypoint file (Python), or package.json (Node). For applicable platforms, guaranteed to be defined after the prompt phase.
    artifact?: string;

    // Additional info that depends on artifact and platform, guaranteed to be defined after the prompt phase.
    dockerBuildContext?: string;
    dockerfileDirectory?: string;

    // These are calculated depending on platform, with defaults
    version?: string;
    serviceName?: string;
    suggestedRandomPorts?: number[];

    // Other properties that get calculated or set later
    overwriteAll?: boolean;
}
