/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as semver from 'semver';
import * as vscode from 'vscode';

// 1.23.9 contains the fix to not overwrite existing assets
export const minCSharpVersionString = '1.23.9';
export const cSharpExtensionId = 'ms-dotnettools.csharp';

export interface CSharpExtensionExports {
    // This is a subset of the C# extension's exports but contains all we care about
    initializationFinished(): Promise<void>;
}

export async function getMinimumCSharpExtensionExports(): Promise<CSharpExtensionExports> {
    const cSharpExtension: vscode.Extension<CSharpExtensionExports> | undefined = vscode.extensions.getExtension(cSharpExtensionId);
    const cSharpExtensionVersion: semver.SemVer | undefined = cSharpExtension ? new semver.SemVer((<{ version: string }>cSharpExtension.packageJSON).version) : undefined;

    if (!cSharpExtension || !cSharpExtensionVersion) {
        throw new Error(vscode.l10n.t('Cannot generate Dockerfiles for a .NET project unless the C# extension is installed.'));
    } else if (semver.lt(cSharpExtensionVersion, minCSharpVersionString)) {
        throw new Error(vscode.l10n.t('Cannot generate Dockerfiles for a .NET project unless version {0} or higher of the C# extension is installed.', minCSharpVersionString));
    }

    return await cSharpExtension.activate();
}
