/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { tryParseSize } from '../clients/DockerClientBase/tryParseSize';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

describe('tryParseSize tests', () => {
    it('Should parse falsy values correctly', () => {
        expect(tryParseSize(null)).to.be.undefined;
        expect(tryParseSize(undefined)).to.be.undefined;
    });

    it('Should parse n/a values correctly', () => {
        expect(tryParseSize('N/A')).to.be.undefined;
        expect(tryParseSize('n/a')).to.be.undefined;
    });

    it('Should parse invalid values correctly', () => {
        expect(tryParseSize('')).to.be.undefined;
        expect(tryParseSize('foo')).to.be.undefined;
    });

    it('Should parse numeric values correctly', () => {
        expect(tryParseSize(11223344)).to.equal(11223344);
        expect(tryParseSize(5)).to.equal(5);
        expect(tryParseSize(0)).to.equal(0);
        expect(tryParseSize(1.8)).to.equal(2); // Validate it rounds
    });

    it('Should parse unitless string values correctly', () => {
        expect(tryParseSize('11223344')).to.equal(11223344);
        expect(tryParseSize('5')).to.equal(5);
        expect(tryParseSize('0')).to.equal(0);
    });

    it('Should parse united string values correctly', () => {
        expect(tryParseSize('5 mb')).to.equal(5 * MB);
        expect(tryParseSize('10GB')).to.equal(10 * GB);
        expect(tryParseSize('2 KB')).to.equal(2 * KB);
    });

    it('Should parse floating-point string values correctly', () => {
        expect(tryParseSize('112233.44')).to.equal(112233); // Validate it rounds
        expect(tryParseSize('5.0 mb')).to.equal(5.0 * MB);
        expect(tryParseSize('10.2kB')).to.equal(Math.round(10.2 * KB)); // Validate it rounds, AFTER multiplication
        expect(tryParseSize('2.777 Gb')).to.equal(Math.round(2.777 * GB)); // Validate it rounds, AFTER multiplication
    });
});
