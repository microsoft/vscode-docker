/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem } from 'vscode-azureextensionui';
import { IconPath } from './IconPath';

export abstract class AzExtTreeItemIntermediate extends AzExtTreeItem {
    public abstract readonly id?: string;
    public abstract readonly iconPath?: IconPath;
    public abstract readonly description?: string;
}
