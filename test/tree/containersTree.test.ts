/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ext, NonComposeGroupName, DockerContainerInfo } from '../../extension.bundle';
import { runWithExtensionSettings } from '../runWithExtensionSettings';
import { generateCreatedTimeInMs, ITestTreeItem, IValidateTreeOptions, validateTree } from './validateTree';

const testContainers: DockerContainerInfo[] = [
    {
        Id: "9330566c414439f4873edd95689b559466993681f7b9741005b5a74786134202",
        Name: "vigorous_booth",
        Image: "node:8.0",
        ImageID: "sha256:065e283f68bd5ef3b079aee76d3aa55b5e56e8f9ede991a97ff15fdc556f8cfd",
        CreatedTime: generateCreatedTimeInMs(1),
        Ports: [],
        State: "created",
        Status: "Created",
        Labels: { "com.docker.compose.project": "proj1" },
        showFiles: false
    },
    {
        Id: "faeb6f02af06df748a0040476ba7c335fb8aaefd76f6ea14a76800faf0fa3910",
        Name: "elegant_knuth",
        Image: "registry:latest",
        ImageID: "sha256:f32a97de94e13d29835a19851acd6cbc7979d1d50f703725541e44bb89a1ce91",
        CreatedTime: generateCreatedTimeInMs(2),
        Ports: [
            { IP: "0.0.0.0", PrivatePort: 5000, PublicPort: 5000, Type: "tcp" }
        ],
        State: "running",
        Status: "Up 6 minutes",
        Labels: { "com.docker.compose.project": "proj1" },
        showFiles: false
    },
    {
        Id: "99636d5207b3da8a9865ef931aa3c758688e795e7787a6982fc7b5da07a5de8c",
        Name: "focused_cori",
        Image: "mcr.microsoft.com/dotnet/core/sdk:latest",
        ImageID: "sha256:bbae085fa7eb0725dd2647a357988095754620aaf64ddc4b152d6f1407111dc8",
        CreatedTime: generateCreatedTimeInMs(3),
        Ports: [],
        State: "paused",
        Status: "Up 8 minutes (Paused)",
        Labels: { "com.docker.compose.project": "proj2" },
        showFiles: false
    },
    {
        Id: "49df1ed4a46c2617025298a8bdb01bc37267ecae82fc8ab88b0504314d94b983",
        Name: "zealous_napier",
        Image: "emjacr2.azurecr.io/docker-django-webapp-linux:cj8",
        ImageID: "sha256:d3eef98c0630cc7e2b81f37fe8c8db7b554aeff42d3bf193337842f80b208614",
        CreatedTime: generateCreatedTimeInMs(35),
        Ports: [
            { IP: "0.0.0.0", PrivatePort: 2222, PublicPort: 2222, Type: "tcp" },
            { IP: "0.0.0.0", PrivatePort: 8000, PublicPort: 8000, Type: "tcp" }
        ],
        State: "running",
        Status: "Up 8 minutes",
        Labels: { "com.docker.compose.project": "proj2" },
        showFiles: false
    },
    {
        Id: "ee098ec2fb0b337e4f480a1a33dd1d396ef6b242579bb8b874e480957c053f34",
        Name: "admiring_leavitt",
        Image: "vsc-js1-6b97c65e88377ff89a4eab7bc81b694d",
        ImageID: "sha256:7804287702e2a3d7f44b46a9ce864951ed093227e1d4e1f67992760292bd8126",
        CreatedTime: generateCreatedTimeInMs(36),
        Ports: [],
        State: "exited",
        Status: "Exited (137) 12 hours ago",
        Labels: { "com.docker.compose.project": "proj3" },
        showFiles: false
    },
    {
        Id: "5e25d05c0797d44c0efaf3479633316f9229e3f71feccfbe2278c35681c0436f",
        Name: "inspiring_brattain",
        Image: "acr-build-helloworld-node:latest",
        ImageID: "sha256:4d476c415ca931a558cfefe48f4f51e8b6bcbadf6f8820cf5a98a05794b59293",
        CreatedTime: generateCreatedTimeInMs(37),
        Ports: [{ IP: "0.0.0.0", PrivatePort: 80, PublicPort: 80, Type: "tcp" }],
        State: "running",
        Status: "Up 32 hours",
        Labels: { "com.docker.compose.project": "proj3" },
        showFiles: false
    },
    {
        Id: "531005593f5da6f15ce13a6149a9b4866608fad5bddc600d37239e3d9976f00f",
        Name: "elegant_mendel",
        Image: "test:latest",
        ImageID: "sha256:93074a25f8cc8647a62dfc14d42710751d1f341479d0a6943384e618685db614",
        CreatedTime: generateCreatedTimeInMs(90),
        Ports: [],
        State: "running",
        Status: "Up 49 seconds",
        Labels: { "com.docker.compose.project": "proj3" },
        showFiles: false
    },
    {
        Id: "99fd96f9cdf9fb7668887477f91b0c72682461690ff83030e8a6aa63a871f63a",
        Name: "devtest",
        Image: "nginx:latest",
        ImageID: "sha256:62c261073ecffe22a28f2ba67760a9320bc4bfe8136a83ba9b579983346564be",
        CreatedTime: generateCreatedTimeInMs(365),
        Ports: [],
        State: "exited",
        Status: "Exited (0) 2 days ago",
        showFiles: false
    }
];

