/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ThemeIcon } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, GenericTreeItem, IActionContext } from "vscode-azureextensionui";
import { localize } from "../../localize";
import { getThemedIconPath } from '../IconPath';
import { OpenUrlTreeItem } from "../OpenUrlTreeItem";

export class HelpsTreeItem extends AzExtParentTreeItem {
    public label: string = 'help';
    public contextValue: string = 'help';

    private values: GenericTreeItem[];
    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        return this.values ?? (this.values = [
            this.readDocumentationTreeItem,
            this.getStartedTreeItem,
            this.openStartPageTreeItem,
            this.reviewIssuesTreeItem,
            this.reportIssuesTreeItem,
            this.installDockerTreeItem,
        ]);
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(item1: AzExtTreeItem, item2: AzExtTreeItem): number {
        // default sorting is based on the label which is being displayed to user.
        // use id to control the order being dispalyed
        return item1.id.localeCompare(item2.id);
    }

    private get readDocumentationTreeItem(): AzExtTreeItem {
        const node = new OpenUrlTreeItem(
            this,
            localize('views.help.readDocumentation', 'Docker Extension Documentation'),
            'https://aka.ms/helppanel_docs',
            getThemedIconPath('book')
        );
        node.id = '1';

        return node;
    }

    private get getStartedTreeItem(): AzExtTreeItem {
        const node = new OpenUrlTreeItem(
            this,
            localize('views.help.getStarted', 'Get Started with Docker Tutorial'),
            'https://aka.ms/helppanel_getstarted',
            getThemedIconPath('star-empty')
        );
        node.id = '2';

        return node;
    }

    private get openStartPageTreeItem(): AzExtTreeItem {
        const node = new GenericTreeItem(
            this,
            {
                label: localize('views.help.openStartPage', 'Open Extension Start Page'),
                contextValue: 'OpenStartPage',
                commandId: 'vscode-docker.help.openStartPage',
                iconPath: new ThemeIcon('extensions'),
                includeInTreeItemPicker: true,
            }
        );
        node.id = '3';

        return node;
    }

    private get reviewIssuesTreeItem(): AzExtTreeItem {
        const node = new OpenUrlTreeItem(
            this,
            localize('views.help.reviewIssues', 'Review Issues'),
            'https://aka.ms/helppanel_reviewissues',
            getThemedIconPath('issues')
        );
        node.id = '4';

        return node;
    }

    private get reportIssuesTreeItem(): AzExtTreeItem {
        const node = new GenericTreeItem(
            this,
            {
                label: localize('views.help.reportIssue', 'Report Issue'),
                contextValue: 'Report Issue',
                commandId: 'vscode-docker.help.reportIssue',
                iconPath: getThemedIconPath('comment'),
                includeInTreeItemPicker: true,
            }
        );
        node.id = '5';

        return node;
    }

    private get installDockerTreeItem(): AzExtTreeItem {
        const node = new GenericTreeItem(
            this,
            {
                label: localize('views.help.installDocker', 'Install Docker'),
                contextValue: 'Install Docker',
                commandId: 'vscode-docker.installDocker',
                iconPath: getThemedIconPath('docker'),
                includeInTreeItemPicker: true,
            }
        );
        node.id = '6';

        return node;
    }
}
