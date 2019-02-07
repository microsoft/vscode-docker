/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { getImageLabel } from '../extension.bundle';
import { date } from 'azure-storage';

function testGetImageLabelTruncated(fullTag: string, labelTemplate: string, truncateLongRegistryPaths: boolean, truncateMaxLength: number, expected: string): void {
    test(`${String(fullTag)}: "${labelTemplate}"/${truncateLongRegistryPaths}/${truncateMaxLength}`, () => {
        let label = getImageLabel(fullTag, <Docker.ImageDesc>{}, labelTemplate, { truncateLongRegistryPaths, truncateMaxLength });
        assert.equal(label, expected);
    });
}

function testGetImageLabel(fullTag: string, labelTemplate: string, expected: string): void {
    test(`${String(fullTag)}: "${labelTemplate}", no truncation`, () => {
        let s2 = getImageLabel(fullTag, <Docker.ImageDesc>{}, labelTemplate, { truncateLongRegistryPaths: false, truncateMaxLength: 1 });
        assert.equal(s2, expected);
    });
}

suite('getImageLabel: full tag truncated', () => {
    testGetImageLabelTruncated('', '{fullTag}', false, 0, '');
    testGetImageLabelTruncated('', '{fullTag}', false, 1, '');
    testGetImageLabelTruncated('', '{fullTag}', true, 0, '');
    testGetImageLabelTruncated('', '{fullTag}', true, 1, '');

    testGetImageLabelTruncated('a', '{fullTag}', false, 1, 'a');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', false, 0, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', false, 1, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', false, 25, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', false, 90, 'abcdefghijklmnopqrstuvwxyz');

    // No registry - use full image name
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', true, 0, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', true, 1, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', true, 2, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', true, 10, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{fullTag}', true, 99, 'abcdefghijklmnopqrstuvwxyz');

    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', true, 10, 'abcdefghijklmnopqrstuvwxyz:latest');

    // Registry + one level
    testGetImageLabelTruncated('a/abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', true, 10, 'a/abcdefghijklmnopqrstuvwxyz:latest');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz:latest');

    // Registry + two or more levels
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest');

    // Real examples
    testGetImageLabelTruncated('registry.gitlab.com/sweatherford/hello-world/sub:latest', '{fullTag}', true, 7, 're...om/sweatherford/hello-world/sub:latest');
    testGetImageLabelTruncated('127.0.0.1:5443/registry:v2', '{fullTag}', true, 7, '12...43/registry:v2');
    testGetImageLabelTruncated('127.0.0.1:5443/hello-world/sub:latest', '{fullTag}', true, 7, '12...43/hello-world/sub:latest');
    testGetImageLabelTruncated('127.0.0.1:5443/hello-world/sub:latest', '{fullTag}', true, 7, '12...43/hello-world/sub:latest');
});

suite('getImageLabel: repository truncated', () => {
    testGetImageLabelTruncated('', '{repository}', false, 0, '');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{repository}', false, 90, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz', '{repository}', true, 99, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz:latest', '{repository}', true, 10, 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('a/abcdefghijklmnopqrstuvwxyz:latest', '{repository}', true, 10, 'a/abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repository}', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repository}', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repository}', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz');
    testGetImageLabelTruncated('registry.gitlab.com/sweatherford/hello-world/sub:latest', '{repository}', true, 7, 're...om/sweatherford/hello-world/sub');
    testGetImageLabelTruncated('127.0.0.1:5443/registry:v2', '{fullTag}', true, 7, '12...43/registry:v2');
    testGetImageLabelTruncated('127.0.0.1:5443/hello-world/sub:latest', '{fullTag}', true, 7, '12...43/hello-world/sub:latest');
    testGetImageLabelTruncated('127.0.0.1:5443/hello-world/sub:latest', '{fullTag}', true, 7, '12...43/hello-world/sub:latest');
});

suite('getImageLabel: fullTag', () => {
    testGetImageLabel('', '{fullTag}', '');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz', '{fullTag}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', 'abcdefghijklmnopqrstuvwxyz:latest');
    testGetImageLabel('a/abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', 'a/abcdefghijklmnopqrstuvwxyz:latest');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', 'abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', 'abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{fullTag}', 'abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest');
    testGetImageLabel('registry.gitlab.com/sweatherford/hello-world/sub:latest', '{fullTag}', 'registry.gitlab.com/sweatherford/hello-world/sub:latest');
    testGetImageLabel('127.0.0.1:5443/registry:v2', '{fullTag}', '127.0.0.1:5443/registry:v2');
    testGetImageLabel('127.0.0.1:5443/hello-world/sub:latest', '{fullTag}', '127.0.0.1:5443/hello-world/sub:latest');
});

suite('getImageLabel: repository', () => {
    testGetImageLabel('', '{repository}', '');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz', '{repository}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz:latest', '{repository}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('a/abcdefghijklmnopqrstuvwxyz:latest', '{repository}', 'a/abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repository}', 'abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repository}', 'abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repository}', 'abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('registry.gitlab.com/sweatherford/hello-world/sub:latest', '{repository}', 'registry.gitlab.com/sweatherford/hello-world/sub');
    testGetImageLabel('127.0.0.1:5443/registry:v2', '{repository}', '127.0.0.1:5443/registry');
    testGetImageLabel('127.0.0.1:5443/hello-world/sub:latest', '{repository}', '127.0.0.1:5443/hello-world/sub');
});

suite('getImageLabel: tag', () => {
    testGetImageLabel('', '{tag}', '');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz', '{tag}', '');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz:latest', '{tag}', 'latest');
    testGetImageLabel('a/abcdefghijklmnopqrstuvwxyz:latest', '{tag}', 'latest');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{tag}', 'latest');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{tag}', 'latest');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{tag}', 'latest');
    testGetImageLabel('registry.gitlab.com/sweatherford/hello-world/sub:latest', '{tag}', 'latest');
    testGetImageLabel('127.0.0.1:5443/registry:v2', '{tag}', 'v2');
    testGetImageLabel('127.0.0.1:5443/hello-world/sub:latest', '{tag}', 'latest');
});

suite('getImageLabel: createdSince', () => {
    let label = getImageLabel('hello', <Docker.ImageDesc>{ Created: date.daysFromNow(-1).valueOf() / 1000 }, '{createdSince}');
    assert.equal(label, 'a day ago');
});

suite('getImageLabel: shortImageId', () => {
    let label = getImageLabel('hello', <Docker.ImageDesc>{ Created: date.daysFromNow(-1).valueOf() / 1000, Id: 'sha256:d0eed8dad114db55d81c870efb8c148026da4a0f61dc7710c053da55f9604849' }, '{shortImageId}');
    assert.equal(label, 'd0eed8dad114');
});

suite('getImageLabel: repositoryName', () => {
    testGetImageLabel('', '{repositoryName}', '');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz', '{repositoryName}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz:latest', '{repositoryName}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('a/abcdefghijklmnopqrstuvwxyz:latest', '{repositoryName}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repositoryName}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repositoryName}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repositoryName}', 'abcdefghijklmnopqrstuvwxyz');
    testGetImageLabel('registry.gitlab.com/sweatherford/hello-world/sub:latest', '{repositoryName}', 'sub');
    testGetImageLabel('127.0.0.1:5443/registry:v2', '{repositoryName}', 'registry');
    testGetImageLabel('127.0.0.1:5443/hello-world/sub:latest', '{repositoryName}', 'sub');
});

suite('getImageLabel: mixed', () => {
    testGetImageLabel('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', '{repository} is {repositoryName} at {tag}', 'abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz is abcdefghijklmnopqrstuvwxyz at latest');
});
