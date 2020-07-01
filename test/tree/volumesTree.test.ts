/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext, DockerVolume } from '../../extension.bundle';
import { generateCreatedTimeInSec, ITestTreeItem, IValidateTreeOptions, validateTree } from './validateTree';
// TODO: Update the test to validate the '1 month ago' description Issue #1758
const testVolumes: DockerVolume[] = [
    {
        CreatedTime: generateCreatedTimeInSec(1),
        Name: "nginxVol",
        Driver: 'test',
        Id: undefined,
    },
    {
        CreatedTime: generateCreatedTimeInSec(2),
        Name: "my-vol",
        Driver: 'test',
        Id: undefined,
    },
    {
        CreatedTime: generateCreatedTimeInSec(2),
        Name: "zz",
        Driver: 'test',
        Id: undefined,
    },
    {
        CreatedTime: generateCreatedTimeInSec(90),
        Name: "83c3eaffa92c0caf9ab34df3931f37b094464cb0daaab274c482010129fc7c73",
        Driver: 'test',
        Id: undefined,
    }
];

async function validateVolumesTree(options: IValidateTreeOptions, expectedNodes: ITestTreeItem[]): Promise<void> {
    await validateTree(ext.volumesRoot, 'volumes', options, { volumes: testVolumes }, expectedNodes);
}

suite('Volumes Tree', async () => {
    test('Default Settings', async () => {
        await validateVolumesTree(
            {},
            [
                { label: "nginxVol", description: "a day ago" },
                { label: "my-vol", description: "2 days ago" },
                { label: "zz", description: "2 days ago" },
                { label: "83c3eaffa92c0caf9ab34df3931f37b094464cb0daaab274c482010129fc7c73", description: "3 months ago" },
            ]);
    });

    test('Invalid Settings', async () => {
        await validateVolumesTree(
            {
                description: ['test2', 'test3'],
                groupBy: 'test44',
                label: <any>{},
                sortBy: 'test45'
            },
            [
                { label: "nginxVol", description: "a day ago" },
                { label: "my-vol", description: "2 days ago" },
                { label: "zz", description: "2 days ago" },
                { label: "83c3eaffa92c0caf9ab34df3931f37b094464cb0daaab274c482010129fc7c73", description: "3 months ago" },
            ]);
    });

    test('VolumeName', async () => {
        await validateVolumesTree(
            {
                label: 'VolumeName',
                description: []
            },
            [
                { label: "nginxVol" },
                { label: "my-vol" },
                { label: "zz" },
                { label: "83c3eaffa92c0caf9ab34df3931f37b094464cb0daaab274c482010129fc7c73" },
            ]);
    });

    test('VolumeName sortBy CreatedTime', async () => {
        await validateVolumesTree(
            {
                label: 'VolumeName',
                description: [],
                sortBy: 'CreatedTime',
            },
            [
                { label: "nginxVol" },
                { label: "my-vol" },
                { label: "zz" },
                { label: "83c3eaffa92c0caf9ab34df3931f37b094464cb0daaab274c482010129fc7c73" },
            ]);
    });

    test('VolumeName sortBy Label', async () => {
        await validateVolumesTree(
            {
                label: 'VolumeName',
                description: [],
                sortBy: 'Label',
            },
            [
                { label: "83c3eaffa92c0caf9ab34df3931f37b094464cb0daaab274c482010129fc7c73" },
                { label: "my-vol" },
                { label: "nginxVol" },
                { label: "zz" },
            ]);
    });

    test('GroupBy CreatedTime', async () => {
        await validateVolumesTree(
            {
                groupBy: 'CreatedTime',
                description: []
            },
            [
                {
                    label: "a day ago",
                    children: [
                        { label: "nginxVol" },
                    ]
                },
                {
                    label: "2 days ago",
                    children: [
                        { label: "my-vol" },
                        { label: "zz" },
                    ]
                },
                {
                    label: "3 months ago",
                    children: [
                        { label: "83c3eaffa92c0caf9ab34df3931f37b094464cb0daaab274c482010129fc7c73" },
                    ]
                },
            ]);
    });
});

