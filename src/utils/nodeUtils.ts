/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';

export interface NodePackage {
    main?: string;
    name?: string;
    scripts?: { [key: string]: string };
}

export async function readPackage(packagePath: string): Promise<NodePackage> {
    return <NodePackage> await fse.readJson(packagePath);
}

export async function inferPackageName(nodePackage: NodePackage | undefined, packagePath: string): Promise<string> {
    if (nodePackage && nodePackage.name !== undefined) {
        return nodePackage.name;
    } else {
        return path.basename(path.dirname(packagePath));
    }
}
