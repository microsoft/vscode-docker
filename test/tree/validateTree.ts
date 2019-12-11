/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as Dockerode from 'dockerode';
import { AzExtParentTreeItem, AzExtTreeItem, ext, IActionContext } from '../../extension.bundle';
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

export async function validateTree(rootTreeItem: AzExtParentTreeItem, treePrefix: string, treeOptions: IValidateTreeOptions, dockerodeOptions: ITestDockerodeOptions, expectedNodes: ITestTreeItem[]): Promise<AzExtTreeItem[]> {
    let actualNodes: AzExtTreeItem[] = [];
    await runWithSetting(`${treePrefix}.sortBy`, treeOptions.sortBy, async () => {
        await runWithSetting(`${treePrefix}.groupBy`, treeOptions.groupBy, async () => {
            await runWithSetting(`${treePrefix}.label`, treeOptions.label, async () => {
                await runWithSetting(`${treePrefix}.description`, treeOptions.description, async () => {
                    await runWithDockerode(dockerodeOptions, async () => {
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

interface ITestDockerodeOptions {
    containers?: Partial<Dockerode.ContainerInfo>[],
    images?: Partial<Dockerode.ImageInfo>[],
    volumes?: Partial<Dockerode.VolumeInspectInfo>[],
    networks?: Partial<Dockerode.NetworkInspectInfo>[]
}

async function runWithDockerode(options: ITestDockerodeOptions, callback: () => Promise<void>): Promise<void> {
    const oldDockerode = ext.dockerode;
    try {
        ext.dockerode = <Dockerode><any>{
            listContainers: async () => options.containers,
            listImages: async () => options.images,
            listVolumes: async () => { return { Volumes: options.volumes } },
            listNetworks: async () => options.networks
        };
        await callback();
    } finally {
        ext.dockerode = oldDockerode;
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
