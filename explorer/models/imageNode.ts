/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as moment from 'moment';
import * as path from 'path';
import * as vscode from 'vscode';
import { imagesPath } from '../../constants';
import { trimWithElipsis } from '../utils/utils';
import { getImageOrContainerDisplayName } from './getImageOrContainerDisplayName';
import { NodeBase } from './nodeBase';

export class ImageNode extends NodeBase {

    constructor(
        public readonly label: string,
        public imageDesc: Docker.ImageDesc,
        public readonly eventEmitter: vscode.EventEmitter<NodeBase>
    ) {
        super(label)
    }

    public static readonly contextValue: string = 'localImageNode';
    public readonly contextValue: string = ImageNode.contextValue;

    public getTreeItem(): vscode.TreeItem {
        let config = vscode.workspace.getConfiguration('docker');
        let displayName: string = getImageOrContainerDisplayName(this.label, config.get('truncateLongRegistryPaths'), config.get('truncateMaxLength'));

        displayName = `${displayName} (${moment(new Date(this.imageDesc.Created * 1000)).fromNow()})`;

        return {
            label: `${displayName}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: "localImageNode",
            iconPath: {
                light: path.join(imagesPath, 'light', 'application.svg'),
                dark: path.join(imagesPath, 'dark', 'application.svg')
            }
        }
    }

    // No children
}
