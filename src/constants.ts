/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Lazy } from "./utils/lazy";

export const configPrefix: string = 'docker';

// Consider downloading multiple pages (images, tags, etc)
export const PAGE_SIZE = 100;

// Credentials Constants
export const NULL_GUID = '00000000-0000-0000-0000-000000000000'; // Empty GUID is a special username to indicate the login credential is based on JWT token.

// Repository + Tag format
export const imageTagRegExp = new RegExp('^[a-zA-Z0-9.-_/]{1,256}:(?![.-])[a-zA-Z0-9.-_]{1,128}$');

// GLOB Patterns
export const FROM_DIRECTIVE_PATTERN = /^\s*FROM\s*([\w-/:]*)(\s*AS\s*[a-z][a-z0-9-_\\.]*)?$/i;
export const COMPOSE_FILE_GLOB_PATTERN = '**/*[cC][oO][mM][pP][oO][sS][eE]*.{[yY][aA][mM][lL],[yY][mM][lL]}';
export const DOCKERFILE_GLOB_PATTERN = '**/{*.[dD][oO][cC][kK][eE][rR][fF][iI][lL][eE],[dD][oO][cC][kK][eE][rR][fF][iI][lL][eE],[dD][oO][cC][kK][eE][rR][fF][iI][lL][eE].*}';
export const YAML_GLOB_PATTERN = '**/*.{[yY][aA][mM][lL],[yY][mM][lL]}';
export const CSPROJ_GLOB_PATTERN = '**/*.{[cC][sS][pP][rR][oO][jJ]}';
export const FSPROJ_GLOB_PATTERN = '**/*.{[fF][sS][pP][rR][oO][jJ]}';

// File search max ammout
export const FILE_SEARCH_MAX_RESULT = 1000;

export const dockerHubUrl: string = 'https://hub.docker.com/';

export const extensionId: string = 'ms-azuretools.vscode-docker';

export const extensionVersion = new Lazy<string | undefined>(() => {
    const extension = vscode.extensions.getExtension(extensionId);
    return extension?.packageJSON?.version;
});

export type DockerOrchestration = 'single' | 'docker-compose';

export const builtInNetworks: string[] = ['bridge', 'host', 'none'];

export const dockerComposeHeader = `version: '3.4'

services:`;

export const ociClientId = 'tools/microsoft/vscode/docker';
