/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { DockerOSType } from '../../../docker/Common';
import { DirectoryItem, UnrecognizedDirectoryItemTypeError } from "../../../docker/files/ContainerFilesUtils";
import { DockerUri } from '../../../docker/files/DockerUri';
import { FileTreeItem } from "./FileTreeItem";

export type DirectoryItemProvider = (path: string | undefined) => Promise<DirectoryItem[]>;

export class DirectoryTreeItem extends AzExtParentTreeItem {
    private children: AzExtTreeItem[] | undefined;

    public constructor(
        parent: AzExtParentTreeItem,
        private readonly fs: vscode.FileSystem,
        private readonly name: string,
        private readonly uri: DockerUri,
        private readonly containerOSProvider: (context: IActionContext) => Promise<DockerOSType>) {
        super(parent);
    }

    public get contextValue(): string {
        return 'containerDirectory';
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this.children;
    }

    public get iconPath(): vscode.ThemeIcon {
        return new vscode.ThemeIcon('folder');
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this.children = undefined;
        }

        const containerOS = await this.containerOSProvider(context);
        const actualUri = this.uri.with({ containerOS });
        const items = await this.fs.readDirectory(actualUri.uri);

        return items.map(item => this.createTreeItemForDirectoryItem(item, actualUri));
    }

    public compareChildrenImpl(item1: DirectoryTreeItem | FileTreeItem, item2: DirectoryTreeItem | FileTreeItem): number {
        if ((item1 instanceof DirectoryTreeItem && item2 instanceof DirectoryTreeItem) ||
            (item1 instanceof FileTreeItem && item2 instanceof FileTreeItem)) {
            // If both are directories, or both are files, go alphabetical
            return item1.label.localeCompare(item2.label);
        } else if (item1 instanceof DirectoryTreeItem) {
            // item1 is a directory and item2 is a file, so item1 should show first
            return -1;
        } else {
            // item2 is a directory and item1 is a file, so item2 should show first
            return 1;
        }
    }

    private createTreeItemForDirectoryItem(item: [string, vscode.FileType], parentUri: DockerUri): AzExtTreeItem {
        const name = item[0];
        const fileType = item[1];

        const itemUri = DockerUri.joinPath(parentUri, name);

        switch (fileType) {
            case vscode.FileType.Directory:

                return new DirectoryTreeItem(this, this.fs, name, itemUri, this.containerOSProvider);

            case vscode.FileType.File:

                return new FileTreeItem(this, name, itemUri.with({ fileType: 'file' }));

            default:
                throw new UnrecognizedDirectoryItemTypeError();
        }
    }

    public get id(): string {
        return this.uri.uri.toString();
    }

    public get label(): string {
        return this.name;
    }
}
