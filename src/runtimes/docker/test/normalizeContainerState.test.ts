/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { normalizeContainerState } from '../clients/DockerClientBase/DockerListContainerRecord';

describe('normalizeContainerState', () => {

    it('Should use the state if it is present', () => {
        expect(normalizeContainerState({ State: 'running', Status: 'Ignore' })).to.equal('running');
        expect(normalizeContainerState({ State: 'exited', Status: 'Ignore' })).to.equal('exited');
        expect(normalizeContainerState({ State: 'paused', Status: 'Ignore' })).to.equal('paused');
        expect(normalizeContainerState({ State: 'fake', Status: 'Ignore' })).to.equal('fake');
    });

    it('Should use the status if the state is not present', () => {
        expect(normalizeContainerState({ Status: 'Up 2 minutes (Paused)' })).to.equal('paused');

        expect(normalizeContainerState({ Status: 'Up 2 minutes' })).to.equal('running');

        expect(normalizeContainerState({ Status: 'Exited (0) 2 minutes ago' })).to.equal('exited');
        expect(normalizeContainerState({ Status: 'Terminated (1) 2 minutes ago' })).to.equal('exited');
        expect(normalizeContainerState({ Status: 'Dead' })).to.equal('exited');

        expect(normalizeContainerState({ Status: 'Created' })).to.equal('created');
    });

    it('Should return state unknown if the status is unrecognized', () => {
        expect(normalizeContainerState({ Status: 'Foo' })).to.equal('unknown');
    });
});

