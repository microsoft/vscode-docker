/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert = require('assert');
import { ImageNameInfo } from '../../../runtimes/docker';
import { NormalizedImageNameInfo } from '../../../tree/images/NormalizedImageNameInfo';

// The expected values for each of these test cases are in the methods below
// The order of the test cases must exactly match the order of the expected values
const testCases: ImageNameInfo[] = [
    {
        originalName: 'alpine',
        registry: undefined,
        image: 'alpine',
        tag: 'latest',
    },
    {
        originalName: 'myapp',
        registry: undefined,
        image: 'myapp',
        tag: 'latest',
    },
    {
        originalName: 'mynamespace/myapp',
        registry: undefined,
        image: 'mynamespace/myapp',
        tag: '1.0',
    },
    {
        originalName: 'mcr.microsoft.com/dotnet/runtime',
        registry: 'mcr.microsoft.com',
        image: 'dotnet/runtime',
        tag: 'latest',
    },
    {
        originalName: 'myregistry.contoso.com/someapp:5.0',
        registry: 'myregistry.contoso.com',
        image: 'someapp',
        tag: '5.0',
    },
    {
        originalName: 'myregistry.contoso.com/with/longer/namespace/someapp:5.0',
        registry: 'myregistry.contoso.com',
        image: 'with/longer/namespace/someapp',
        tag: '5.0',
    },
    {
        originalName: '<none>',
        registry: undefined,
        image: undefined,
        tag: undefined,
    },
    {
        originalName: 'alpine',
        registry: undefined,
        image: 'alpine',
        tag: undefined,
    }
];

suite('(unit) NormalizedImageNameInfo Tests', () => {

    suite(('normalizedImageName'), () => {
        const expected = [
            'alpine',
            'myapp',
            'mynamespace/myapp',
            'dotnet/runtime',
            'someapp',
            'with/longer/namespace/someapp',
            '<none>',
            'alpine',
        ];

        testPropertyAgainstExpectedValues('normalizedImageName', expected);
    });

    suite(('normalizedTag'), () => {
        const expected = [
            'latest',
            'latest',
            '1.0',
            'latest',
            '5.0',
            '5.0',
            '<none>',
            '<none>',
        ];

        testPropertyAgainstExpectedValues('normalizedTag', expected);
    });

    suite(('normalizedImageNameAndTag'), () => {
        const expected = [
            'alpine:latest',
            'myapp:latest',
            'mynamespace/myapp:1.0',
            'dotnet/runtime:latest',
            'someapp:5.0',
            'with/longer/namespace/someapp:5.0',
            '<none>',
            'alpine',
        ];

        testPropertyAgainstExpectedValues('normalizedImageNameAndTag', expected);
    });

    suite(('fullTag'), () => {
        const expected = [
            'alpine:latest',
            'myapp:latest',
            'mynamespace/myapp:1.0',
            'mcr.microsoft.com/dotnet/runtime:latest',
            'myregistry.contoso.com/someapp:5.0',
            'myregistry.contoso.com/with/longer/namespace/someapp:5.0',
            '<none>',
            'alpine',
        ];

        testPropertyAgainstExpectedValues('fullTag', expected);
    });

    suite(('normalizedNamespace'), () => {
        const expected = [
            'library',
            'library',
            'mynamespace',
            'dotnet',
            undefined,
            'with/longer/namespace',
            'library',
            'library'
        ];

        testPropertyAgainstExpectedValues('normalizedNamespace', expected);
    });

    suite(('normalizedRegistry'), () => {
        const expected = [
            'docker.io',
            'docker.io',
            'docker.io',
            'mcr.microsoft.com',
            'myregistry.contoso.com',
            'myregistry.contoso.com',
            'docker.io',
            'docker.io',
        ];

        testPropertyAgainstExpectedValues('normalizedRegistry', expected);
    });

    suite(('normalizedRegistryAndImageName'), () => {
        const expected = [
            'alpine',
            'myapp',
            'docker.io/mynamespace/myapp',
            'mcr.microsoft.com/dotnet/runtime',
            'myregistry.contoso.com/someapp',
            'myregistry.contoso.com/with/longer/namespace/someapp',
            '<none>',
            'alpine',
        ];

        testPropertyAgainstExpectedValues('normalizedRegistryAndImageName', expected);
    });
});

function testPropertyAgainstExpectedValues(property: string, expected: string[]): void {
    testCases.forEach((testCase, index) => {
        test(testCase.originalName, () => {
            const normalizedImageNameInfo = new NormalizedImageNameInfo(testCase);
            assert.strictEqual(normalizedImageNameInfo[property], expected[index]);
        });
    });
}
