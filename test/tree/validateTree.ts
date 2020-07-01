/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { DockerApiClient, DockerContainer, DockerVolume, DockerNetwork, DockerImage, AzExtParentTreeItem, AzExtTreeItem, ext, IActionContext } from '../../extension.bundle';
import { runWithSetting } from '../runWithSetting';

export function generateCreatedTimeInSec(days: number): number {
    const daysInSec = days * 24 * 60 * 60;
    return new Date().valueOf() / 1000 - daysInSec;
}

export function generateCreatedTimeISOString(days: number): string {
    const daysInMS = days * 24 * 60 * 60 * 1000;
    return new Date(new Date().valueOf() - daysInMS).toISOString();
}

export interface IValidateTreeOptions {
    label?: string;
    description?: string[];
    groupBy?: string;
    sortBy?: string;
}

export interface ITestTreeItem {
    label: string;
    description?: string;
    children?: ITestTreeItem[];
}

export async function validateTree(rootTreeItem: AzExtParentTreeItem, treePrefix: string, treeOptions: IValidateTreeOptions, mockClientOptions: IMockClientOptions, expectedNodes: ITestTreeItem[]): Promise<AzExtTreeItem[]> {
    let actualNodes: AzExtTreeItem[] = [];
    await runWithSetting(`${treePrefix}.sortBy`, treeOptions.sortBy, async () => {
        await runWithSetting(`${treePrefix}.groupBy`, treeOptions.groupBy, async () => {
            await runWithSetting(`${treePrefix}.label`, treeOptions.label, async () => {
                await runWithSetting(`${treePrefix}.description`, treeOptions.description, async () => {
                    await runWithMockClient(mockClientOptions, async () => {
                        await rootTreeItem.refresh();

                        const context: IActionContext = { telemetry: { properties: {}, measurements: {} }, errorHandling: { issueProperties: {} } };

                        actualNodes = await rootTreeItem.getCachedChildren(context);

                        const actual = await Promise.all(actualNodes.map(async node => {
                            const actualNode: ITestTreeItem = convertToTestTreeItem(node);
                            if (node instanceof AzExtParentTreeItem) {
                                const children = await node.getCachedChildren(context);
                                actualNode.children = children.map(convertToTestTreeItem);
                            }
                            return actualNode;
                        }));

                        assert.deepStrictEqual(actual, expectedNodes);
                    });
                });
            });
        });
    });
    return actualNodes;
}

interface IMockClientOptions {
    containers?: DockerContainer[],
    images?: DockerImage[],
    volumes?: DockerVolume[],
    networks?: DockerNetwork[]
}

async function runWithMockClient(options: IMockClientOptions, callback: () => Promise<void>): Promise<void> {
    const oldClient = ext.dockerClient;

    try {
        const mockClient: Partial<DockerApiClient> = {
            getContainers: async () => options.containers,
            getImages: async () => options.images,
            getVolumes: async () => options.volumes,
            getNetworks: async () => options.networks
        };

        ext.dockerClient = mockClient as DockerApiClient;
        await callback();
    } finally {
        ext.dockerClient = oldClient;
    }
}

function convertToTestTreeItem(node: AzExtTreeItem): ITestTreeItem {
    const actualNode: ITestTreeItem = { label: node.label };
    if (node.description) {
        actualNode.description = node.description;
    }
    assert.ok(node.id);
    assert.ok(node.contextValue);
    assert.ok(node.iconPath);
    return actualNode;
}
