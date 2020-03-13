/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function generateUniqueName(name: string, existingNames: string[], generateSuffix: (currentIndex: number) => string): string {
    let newName = name;
    let i = 1;
    while (existingNames.includes(newName)) {
        newName = `${name}${generateSuffix(i++)}`;
    }
    return newName;
}
