/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IDockerExtensionPackageJson {
    name: string;
    version: string;
    publisher: string;
}

let packageJson: IDockerExtensionPackageJson;
export function getDockerExtensionPackageJson(): IDockerExtensionPackageJson {
    if (!packageJson) {
        // Don't remove the following constant, or webpack will complain about nonexistent package.
        const packageJsonPath = '../../../package.json';
        packageJson = require(packageJsonPath) as IDockerExtensionPackageJson;
    }

    return packageJson;
}
