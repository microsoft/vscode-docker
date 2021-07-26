/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isHigherMinorVersion } from '../../commands/startPage/openStartPage';
import assert = require('assert');

suite("(unit) isHigherMinorVersion", () => {
    test("Major is higher", () => {
        assert(isHigherMinorVersion('1.2.3', '0.2.3'));
        assert(isHigherMinorVersion('1.2.3', '0.9.3'));

        assert(isHigherMinorVersion('2.2.3', '1.2.3-alpha'));
        assert(isHigherMinorVersion('2.2.3', '1.9.3'));
    });

    test("Minor is higher", () => {
        assert(isHigherMinorVersion('1.3.9', '1.2.3'));
        assert(isHigherMinorVersion('0.2.2', '0.1.9'));
    });

    test("Patch is higher", () => {
        assert(!isHigherMinorVersion('1.2.4', '1.2.3-alpha'));
        assert(!isHigherMinorVersion('0.2.4', '0.2.3'));
    });

    test("Equal", () => {
        assert(!isHigherMinorVersion('1.2.3', '1.2.3'));
        assert(!isHigherMinorVersion('0.2.3', '0.2.3'));
    });

    test("Major is lower", () => {
        assert(!isHigherMinorVersion('1.2.3', '2.2.3'));
        assert(!isHigherMinorVersion('0.2.3', '1.2.3'));

        assert(!isHigherMinorVersion('1.9.3', '2.2.3'));
        assert(!isHigherMinorVersion('0.9.3', '1.2.3'));
    });

    test("Minor is lower", () => {
        assert(!isHigherMinorVersion('1.2.3', '1.3.9'));
        assert(!isHigherMinorVersion('0.1.2', '0.1.9'));
    });

    test("Patch is lower", () => {
        assert(!isHigherMinorVersion('1.2.3', '1.2.4'));
        assert(!isHigherMinorVersion('0.1.2-alpha', '0.1.3'));
    });
});
