/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, contextValueExperience } from '@microsoft/vscode-azext-utils';
import { CommonTag } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getFullImageNameFromTag } from '../../tree/registries/registryTreeUtils';

export async function copyRemoteFullTag(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<string> {
    if (!node) {
        node = await contextValueExperience(context, ext.registriesTree, { include: ['registryV2Tag', 'dockerHubTag'] });
    }
    const fullTag = getFullImageNameFromTag(node.wrappedItem);
    void vscode.env.clipboard.writeText(fullTag);
    return fullTag;
}
