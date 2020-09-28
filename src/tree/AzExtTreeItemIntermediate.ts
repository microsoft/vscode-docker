/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem } from 'vscode-azureextensionui';
import { IconPath } from './IconPath';

/**
 * The purpose of this class is to be an intermediate abstract class that redefines these properties from the parent as abstract.
 * This allows inheriting classes to implement them as either properties or accessors
 */
export abstract class AzExtTreeItemIntermediate extends AzExtTreeItem {
    public abstract readonly id?: string;
    public abstract readonly iconPath?: IconPath;
    public abstract readonly description?: string;
}
