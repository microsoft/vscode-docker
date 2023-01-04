/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { MultiSelectNode } from '../../utils/multiSelectNodes';
import { getTreeId } from "../LocalRootTreeItemBase";
import { resolveTooltipMarkdown } from '../resolveTooltipMarkdown';
import { ToolTipParentTreeItem } from '../ToolTipTreeItem';
import { getContainerStateIcon } from "./ContainerProperties";
import { DockerContainerInfo } from './ContainersTreeItem';
import { FilesTreeItem } from "./files/FilesTreeItem";
import { ContainerOS, ListContainersItem, PortBinding } from '../../runtimes/docker';
import { getDockerOSType } from '../../utils/osUtils';

/**
 * This interface defines properties used by the Remote Containers extension. These properties must not be removed from this class.
 */
interface ContainerTreeItemUsedByRemoteContainers {
    readonly containerDesc: {
        readonly Id: string;
    };
}

export class ContainerTreeItem extends ToolTipParentTreeItem implements MultiSelectNode, ContainerTreeItemUsedByRemoteContainers {
    public static allContextRegExp: RegExp = /Container$/;
    public static runningContainerRegExp: RegExp = /^runningContainer$/i;
    private readonly _item: DockerContainerInfo;
    private children: AzExtTreeItem[] | undefined;
    private containerOS: ContainerOS;

    public constructor(parent: AzExtParentTreeItem, itemInfo: DockerContainerInfo) {
        super(parent);
        this._item = itemInfo;
    }

    public readonly canMultiSelect: boolean = true;

    public get id(): string {
        return getTreeId(this._item);
    }

    public get createdTime(): number {
        return this._item.createdAt.valueOf();
    }

    public get containerId(): string {
        return this._item.id;
    }

    public get containerName(): string {
        return this._item.name;
    }

    public get imageName(): string {
        return this._item.image.originalName;
    }

    public get labels(): { [key: string]: string } {
        return this._item.labels;
    }

    public get label(): string {
        return ext.containersRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return ext.containersRoot.getTreeItemDescription(this._item);
    }

    public get contextValue(): string {
        return this._item.state + 'Container';
    }

    public get ports(): PortBinding[] {
        return this._item.ports;
    }

    public get containerItem(): ListContainersItem {
        return this._item;
    }

    /**
     * @deprecated This is only kept for backwards compatability with the "Remote Containers" extension
     */
    public get containerDesc(): { Id: string } {
        return {
            Id: this._item.id,
        };
    }

    public get iconPath(): vscode.ThemeIcon {
        if (this._item.status?.includes('(unhealthy)')) {
            return new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
        } else {
            return getContainerStateIcon(this._item.state);
        }
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        await ext.runWithDefaults(client =>
            client.removeContainers({ containers: [this.containerId], force: true })
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return this._item.showFiles && this.isRunning && this.children === undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this.children = undefined;
        }

        if (this._item.showFiles && this.isRunning) {
            this.children = [
                new FilesTreeItem(
                    this,
                    vscode.workspace.fs,
                    this.containerId,
                    async c => {
                        if (this.containerOS === undefined) {
                            this.containerOS = await getDockerOSType();
                        }

                        return this.containerOS;
                    })
            ];
        }

        return this.children ?? [];
    }

    public isAncestorOfImpl(expectedContextValue: string | RegExp): boolean {
        // If we're looking for something matching `Container$` in the expectedContextValue, it will not be a child of this item (which is the container)
        // The only children of this item have `containerFile` and `containerDirectory` as context values
        if (/Container\$?$/i.test(typeof expectedContextValue === 'string' ? expectedContextValue : expectedContextValue.source)) {
            return false;
        }

        return true;
    }

    public async resolveTooltipInternal(actionContext: IActionContext): Promise<vscode.MarkdownString> {
        actionContext.telemetry.properties.tooltipType = 'container';

        const containerInspection = (await ext.runWithDefaults(client =>
            client.inspectContainers({ containers: [this.containerId] })
        ))?.[0];

        const handlebarsContext = {
            ...containerInspection,
            normalizedName: this.containerName,
        };
        return resolveTooltipMarkdown(containerTooltipTemplate, handlebarsContext);
    }

    private get isRunning(): boolean {
        return this._item.state.toLowerCase() === 'running';
    }
}

const containerTooltipTemplate = `
### {{ normalizedName }} ({{ substr id 0 12 }})

---

#### Image
{{ image.originalName }} ({{ substr imageId 7 12 }})

---

#### Ports
{{#if (nonEmptyArr ports)}}
{{#each ports}}
  - [{{ this.hostPort }}](http://localhost:{{ this.hostPort }}) ➔ {{ this.containerPort }} {{ this.protocol }}
{{/each}}
{{else}}
_None_
{{/if}}

---

#### Volumes
{{#if (nonEmptyArr mounts)}}
{{#each mounts}}
{{#if (eq this.type 'bind')}}
  - {{ friendlyBindHost this.source }} ➔ {{ this.destination }} (Bind mount, {{#if this.readOnly}}RO{{else}}RW{{/if}})
{{/if}}
{{#if (eq this.type 'volume')}}
  - {{ this.name }} ➔ {{ this.destination }} (Named volume, {{#if this.readOnly}}RO{{else}}RW{{/if}})
{{/if}}
{{/each}}
{{else}}
_None_
{{/if}}

---

#### Networks
{{#if (nonEmptyArr networks)}}
{{#each networks}}
  - {{ this.name }}
{{/each}}
{{else}}
_None_
{{/if}}
`;