async function validateContainersTree(options: IValidateTreeOptions, expectedNodes: ITestTreeItem[]): Promise<void> {
    await runWithExtensionSettings({ 'truncateLongRegistryPaths': false }, async () => {
        await validateTree(ext.containersRoot, 'containers', options, { containers: testContainers }, expectedNodes);
    });
}

suite('Containers Tree', async () => {
    test('Default Settings', async () => {
        await validateContainersTree(
            {},
            [
                {
                    label: "proj1",
                    children: [
                        { label: "node:8.0", description: "vigorous_booth - Created" },
                        { label: "registry:latest", description: "elegant_knuth - Up 6 minutes" },
                    ]
                },
                {
                    label: "proj2",
                    children: [
                        { label: "mcr.microsoft.com/dotnet/core/sdk:latest", description: "focused_cori - Up 8 minutes (Paused)" },
                        { label: "emjacr2.azurecr.io/docker-django-webapp-linux:cj8", description: "zealous_napier - Up 8 minutes" },
                    ]
                },
                {
                    label: "proj3",
                    children: [
                        { label: "vsc-js1-6b97c65e88377ff89a4eab7bc81b694d", description: "admiring_leavitt - Exited (137) 12 hours ago" },
                        { label: "acr-build-helloworld-node:latest", description: "inspiring_brattain - Up 32 hours" },
                        { label: "test:latest", description: "elegant_mendel - Up 49 seconds" },
                    ]
                },
                {
                    label: NonComposeGroupName,
                    children: [
                        { label: "nginx:latest", description: "devtest - Exited (0) 2 days ago" },
                    ]
                },
            ]);
    });

    test('Invalid Settings', async () => {
        await validateContainersTree(
            {
                description: ['test'],
                groupBy: <any>true,
                label: <any>22,
                sortBy: 'test3'
            },
            [
                { label: "node:8.0", description: "vigorous_booth - Created", children: [] },
                { label: "registry:latest", description: "elegant_knuth - Up 6 minutes", children: [] },
                { label: "mcr.microsoft.com/dotnet/core/sdk:latest", description: "focused_cori - Up 8 minutes (Paused)", children: [] },
                { label: "emjacr2.azurecr.io/docker-django-webapp-linux:cj8", description: "zealous_napier - Up 8 minutes", children: [] },
                { label: "vsc-js1-6b97c65e88377ff89a4eab7bc81b694d", description: "admiring_leavitt - Exited (137) 12 hours ago", children: [] },
                { label: "acr-build-helloworld-node:latest", description: "inspiring_brattain - Up 32 hours", children: [] },
                { label: "test:latest", description: "elegant_mendel - Up 49 seconds", children: [] },
                { label: "nginx:latest", description: "devtest - Exited (0) 2 days ago", children: [] },
            ]);
    });

    test('ContainerName', async () => {
        await validateContainersTree(
            {
                label: 'ContainerName',
                description: []
            },
            [
                {
                    label: "proj1",
                    children: [
                        { label: "vigorous_booth" },
                        { label: "elegant_knuth" },
                    ]
                },
                {
                    label: "proj2",
                    children: [
                        { label: "focused_cori" },
                        { label: "zealous_napier" },
                    ]
                },
                {
                    label: "proj3",
                    children: [
                        { label: "admiring_leavitt" },
                        { label: "inspiring_brattain" },
                        { label: "elegant_mendel" },
                    ]
                },
                {
                    label: NonComposeGroupName,
                    children: [
                        { label: "devtest" },
                    ]
                },
            ]);
    });

    test('ContainerId', async () => {
        await validateContainersTree(
            {
                label: 'ContainerId',
                description: []
            },
            [
                {
                    label: "proj1",
                    children: [
                        { label: "9330566c4144" },
                        { label: "faeb6f02af06" },
                    ]
                },
                {
                    label: "proj2",
                    children: [
                        { label: "99636d5207b3" },
                        { label: "49df1ed4a46c" },
                    ]
                },
                {
                    label: "proj3",
                    children: [
                        { label: "ee098ec2fb0b" },
                        { label: "5e25d05c0797" },
                        { label: "531005593f5d" },
                    ]
                },
                {
                    label: NonComposeGroupName,
                    children: [
                        { label: "99fd96f9cdf9" },
                    ]
                },
            ]);
    });

    test('Ports', async () => {
        await validateContainersTree(
            {
                label: 'Ports',
                description: []
            },
            [
                {
                    label: "proj1",
                    children: [
                        { label: "<none>" },
                        { label: "5000" },
                    ]
                },
                {
                    label: "proj2",
                    children: [
                        { label: "<none>" },
                        { label: "2222,8000" },
                    ]
                },
                {
                    label: "proj3",
                    children: [
                        { label: "<none>" },
                        { label: "80" },
                        { label: "<none>" },
                    ]
                },
                {
                    label: NonComposeGroupName,
                    children: [
                        { label: "<none>" },
                    ]
                },
            ]);
    });

    test('Status', async () => {
        await validateContainersTree(
            {
                label: 'Status',
                description: []
            },
            [
                {
                    label: "proj1",
                    children: [
                        { label: "Created" },
                        { label: "Up 6 minutes" },
                    ]
                },
                {
                    label: "proj2",
                    children: [
                        { label: "Up 8 minutes (Paused)" },
                        { label: "Up 8 minutes" },
                    ]
                },
                {
                    label: "proj3",
                    children: [
                        { label: "Exited (137) 12 hours ago" },
                        { label: "Up 32 hours" },
                        { label: "Up 49 seconds" },
                    ]
                },
                {
                    label: NonComposeGroupName,
                    children: [
                        { label: "Exited (0) 2 days ago" },
                    ]
                },
            ]);
    });

    test('State', async () => {
        await validateContainersTree(
            {
                label: 'State',
                description: []
            },
            [
                {
                    label: "proj1",
                    children: [
                        { label: "created" },
                        { label: "running" },
                    ]
                },
                {
                    label: "proj2",
                    children: [
                        { label: "paused" },
                        { label: "running" },
                    ]
                },
                {
                    label: "proj3",
                    children: [
                        { label: "exited" },
                        { label: "running" },
                        { label: "running" },
                    ]
                },
                {
                    label: NonComposeGroupName,
                    children: [
                        { label: "exited" },
                    ]
                },
            ]);
    });

    test('ContainerName sortBy CreatedTime', async () => {
        await validateContainersTree(
            {
                label: 'ContainerName',
                description: [],
                sortBy: 'CreatedTime',
            },
            [
                {
                    label: "proj1",
                    children: [
                        { label: "vigorous_booth" },
                        { label: "elegant_knuth" },
                    ]
                },
                {
                    label: "proj2",
                    children: [
                        { label: "focused_cori" },
                        { label: "zealous_napier" },
                    ]
                },
                {
                    label: "proj3",
                    children: [
                        { label: "admiring_leavitt" },
                        { label: "inspiring_brattain" },
                        { label: "elegant_mendel" },
                    ]
                },
                {
                    label: NonComposeGroupName,
                    children: [
                        { label: "devtest" },
                    ]
                },
            ]);
    });

    test('ContainerName sortBy Label', async () => {
        await validateContainersTree(
            {
                groupBy: 'None',
                label: 'ContainerName',
                description: [],
                sortBy: 'Label',
            },
            [
                { label: "admiring_leavitt", children: [] },
                { label: "devtest", children: [] },
                { label: "elegant_knuth", children: [] },
                { label: "elegant_mendel", children: [] },
                { label: "focused_cori", children: [] },
                { label: "inspiring_brattain", children: [] },
                { label: "vigorous_booth", children: [] },
                { label: "zealous_napier", children: [] },
            ]);
    });

    test('GroupBy Registry', async () => {
        await validateContainersTree(
            {
                groupBy: 'Registry',
                label: 'RepositoryNameAndTag',
                description: ['Status']
            },
            [
                {
                    label: "docker.io/library",
                    children: [
                        { label: "node:8.0", description: "Created" },
                        { label: "registry:latest", description: "Up 6 minutes" },
                        { label: "vsc-js1-6b97c65e88377ff89a4eab7bc81b694d", description: "Exited (137) 12 hours ago" },
                        { label: "acr-build-helloworld-node:latest", description: "Up 32 hours" },
                        { label: "test:latest", description: "Up 49 seconds" },
                        { label: "nginx:latest", description: "Exited (0) 2 days ago" }
                    ]
                },
                {
                    label: "emjacr2.azurecr.io",
                    children: [
                        { label: "docker-django-webapp-linux:cj8", description: "Up 8 minutes" }
                    ]
                },
                {
                    label: "mcr.microsoft.com",
                    children: [
                        { label: "dotnet/core/sdk:latest", description: "Up 8 minutes (Paused)" }
                    ]
                }
            ]);
    });

    test('GroupBy CreatedTime', async () => {
        await validateContainersTree(
            {
                groupBy: 'CreatedTime',
                label: 'ContainerName',
                description: []
            },
            [
                {
                    label: "a day ago",
                    children: [
                        { label: "vigorous_booth" }
                    ]
                },
                {
                    label: "2 days ago",
                    children: [
                        { label: "elegant_knuth" }
                    ]
                },
                {
                    label: "3 days ago",
                    children: [
                        { label: "focused_cori" },
                    ]
                },
                {
                    label: "a month ago",
                    children: [
                        { label: "zealous_napier" },
                        { label: "admiring_leavitt" },
                        { label: "inspiring_brattain" },
                    ]
                },
                {
                    label: "3 months ago",
                    children: [
                        { label: "elegant_mendel" },
                    ]
                },
                {
                    label: "a year ago",
                    children: [
                        { label: "devtest" },
                    ]
                },
            ]);
    });

    test('GroupBy Tag', async () => {
        await validateContainersTree(
            {
                groupBy: 'Tag',
                label: 'Repository',
                description: ["CreatedTime"]
            },
            [
                {
                    label: "8.0",
                    children: [
                        { label: "node", description: "a day ago" }
                    ]
                },
                {
                    label: "cj8",
                    children: [
                        { label: "emjacr2.azurecr.io/docker-django-webapp-linux", description: "a month ago" }
                    ]
                },
                {
                    label: "latest",
                    children: [
                        { label: "registry", description: "2 days ago" },
                        { label: "mcr.microsoft.com/dotnet/core/sdk", description: "3 days ago" },
                        { label: "vsc-js1-6b97c65e88377ff89a4eab7bc81b694d", description: "a month ago" },
                        { label: "acr-build-helloworld-node", description: "a month ago" },
                        { label: "test", description: "3 months ago" },
                        { label: "nginx", description: "a year ago" }
                    ]
                }
            ]);
    });

    /**
     * This test verifies we maintain support for the "Attach Visual Studio Code" context menu item that the "Remote Containers" extension adds to our tree (specifically running containers)
     * https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers
     */
    test('Remote Containers - Attach Visual Studio Code', async () => {
        const containers: DockerContainerInfo[] = [
            {
                Id: "faeb6f02af06df748a0040476ba7c335fb8aaefd76f6ea14a76800faf0fa3910",
                Name: "elegant_knuth",
                Image: "registry:latest",
                ImageID: "sha256:f32a97de94e13d29835a19851acd6cbc7979d1d50f703725541e44bb89a1ce91",
                CreatedTime: generateCreatedTimeInMs(2),
                Ports: [
                    { "IP": "0.0.0.0", "PrivatePort": 5000, "PublicPort": 5000, "Type": "tcp" }
                ],
                State: "running",
                Status: "Up 6 minutes",
                showFiles: false
            },
        ];

        const expectedNodes = [
            { label: "registry:latest", description: "elegant_knuth - Up 6 minutes", children: [] },
        ];

        const actualNodes = await validateTree(ext.containersRoot, 'containers', { groupBy: 'None' }, { containers: containers }, expectedNodes);

        assert.equal(actualNodes[0].contextValue, 'runningContainer', 'Must have context value "runningContainer"');
        assert.equal((<any>actualNodes[0]).containerDesc.Id, 'faeb6f02af06df748a0040476ba7c335fb8aaefd76f6ea14a76800faf0fa3910', 'Must have property "containerDesc"');
    });
});

