/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext, DockerNetwork } from '../../extension.bundle';
import { ITestTreeItem, IValidateTreeOptions, validateTree, generateCreatedTimeInSec } from './validateTree';

// TODO: Update the test to validate the '1 month ago' description Issue #1758
const testNetworks: DockerNetwork[] = [
    {
        CreatedTime: generateCreatedTimeInSec(1),
        Name: "zzz-bridge",
        Driver: "bridge",
        Id: '7fc4ab013fd4aa4c2e749c443b066725eb5599a0d57a9f44951e7a45e8833883'
    },
    {
        CreatedTime: generateCreatedTimeInSec(2),
        Name: "net-host",
        Driver: "host",
        Id: '725558b7188f2fa22fce7868597e615c8a90682a2076fe15eee0404cb5f822b6'
    },
    {
        CreatedTime: generateCreatedTimeInSec(2),
        Name: "none",
        Driver: "nat",
        Id: 'f34848d85589e45cd2856f9c4f3fff218e0ea2b9af76eb56d02607198eab2c1a'
    }
];

async function validateNetworksTree(options: IValidateTreeOptions, expectedNodes: ITestTreeItem[]): Promise<void> {
    await validateTree(ext.networksRoot, 'networks', options, { networks: testNetworks }, expectedNodes);
}

suite('Networks Tree', async () => {
    test('Default Settings', async () => {
        await validateNetworksTree(
            {},
            [
                { label: "zzz-bridge", description: "bridge - a day ago" },
                { label: "net-host", description: "host - 2 days ago" },
                { label: "none", description: "null - 2 days ago" },
            ]);
    });

    test('Invalid Settings', async () => {
        await validateNetworksTree(
            {
                description: <any>[2, 3],
                groupBy: '',
                label: null,
                sortBy: 'test45'
            },
            [
                { label: "zzz-bridge", description: "bridge - a day ago" },
                { label: "net-host", description: "host - 2 days ago" },
                { label: "none", description: "null - 2 days ago" },
            ]);
    });

    test('NetworkDriver', async () => {
        await validateNetworksTree(
            {
                label: 'NetworkDriver',
                description: []
            },
            [
                { label: "bridge" },
                { label: "host" },
                { label: "null" },
            ]);
    });

    test('NetworkId', async () => {
        await validateNetworksTree(
            {
                label: 'NetworkId',
                description: []
            },
            [
                { label: "7fc4ab013fd4" },
                { label: "725558b7188f" },
                { label: "f34848d85589" },
            ]);
    });

    test('NetworkName', async () => {
        await validateNetworksTree(
            {
                label: 'NetworkName',
                description: []
            },
            [
                { label: "zzz-bridge" },
                { label: "net-host" },
                { label: "none" },
            ]);
    });

    test('NetworkName sortBy CreatedTime', async () => {
        await validateNetworksTree(
            {
                label: 'NetworkName',
                description: [],
                sortBy: 'CreatedTime',
            },
            [
                { label: "zzz-bridge" },
                { label: "net-host" },
                { label: "none" },
            ]);
    });

    test('NetworkName sortBy Label', async () => {
        await validateNetworksTree(
            {
                label: 'NetworkName',
                description: [],
                sortBy: 'Label',
            },
            [
                { label: "net-host" },
                { label: "none" },
                { label: "zzz-bridge" },
            ]);
    });

    test('GroupBy CreatedTime', async () => {
        await validateNetworksTree(
            {
                groupBy: 'CreatedTime',
                description: []
            },
            [
                {
                    label: "a day ago",
                    children: [
                        { label: "zzz-bridge" },
                    ]
                },
                {
                    label: "2 days ago",
                    children: [
                        { label: "net-host" },
                        { label: "none" },
                    ]
                },
            ]);
    });
});

