/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { CommonTag } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getFullImageNameFromRegistryTagItem } from '../../tree/registries/registryTreeUtils';
import { registryExperience } from '../../utils/registryExperience';

export async function copyRemoteFullTag(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<string> {
    if (!node) {
        node = await registryExperience(context, ext.registriesTree, {
            contextValueFilter: { include: 'commontag' },
        }) as UnifiedRegistryItem<CommonTag>;
    }
    const fullTag = getFullImageNameFromRegistryTagItem(node.wrappedItem);
    void vscode.env.clipboard.writeText(fullTag);
    return fullTag;
}
