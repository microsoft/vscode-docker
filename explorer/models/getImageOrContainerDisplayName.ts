/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { extractRegExGroups } from '../../helpers/extractRegExGroups';
import { trimWithElipsis } from '../utils/utils';

export function getImageOrContainerDisplayName(fullName: string, truncateLongRegistryPaths: boolean, truncateMaxLength: number): string {
    if (!truncateLongRegistryPaths) {
        return fullName;
    }

    // Extra registry from the rest of the name
    let [registry, restOfName] = extractRegExGroups(fullName, /^([^\/]+)\/(.*)$/, ['', fullName]);
    let trimmedRegistry: string | undefined;

    if (registry) {
        registry = trimWithElipsis(registry, truncateMaxLength);
        return `${registry}/${restOfName}`;
    }

    return fullName;
}
