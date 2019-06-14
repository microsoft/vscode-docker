/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VolumeInspectInfo } from 'dockerode';
import { ext } from '../../extension.bundle';
import { generateCreatedTimeISOString, ITestTreeItem, IValidateTreeOptions, validateTree } from './validateTree';

const testVolumes: Partial<VolumeInspectInfo & { CreatedAt: string }>[] = [
    {
        CreatedAt: generateCreatedTimeISOString(1),
        Name: "nginxVol",
    },
    {
        CreatedAt: generateCreatedTimeISOString(44),
        Name: "my-vol",
    },
    {
        CreatedAt: generateCreatedTimeISOString(45),
        Name: "zz",
    },
    {
        CreatedAt: generateCreatedTimeISOString(90),
        Name: "83c3eaffa92c0caf9ab34df3931f37b094464cb0daaab274c482010129fc7c73",
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
                { label: "my-vol", description: "a month ago" },
                { label: "zz", description: "a month ago" },
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
                { label: "my-vol", description: "a month ago" },
                { label: "zz", description: "a month ago" },
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
                    label: "a month ago",
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

