/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Checks if the launch task is using the .NET SDK Container build
 * @param preLaunchTask
 * @returns true if the launch task is using the .NET SDK Container build
 *          false otherwise
 */
export function isDotNetSdkBuild(platformConfiguration: unknown): boolean {
    if (
        typeof platformConfiguration === 'object' &&
        platformConfiguration &&
        'netCore' in platformConfiguration &&
        (platformConfiguration as { netCore: { buildWithSdk: boolean } }).netCore.buildWithSdk
    ) {
        return true;
    } else if (
        typeof platformConfiguration === 'object' &&
        platformConfiguration &&
        'type' in platformConfiguration &&
        (platformConfiguration as { type: string }).type === 'dotnet-container-sdk'
    ) {
        return true;
    } else {
        return false;
    }
}
