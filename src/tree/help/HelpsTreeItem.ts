/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, GenericTreeItem, IActionContext } from "vscode-azureextensionui";
import { localize } from "../../localize";
import { getThemedIconPath } from '../IconPath';
import { OpenUrlTreeItem } from "../OpenUrlTreeItem";

export class HelpsTreeItem extends AzExtParentTreeItem {
    public label: string = 'help';
    public contextValue: string = 'help';

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        return [
            // this.getStartedTreeItem,
            this.readDocumentationTreeItem,
            this.reviewIssuesTreeItem,
            this.reportIssuesTreeItem
        ];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(item1: AzExtTreeItem, item2: AzExtTreeItem): number {
        // default sorting is based on the label which is being displayed to user.
        // use id to control the order being dispalyed
        return item1.id.localeCompare(item2.id);
    }

    // This Get Started item will be enabled once we have the right Docker Tutorial url
    // private get getStartedTreeItem(): AzExtTreeItem {
    //     const node = new OpenUrlTreeItem(
    //         this,
    //         localize('views.help.getStarted', 'Get Started'),
    //         'https://aka.ms/helppanel_getstarted',
    //         getThemedIconPath('star-empty'));
    //     node.id = '1';

    //     return node;
    // }

    private get readDocumentationTreeItem(): AzExtTreeItem {
        const node = new OpenUrlTreeItem(
            this,
            localize('views.help.readDocumentation', 'Read Documentation'),
            'https://aka.ms/helppanel_docs',
            getThemedIconPath('book'));
        node.id = '2';

        return node;
    }

    private get reviewIssuesTreeItem(): AzExtTreeItem {
        const node = new OpenUrlTreeItem(
            this,
            localize('views.help.reviewIssues', 'Review Issues'),
            'https://aka.ms/helppanel_reviewissues',
            getThemedIconPath('issues'));
        node.id = '3';

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
            })
        node.id = '4';

        return node;
    }
}
