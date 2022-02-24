/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, GenericTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { localize } from "../../localize";
import { getThemedIconPath } from '../getThemedIconPath';
import { OpenUrlTreeItem } from "../OpenUrlTreeItem";

export class HelpsTreeItem extends AzExtParentTreeItem {
    public label: string = 'help';
    public contextValue: string = 'help';

    private values: GenericTreeItem[];
    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        return this.values ?? (this.values = [
            this.readDocumentationTreeItem,
            this.watchVideosTreeItem,
            this.getStartedTreeItem,
            this.openWalkthroughTreeItem,
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
            localize('views.help.readDocumentation', 'Read Extension Documentation'),
            'https://aka.ms/helppanel_docs',
            new ThemeIcon('book')
        );
        node.id = '0';

        return node;
    }

    private get watchVideosTreeItem(): AzExtTreeItem {
        const node = new OpenUrlTreeItem(
            this,
            localize('views.help.watchVideos', 'Watch Extension Tutorial Videos'),
            'https://aka.ms/helppanel_videos',
            new ThemeIcon('play-circle')
        );
        node.id = '10';

        return node;
    }

    private get getStartedTreeItem(): AzExtTreeItem {
        const node = new OpenUrlTreeItem(
            this,
            localize('views.help.getStarted', 'Get Started with Docker Tutorial'),
            'https://aka.ms/helppanel_getstarted',
            new ThemeIcon('star-empty')
        );
        node.id = '20';

        return node;
    }

    private get openWalkthroughTreeItem(): AzExtTreeItem {
        const node = new GenericTreeItem(
            this,
            {
                label: localize('views.help.openWalkthrough', 'Open Docker Extension Walkthrough'),
                contextValue: 'OpenWalkthrough',
                commandId: 'vscode-docker.help.openWalkthrough',
                iconPath: new ThemeIcon('extensions'),
                includeInTreeItemPicker: true,
            }
        );
        node.id = '30';

        return node;
    }

    private get reviewIssuesTreeItem(): AzExtTreeItem {
        const node = new OpenUrlTreeItem(
            this,
            localize('views.help.reviewIssues', 'Review Issues'),
            'https://aka.ms/helppanel_reviewissues',
            new ThemeIcon('issues')
        );
        node.id = '40';

        return node;
    }

    private get reportIssuesTreeItem(): AzExtTreeItem {
        const node = new GenericTreeItem(
            this,
            {
                label: localize('views.help.reportIssue', 'Report Issue'),
                contextValue: 'Report Issue',
                commandId: 'vscode-docker.help.reportIssue',
                iconPath: new ThemeIcon('comment'),
                includeInTreeItemPicker: true,
            }
        );
        node.id = '50';

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
        node.id = '60';

        return node;
    }
}
