/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzExtParentTreeItem, IActionContext } from "vscode-azureextensionui";
import { DockerOSType } from '../../../docker/Common';
import { DockerUri } from '../../../docker/files/DockerUri';
import { localize } from '../../../localize';
import { DirectoryTreeItem } from "./DirectoryTreeItem";

export class FilesTreeItem extends DirectoryTreeItem {
    public constructor(parent: AzExtParentTreeItem, fs: vscode.FileSystem, containerId: string, containerOSProvider: (context: IActionContext) => Promise<DockerOSType>) {
        super(
            parent,
            fs,
            localize('vscode-docker.tree.containers.files.filesTitle', 'Files'),
            async context => {
                const containerOS = await containerOSProvider(context);

                return DockerUri.create(containerId, '/', { containerOS, fileType: 'directory' });
            });
    }

    public get iconPath(): vscode.ThemeIcon {
        return new vscode.ThemeIcon('files');
    }
}
