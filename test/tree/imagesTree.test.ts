/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext, DockerImage } from '../../extension.bundle';
import { runWithExtensionSettings } from '../runWithExtensionSettings';
import { generateCreatedTimeInMs, ITestTreeItem, IValidateTreeOptions, validateTree } from './validateTree';

const testImages: DockerImage[] = [
    {
        Name: 'a',
        Id: 'sha256:b0648d86f18e6141a8bfa98d4d17d5180aa2699af7f27eac5491fd1f950f6f05',
        CreatedTime: generateCreatedTimeInMs(2),
        Size: 2 * 1024 * 1024,
    },
    {
        Name: 'abcdefghijklmnopqrstuvwxyz',
        Id: 'sha256:678090bb0827fecbee9eb0bbc65200022bbc09c91a8bf4acf136f5e633260a93',
        CreatedTime: generateCreatedTimeInMs(3),
        Size: 7 * 1024 * 1024,
    },
    {
        Name: 'abcdefghijklmnopqrstuvwxyz:version1.0.test',
        Id: 'sha256:0dbb0aabc7476292f98610d094a1bbc7f3012fd65cccc823e719a44267075bc7',
        CreatedTime: generateCreatedTimeInMs(4),
        Size: 3 * 1024 * 1024,
    },
    {
        Name: 'a.b/abcdefghijklmnopqrstuvwxyz:latest',
        Id: 'sha256:28bd20772f5203d07fdbfa38438f17cf720aaf01f7b53c205ac7e25b0795b718',
        CreatedTime: generateCreatedTimeInMs(5),
        Size: 15 * 1024 * 1024,
    },
    {
        Name: 'abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest',
        Id: 'sha256:38e8467493f68c24a78dafbe49587c07e78b0f84ec8cdc19a509ce3536f334fa',
        CreatedTime: generateCreatedTimeInMs(6),
        Size: 500 * 1024 * 1024,
    },
    {
        Name: 'abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest',
        Id: 'sha256:1e6d05ff19d567a103b3d134aa793841b51345a45fb59fd0287fb9d96e55c51b',
        CreatedTime: generateCreatedTimeInMs(7),
        Size: 8 * 1024 * 1024,
    },
    {
        Name: 'abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest',
        Id: 'sha256:16bba3882d727858afbb6dee098c5b5c9671bce8d347b995091f558afbdb18a5',
        CreatedTime: generateCreatedTimeInMs(8),
        Size: 9 * 1024 * 1024,
    },
    {
        Name: 'registry.gitlab.com/sweatherford/hello-world/sub:latest',
        Id: 'sha256:a3f7187fcd572b4c2065f96abd87b759b9ab9ed58bf7ea3755714bcc8795cf8a',
        CreatedTime: generateCreatedTimeInMs(9),
        Size: 12 * 1024 * 1024,
    },
    {
        Name: '127.0.0.1:5443/registry:v2',
        Id: 'sha256:ad8fe06eeca42a64aa28ca767b0f3fbe8713c087a6dcc66be949cefbe2131287',
        CreatedTime: generateCreatedTimeInMs(58),
        Size: 58 * 1024 * 1024,
    },
    {
        Name: '127.0.0.1:5443/hello-world/sub:latest',
        Id: 'sha256:c8b4e4c47a8e6cc5e9c4f9cc9858f83d1d3e79c6ab4d890f7fb190a599d29903',
        CreatedTime: generateCreatedTimeInMs(59),
        Size: 59 * 1024 * 1024,
    },
    {
        Name: 'hello-world:latest',
        Id: 'sha256:8a093bef2179f2c76b1b1d3254862e85ee6c26ee649fadad220e46527042f436',
        CreatedTime: generateCreatedTimeInMs(60),
        Size: 61 * 1024 * 1024,
    },
    {
        Name: 'hello-world:v1',
        Id: 'sha256:8a093bef2179f2c76b1b1d3254862e85ee6c26ee649fadad220e46527042f436',
        CreatedTime: generateCreatedTimeInMs(60),
        Size: 60 * 1024 * 1024,
    },
    {
        Name: 'namespace1/abc:v3',
        Id: 'sha256:d0eed8dad114db55d81c870efb8c148026da4a0f61dc7710c053da55f9604849',
        CreatedTime: generateCreatedTimeInMs(366),
        Size: 366 * 1024 * 1024,
    },
    {
        Name: 'localhost/abc:v4',
        Id: 'sha256:f61138f385d368484da055ecb085201ec06a524e92a10c64e6535bf6c32d15a4',
        CreatedTime: generateCreatedTimeInMs(367),
        Size: 111 * 1024 * 1024,
    },
    {
        Name: 'localhost:8080/abc',
        Id: 'sha256:e05f39ada67afbe24e68a22eeb9a45c59d0aab31f0a1585870a75893981fae75',
        CreatedTime: generateCreatedTimeInMs(368),
        Size: 150 * 1024 * 1024,
    },
];

