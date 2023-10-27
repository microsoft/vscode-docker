/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { CommonRegistry } from '@microsoft/vscode-docker-registries';
import { ImageTreeItem } from '../../../tree/images/ImageTreeItem';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';

export interface PushImageWizardContext extends IActionContext {
    connectedRegistry?: UnifiedRegistryItem<CommonRegistry>;
    finalTag?: string;

    initialTag: string;
    node: ImageTreeItem;
}
