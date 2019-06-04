/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export enum RegistryType {
    azure = 'azure',
    dockerHub = 'dockerHub',
    private = 'private'
}

export function isAncestoryOfRegistryType(expectedContextValue: string | RegExp, registryType: RegistryType): boolean {
    let v = expectedContextValue instanceof RegExp ? expectedContextValue.source.toString() : expectedContextValue;
    v = v.toLowerCase();
    if (v.includes(registryType.toLowerCase())) {
        return true;
    } else {
        // If no other registry types match, it must be a generic context value for all types
        return !Object.values(RegistryType).some((rt: RegistryType) => v.includes(rt.toLowerCase()));
    }
}
