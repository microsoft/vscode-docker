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
import { escaped } from '../utils/commandLineBuilder';

describe('DockerClient', () => {
    const client = new DockerClient();

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
