/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fse from 'fs-extra';
import * as path from 'path';

export function generateUniqueName(name: string, existingNames: string[], generateSuffix: (currentIndex: number) => string): string {
    let newName = name;
    let i = 1;
    while (existingNames.includes(newName)) {
        newName = `${name}${generateSuffix(i++)}`;
    }
    return newName;
}

export async function generateNonConflictFileName(filePath: string): Promise<string> {
    let newFilepath = filePath;
    let i = 1;
    const extName = path.extname(filePath);
    const extNameRegEx = new RegExp(`${extName}$`);

    while (await fse.pathExists(newFilepath)) {
        newFilepath = filePath.replace(extNameRegEx, i + extName);
        i++;
    }
    return newFilepath;
}
