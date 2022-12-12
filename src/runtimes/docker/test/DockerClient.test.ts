/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as crypto from 'crypto';
import { describe, it } from 'mocha';
import { ShellQuoting } from 'vscode';

import {
    DockerClient,
} from '../clients/DockerClient/DockerClient';
import { BuildImageCommandOptions, RunContainerCommandOptions } from '../contracts/ContainerClient';
import { escaped } from '../utils/commandLineBuilder';
import { Bash, Powershell } from '../utils/spawnStreamAsync';

describe('DockerClient', () => {
    const client = new DockerClient();

    describe('#listImagesAsync()', () => {
        it('parses date formats', async () => {
            const commandResult = await client.listImages({});
            const results = await commandResult.parse(
                [
                    '{"Containers":"N/A","CreatedAt":"2021-06-08 08:07:21 +0100 BST","CreatedSince":"17 months ago","Digest":"\u003cnone\u003e","ID":"someid","Repository":"some/repository","SharedSize":"N/A","Size":"1MB","Tag":"sometag","UniqueSize":"N/A","VirtualSize":"1MB"}',
                    '{"Containers":"N/A","CreatedAt":"2021-06-08 08:07:21.000Z","CreatedSince":"17 months ago","Digest":"\u003cnone\u003e","ID":"otherid","Repository":"some/repository","SharedSize":"N/A","Size":"1MB","Tag":"sometag","UniqueSize":"N/A","VirtualSize":"1MB"}',
                ].join('\n'),
                false,
            );

            expect(results).to.have.lengthOf(2);
            expect(results[0]).to.have.property('createdAt');
            expect(results[0].createdAt.getDay()).to.not.be.NaN;
            expect(results[1]).to.have.property('createdAt');
            expect(results[1].createdAt.getDay()).to.not.be.NaN;
        });
    });

    describe('#buildImageAsync()', () => {
        it('handles default values', async () => {
            const path = crypto.randomBytes(60).toString('utf8');

            const commandResult = await client.buildImage({
                path,
            });

            expect(commandResult).to.have.a.property('command', 'docker');
            expect(commandResult).to.have.a.property('args').that.deep.equals(
                [
                    escaped('image'),
                    escaped('build'),
                    { value: path, quoting: ShellQuoting.Strong },
                ]);
        });
        it('handles pull=true', async () => {
            const commandResult = await client.buildImage({
                path: '.',
                pull: true,
            });

            expect(commandResult).to.have.property('args').with.lengthOf(4);
        });
        it('handles pull=false', async () => {
            const commandResult = await client.buildImage({
                path: '.',
                pull: false,
            });

            expect(commandResult).to.have.property('args').with.lengthOf(3);
        });
        it('handles file', async () => {
            const file = crypto.randomBytes(60).toString('utf8');

            const commandResult = await client.buildImage({
                path: '.',
                file,
            });

            expect(commandResult).to.have.property('args').that.deep.equals([
                escaped('image'),
                escaped('build'),
                escaped('--file'),
                { value: file, quoting: ShellQuoting.Strong },
                { value: '.', quoting: ShellQuoting.Strong },
            ]);
        });
    });
});

describe('DockerClient (unit)', () => {
    const client = new DockerClient();

    it('Should produce the expected lack of quoting/escaping customOptions', async () => {
        const options: BuildImageCommandOptions = {
            path: '.',
            customOptions: '--no-cache --progress plain'
        };

        const commandResponse = await client.buildImage(options);
        const pwshQuoted = new Powershell().quote(commandResponse.args);
        const bashQuoted = new Bash().quote(commandResponse.args);

        expect(pwshQuoted).to.deep.equal(['image', 'build', '--no-cache --progress plain', '\'.\'']);
        expect(bashQuoted).to.deep.equal(['image', 'build', '--no-cache --progress plain', '\'.\'']);
    });

    it('Should produce the expected lack of quoting/escaping a single string command', async () => {
        const options: RunContainerCommandOptions = {
            imageRef: 'someimage',
            command: 'sh -c "echo hello world"',
        };

        const commandResponse = await client.runContainer(options);
        const pwshQuoted = new Powershell().quote(commandResponse.args);
        const bashQuoted = new Bash().quote(commandResponse.args);

        expect(pwshQuoted).to.deep.equal(['container', 'run', 'someimage', 'sh -c "echo hello world"']);
        expect(bashQuoted).to.deep.equal(['container', 'run', 'someimage', 'sh -c "echo hello world"']);
    });

    it('Should produce the expected quoting/escaping of an array command', async () => {
        const options: RunContainerCommandOptions = {
            imageRef: 'someimage',
            command: ['sh', '-c', 'echo hello world'],
        };

        const commandResponse = await client.runContainer(options);
        const pwshQuoted = new Powershell().quote(commandResponse.args);
        const bashQuoted = new Bash().quote(commandResponse.args);

        expect(pwshQuoted).to.deep.equal(['container', 'run', 'someimage', 'sh', '-c', 'echo` hello` world']);
        expect(bashQuoted).to.deep.equal(['container', 'run', 'someimage', 'sh', '-c', 'echo\\ hello\\ world']);
    });
});
