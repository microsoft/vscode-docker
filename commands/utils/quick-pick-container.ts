/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as Docker from 'dockerode';
import { ContainerDesc } from 'dockerode';
import vscode = require('vscode');
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { throwDockerConnectionError } from '../../explorer/utils/dockerConnectionError';
import { ext } from '../../src/extensionVariables';
import { docker, ListContainerDescOptions } from './docker-endpoint';

export interface ContainerItem extends vscode.QuickPickItem {
    label: string;
    containerDesc: Docker.ContainerDesc;
    allContainers: boolean;
}

function createItem(container: Docker.ContainerDesc): ContainerItem {
    return <ContainerItem>{
        label: container.Image,
        containerDesc: container
    };
}

function computeItems(containers: Docker.ContainerDesc[], includeAll: boolean): ContainerItem[] {
    const items: ContainerItem[] = [];

    for (let container of containers) {
        const item = createItem(container);
        items.push(item);
    }

    if (includeAll && containers.length > 0) {
        items.unshift(<ContainerItem>{
            label: 'All containers',
            allContainers: true
        });
    }

    return items;
}

export async function quickPickContainer(context: IActionContext, opts: ListContainerDescOptions): Promise<ContainerDesc> {
    let results = await quickPickContainersCore(context, false, opts);
    assert(results.length === 1);
    return results[0];
}

export async function quickPickContainerOrAll(context: IActionContext, opts: ListContainerDescOptions): Promise<ContainerDesc[]> {
    return await quickPickContainersCore(context, true, opts);
}

async function quickPickContainersCore(context: IActionContext, allowSelectingAll: boolean, opts: ListContainerDescOptions): Promise<ContainerDesc[]> {
    let properties: {
        allContainers?: string;
    } & TelemetryProperties = context.telemetry.properties;

    let containers: ContainerDesc[];

    try {
        containers = await docker.getContainerDescriptors(opts);
    } catch (err) {
        throwDockerConnectionError(context, err);
    }

    if (containers.length === 0) {
        throw new Error('There are no Docker containers that apply to this command.');
    } else {
        const items: ContainerItem[] = computeItems(containers, allowSelectingAll);
        let response = await ext.ui.showQuickPick<ContainerItem>(items, { placeHolder: 'Choose container...' });
        let allSelected: boolean = response.allContainers;
        properties.allContainers = String(allSelected);

        let selectedItems: ContainerDesc[] = response.allContainers ? containers : [response.containerDesc];
        return selectedItems;
    }
}
