/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { parseDockerRawPortString } from '../clients/DockerClientBase/parseDockerRawPortString';

describe('parseDockerRawPortString', () => {
    it('Should parse short-form ports', () => {
        const result = parseDockerRawPortString('1234/udp');

        expect(result).to.be.ok;
        expect(result?.containerPort).to.equal(1234);
        expect(result?.protocol).to.equal('udp');
    });

    it('Should parse long-form ports', () => {
        const result = parseDockerRawPortString('0.0.0.0:1234-> 5678/tcp');

        expect(result).to.be.ok;
        expect(result?.containerPort).to.equal(5678);
        expect(result?.protocol).to.equal('tcp');
        expect(result?.hostIp).to.equal('0.0.0.0');
        expect(result?.hostPort).to.equal(1234);
    });

    it('Should parse IPv6 long-form ports', () => {
        const result = parseDockerRawPortString('[1234:abcd::0]:2345-> 5678/tcp');

        expect(result).to.be.ok;
        expect(result?.containerPort).to.equal(5678);
        expect(result?.protocol).to.equal('tcp');
        expect(result?.hostIp).to.equal('[1234:abcd::0]');
        expect(result?.hostPort).to.equal(2345);
    });

    it('Should return undefined for invalid strings', () => {
        expect(parseDockerRawPortString('')).to.be.undefined;
        expect(parseDockerRawPortString('1234')).to.be.undefined;
    });

    it('Should return undefined for unknown protocols', () => {
        expect(parseDockerRawPortString('1234/abc')).to.be.undefined;
        expect(parseDockerRawPortString('0.0.0.0:1234-> 5678/abc')).to.be.undefined;
    });
});