interface IValidateImagesTreeOptions extends IValidateTreeOptions {
    truncate?: boolean;
    truncateLength?: number;
}

async function validateImagesTree(options: IValidateImagesTreeOptions, expectedNodes: ITestTreeItem[]): Promise<void> {
    await runWithExtensionSettings({ 'truncateLongRegistryPaths': options.truncate, 'truncateMaxLength': options.truncateLength }, async () => {
        await validateTree(ext.imagesRoot, 'images', options, { images: testImages }, expectedNodes);
    });
}

suite('Images Tree', async () => {
    test('Default Settings', async () => {
        await validateImagesTree(
            {},
            [
                {
                    label: "127.0.0.1:5443/hello-world/sub",
                    children: [
                        { label: "latest", description: "2 months ago" }
                    ]
                },
                {
                    label: "127.0.0.1:5443/registry",
                    children: [
                        { label: "v2", description: "2 months ago" }
                    ]
                },
                {
                    label: "a",
                    children: [
                        { label: "latest", description: "2 days ago" }
                    ]
                },
                {
                    label: "a.b/abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "5 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "6 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "8 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "7 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "3 days ago" },
                        { label: "version1.0.test", description: "4 days ago" }
                    ]
                },
                {
                    label: "hello-world",
                    children: [
                        { label: "latest", description: "2 months ago" },
                        {
                            label: "v1",
                            description: "2 months ago"
                        }
                    ]
                },
                {
                    label: "localhost:8080/abc",
                    children: [
                        { label: "latest", description: "a year ago" }
                    ]
                },
                {
                    label: "localhost/abc",
                    children: [
                        { label: "v4", description: "a year ago" }
                    ]
                },
                {
                    label: "namespace1/abc",
                    children: [
                        { label: "v3", description: "a year ago" }
                    ]
                },
                {
                    label: "registry.gitlab.com/sweatherford/hello-world/sub",
                    children: [
                        { label: "latest", description: "9 days ago" }
                    ]
                }
            ]);
    });

    test('Invalid Settings', async () => {
        await validateImagesTree(
            {
                description: <any>'test',
                groupBy: 'test3',
                label: 'test2',
                sortBy: <any>[]
            },
            [
                {
                    label: "127.0.0.1:5443/hello-world/sub",
                    children: [
                        { label: "latest", description: "2 months ago" }
                    ]
                },
                {
                    label: "127.0.0.1:5443/registry",
                    children: [
                        { label: "v2", description: "2 months ago" }
                    ]
                },
                {
                    label: "a",
                    children: [
                        { label: "latest", description: "2 days ago" }
                    ]
                },
                {
                    label: "a.b/abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "5 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "6 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "8 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "7 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvwxyz",
                    children: [
                        { label: "latest", description: "3 days ago" },
                        { label: "version1.0.test", description: "4 days ago" }
                    ]
                },
                {
                    label: "hello-world",
                    children: [
                        { label: "latest", description: "2 months ago" },
                        {
                            label: "v1",
                            description: "2 months ago"
                        }
                    ]
                },
                {
                    label: "localhost:8080/abc",
                    children: [
                        { label: "latest", description: "a year ago" }
                    ]
                },
                {
                    label: "localhost/abc",
                    children: [
                        { label: "v4", description: "a year ago" }
                    ]
                },
                {
                    label: "namespace1/abc",
                    children: [
                        { label: "v3", description: "a year ago" }
                    ]
                },
                {
                    label: "registry.gitlab.com/sweatherford/hello-world/sub",
                    children: [
                        { label: "latest", description: "9 days ago" }
                    ]
                }
            ]);
    });

    test('CreatedTime', async () => {
        await validateImagesTree(
            {
                label: 'CreatedTime',
                description: [],
                groupBy: 'None',
            },
            [
                { label: "2 days ago" },
                { label: "3 days ago" },
                { label: "4 days ago" },
                { label: "5 days ago" },
                { label: "6 days ago" },
                { label: "7 days ago" },
                { label: "8 days ago" },
                { label: "9 days ago" },
                { label: "2 months ago" },
                { label: "2 months ago" },
                { label: "2 months ago" },
                { label: "2 months ago" },
                { label: "a year ago" },
                { label: "a year ago" },
                { label: "a year ago" },
            ]);
    });

    test('FullTag', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
                { label: "127.0.0.1:5443/registry:v2" },
                { label: "127.0.0.1:5443/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost/abc:v4' },
                { label: 'localhost:8080/abc' },
            ]);
    });

    test('FullTag sortBy CreatedTime', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                sortBy: 'CreatedTime',
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
                { label: "127.0.0.1:5443/registry:v2" },
                { label: "127.0.0.1:5443/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost/abc:v4' },
                { label: 'localhost:8080/abc' },
            ]);
    });

    test('FullTag sortBy Label', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                sortBy: 'Label',
            },
            [
                { label: "127.0.0.1:5443/hello-world/sub:latest" },
                { label: "127.0.0.1:5443/registry:v2" },
                { label: "a" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'localhost:8080/abc' },
                { label: 'localhost/abc:v4' },
                { label: 'namespace1/abc:v3' },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
            ]);
    });

    test('FullTag sortBy Size', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                sortBy: 'Size',
            },
            [
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost:8080/abc' },
                { label: 'localhost/abc:v4' },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: "127.0.0.1:5443/hello-world/sub:latest" },
                { label: "127.0.0.1:5443/registry:v2" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a" },
            ]);
    });

    test('FullTag truncate false', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                truncate: false,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
                { label: "127.0.0.1:5443/registry:v2" },
                { label: "127.0.0.1:5443/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost/abc:v4' },
                { label: 'localhost:8080/abc' },
            ]);
    });

    test('FullTag truncate false 1', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                truncate: false,
                truncateLength: 1,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
                { label: "127.0.0.1:5443/registry:v2" },
                { label: "127.0.0.1:5443/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost/abc:v4' },
                { label: 'localhost:8080/abc' },
            ]);
    });

    test('FullTag truncate true', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                truncate: true,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "reg....com/sweatherford/hello-world/sub:latest" },
                { label: "127...5443/registry:v2" },
                { label: "127...5443/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost/abc:v4' },
                { label: 'loc...8080/abc' },
            ]);
    });

    test('FullTag truncate true 0', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                truncate: true,
                truncateLength: 0,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "reg....com/sweatherford/hello-world/sub:latest" },
                { label: "127...5443/registry:v2" },
                { label: "127...5443/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost/abc:v4' },
                { label: 'loc...8080/abc' },
            ]);
    });

    test('FullTag truncate true 1', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                truncate: true,
                truncateLength: 1,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "a/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "a/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "a/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "r/sweatherford/hello-world/sub:latest" },
                { label: "1/registry:v2" },
                { label: "1/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'l/abc:v4' },
                { label: 'l/abc' },
            ]);
    });

    test('FullTag truncate true 7', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                truncate: true,
                truncateLength: 7,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "ab...yz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "ab...yz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "ab...yz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "re...om/sweatherford/hello-world/sub:latest" },
                { label: "12...43/registry:v2" },
                { label: "12...43/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'lo...st/abc:v4' },
                { label: 'lo...80/abc' },
            ]);
    });

    test('FullTag truncate true 25', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                truncate: true,
                truncateLength: 25,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijk...qrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijk...qrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijk...qrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
                { label: "127.0.0.1:5443/registry:v2" },
                { label: "127.0.0.1:5443/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost/abc:v4' },
                { label: 'localhost:8080/abc' },
            ]);
    });

    test('FullTag truncate true 90', async () => {
        await validateImagesTree(
            {
                label: 'FullTag',
                description: [],
                groupBy: 'None',
                truncate: true,
                truncateLength: 90,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
                { label: "127.0.0.1:5443/registry:v2" },
                { label: "127.0.0.1:5443/hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'namespace1/abc:v3' },
                { label: 'localhost/abc:v4' },
                { label: 'localhost:8080/abc' },
            ]);
    });

    test('ImageId', async () => {
        await validateImagesTree(
            {
                label: 'ImageId',
                description: [],
                groupBy: 'None',
            },
            [
                { label: "b0648d86f18e" },
                { label: "678090bb0827" },
                { label: "0dbb0aabc747" },
                { label: "28bd20772f52" },
                { label: "38e8467493f6" },
                { label: "1e6d05ff19d5" },
                { label: "16bba3882d72" },
                { label: "a3f7187fcd57" },
                { label: "ad8fe06eeca4" },
                { label: "c8b4e4c47a8e" },
                { label: "8a093bef2179" },
                { label: "8a093bef2179" },
                { label: 'd0eed8dad114' },
                { label: 'f61138f385d3' },
                { label: 'e05f39ada67a' },
            ]);
    });

    test('Registry', async () => {
        await validateImagesTree(
            {
                label: 'Registry',
                description: [],
                groupBy: 'None',
            },
            [
                { label: "docker.io/library" },
                { label: "docker.io/library" },
                { label: "docker.io/library" },
                { label: "a.b" },
                { label: "abcdefghijklmnopqrstuvw.xyz" },
                { label: "abcdefghijklmnopqrstuvw.xyz" },
                { label: "abcdefghijklmnopqrstuvw.xyz" },
                { label: "registry.gitlab.com" },
                { label: "127.0.0.1:5443" },
                { label: "127.0.0.1:5443" },
                { label: "docker.io/library" },
                { label: "docker.io/library" },
                { label: "docker.io/namespace1" },
                { label: 'localhost' },
                { label: 'localhost:8080' },
            ]);
    });

    test('Registry truncate true', async () => {
        await validateImagesTree(
            {
                label: 'Registry',
                description: [],
                groupBy: 'None',
                truncate: true,
            },
            [
                { label: "doc...rary" },
                { label: "doc...rary" },
                { label: "doc...rary" },
                { label: "a.b" },
                { label: "abc....xyz" },
                { label: "abc....xyz" },
                { label: "abc....xyz" },
                { label: "reg....com" },
                { label: "127...5443" },
                { label: "127...5443" },
                { label: "doc...rary" },
                { label: "doc...rary" },
                { label: "doc...ace1" },
                { label: 'localhost' },
                { label: 'loc...8080' },
            ]);
    });

    test('Repository', async () => {
        await validateImagesTree(
            {
                label: 'Repository',
                description: [],
                groupBy: 'None',
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz" },
                { label: "registry.gitlab.com/sweatherford/hello-world/sub" },
                { label: "127.0.0.1:5443/registry" },
                { label: "127.0.0.1:5443/hello-world/sub" },
                { label: "hello-world" },
                { label: "hello-world" },
                { label: 'namespace1/abc' },
                { label: 'localhost/abc' },
                { label: 'localhost:8080/abc' },
            ]);
    });

    test('Repository truncate true', async () => {
        await validateImagesTree(
            {
                label: 'Repository',
                description: [],
                groupBy: 'None',
                truncate: true,
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "a.b/abcdefghijklmnopqrstuvwxyz" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz" },
                { label: "abc....xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz" },
                { label: "reg....com/sweatherford/hello-world/sub" },
                { label: "127...5443/registry" },
                { label: "127...5443/hello-world/sub" },
                { label: "hello-world" },
                { label: "hello-world" },
                { label: 'namespace1/abc' },
                { label: 'localhost/abc' },
                { label: 'loc...8080/abc' },
            ]);
    });

    test('RepositoryName', async () => {
        await validateImagesTree(
            {
                label: 'RepositoryName',
                description: [],
                groupBy: 'None',
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz" },
                { label: "sweatherford/hello-world/sub" },
                { label: "registry" },
                { label: "hello-world/sub" },
                { label: "hello-world" },
                { label: "hello-world" },
                { label: 'abc' },
                { label: 'abc' },
                { label: 'abc' },
            ]);
    });

    test('RepositoryNameAndTag', async () => {
        await validateImagesTree(
            {
                label: 'RepositoryNameAndTag',
                description: [],
                groupBy: 'None',
            },
            [
                { label: "a" },
                { label: "abcdefghijklmnopqrstuvwxyz" },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                { label: "abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                { label: "sweatherford/hello-world/sub:latest" },
                { label: "registry:v2" },
                { label: "hello-world/sub:latest" },
                { label: "hello-world:latest" },
                { label: "hello-world:v1" },
                { label: 'abc:v3' },
                { label: 'abc:v4' },
                { label: 'abc' },
            ]);
    });

    test('Tag', async () => {
        await validateImagesTree(
            {
                label: 'Tag',
                description: [],
                groupBy: 'None',
            },
            [
                { label: "latest" },
                { label: "latest" },
                { label: "version1.0.test" },
                { label: "latest" },
                { label: "latest" },
                { label: "latest" },
                { label: "latest" },
                { label: "latest" },
                { label: "v2" },
                { label: "latest" },
                { label: "latest" },
                { label: "v1" },
                { label: 'v3' },
                { label: 'v4' },
                { label: 'latest' },
            ]);
    });

    test('GroupBy Registry', async () => {
        await validateImagesTree(
            {
                groupBy: 'Registry',
                label: 'RepositoryNameAndTag'
            },
            [
                {
                    label: "127.0.0.1:5443",
                    children: [
                        { label: "registry:v2", description: "2 months ago" },
                        { label: "hello-world/sub:latest", description: "2 months ago" }
                    ]
                },
                {
                    label: "a.b",
                    children: [
                        { label: "abcdefghijklmnopqrstuvwxyz:latest", description: "5 days ago" }
                    ]
                },
                {
                    label: "abcdefghijklmnopqrstuvw.xyz",
                    children: [
                        { label: "abcdefghijklmnopqrstuvwxyz:latest", description: "6 days ago" },
                        { label: "abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest", description: "7 days ago" },
                        { label: "abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest", description: "8 days ago" }
                    ]
                },
                {
                    label: "docker.io/library",
                    children: [
                        { label: "a", description: "2 days ago" },
                        { label: "abcdefghijklmnopqrstuvwxyz", description: "3 days ago" },
                        { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test", description: "4 days ago" },
                        { label: "hello-world:latest", description: "2 months ago" },
                        { label: "hello-world:v1", description: "2 months ago" },
                    ]
                },
                {
                    label: "docker.io/namespace1",
                    children: [
                        { label: "abc:v3", description: "a year ago" }
                    ]
                },
                {
                    label: "localhost",
                    children: [
                        { label: "abc:v4", description: "a year ago" }
                    ]
                },
                {
                    label: "localhost:8080",
                    children: [
                        { label: "abc", description: "a year ago" }
                    ]
                },
                {
                    label: "registry.gitlab.com",
                    children: [
                        { label: "sweatherford/hello-world/sub:latest", description: "9 days ago" }
                    ]
                }
            ]);
    });

    test('GroupBy CreatedTime', async () => {
        await validateImagesTree(
            {
                groupBy: 'CreatedTime',
                label: 'FullTag',
                description: [],
            },
            [
                {
                    label: "2 days ago",
                    children: [
                        { label: "a" },
                    ]
                },
                {
                    label: "3 days ago",
                    children: [
                        { label: "abcdefghijklmnopqrstuvwxyz" },
                    ]
                },
                {
                    label: "4 days ago",
                    children: [
                        { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test" },
                    ]
                },
                {
                    label: "5 days ago",
                    children: [
                        { label: "a.b/abcdefghijklmnopqrstuvwxyz:latest" },
                    ]
                },
                {
                    label: "6 days ago",
                    children: [
                        { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                    ]
                },
                {
                    label: "7 days ago",
                    children: [
                        { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest" },
                    ]
                },
                {
                    label: "8 days ago",
                    children: [
                        { label: "abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest" },
                    ]
                },
                {
                    label: "9 days ago",
                    children: [
                        { label: "registry.gitlab.com/sweatherford/hello-world/sub:latest" },
                    ]
                },
                {
                    label: "2 months ago",
                    children: [
                        { label: "127.0.0.1:5443/registry:v2" },
                        { label: "127.0.0.1:5443/hello-world/sub:latest" },
                        { label: "hello-world:latest" },
                        { label: "hello-world:v1" },
                    ]
                },
                {
                    label: "a year ago",
                    children: [
                        { label: "namespace1/abc:v3" },
                        { label: "localhost/abc:v4" },
                        { label: "localhost:8080/abc" },
                    ]
                }
            ]);
    });

    test('Multiple descriptions', async () => {
        await validateImagesTree(
            {
                label: 'RepositoryNameAndTag',
                description: ['CreatedTime', 'Registry'],
                groupBy: 'None',
            },
            [
                { label: "a", description: '2 days ago - docker.io/library' },
                { label: "abcdefghijklmnopqrstuvwxyz", description: '3 days ago - docker.io/library' },
                { label: "abcdefghijklmnopqrstuvwxyz:version1.0.test", description: '4 days ago - docker.io/library' },
                { label: "abcdefghijklmnopqrstuvwxyz:latest", description: '5 days ago - a.b' },
                { label: "abcdefghijklmnopqrstuvwxyz:latest", description: '6 days ago - abcdefghijklmnopqrstuvw.xyz' },
                { label: "abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest", description: '7 days ago - abcdefghijklmnopqrstuvw.xyz' },
                { label: "abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvw.xyz/abcdefghijklmnopqrstuvwxyz:latest", description: '8 days ago - abcdefghijklmnopqrstuvw.xyz' },
                { label: "sweatherford/hello-world/sub:latest", description: '9 days ago - registry.gitlab.com' },
                { label: "registry:v2", description: '2 months ago - 127.0.0.1:5443' },
                { label: "hello-world/sub:latest", description: '2 months ago - 127.0.0.1:5443' },
                { label: "hello-world:latest", description: '2 months ago - docker.io/library' },
                { label: "hello-world:v1", description: '2 months ago - docker.io/library' },
                { label: 'abc:v3', description: 'a year ago - docker.io/namespace1' },
                { label: 'abc:v4', description: 'a year ago - localhost' },
                { label: 'abc', description: 'a year ago - localhost:8080' },
            ]);
    });
});

