/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as crypto from 'crypto';
import { describe, it } from 'mocha';
import { ShellQuotedString, ShellQuoting } from 'vscode';

import { range } from '../utils/range';
import {
    escaped,
    quoted,
    withArg,
} from '../utils/commandLineBuilder';

describe('commandLineBuilder', () => {
    describe('#withArg()', () => {
        it('creates arg list if no initial args provided', () => {
            const arg = crypto.randomBytes(crypto.randomInt(20, 101)).toString('utf8');
            const args = withArg(quoted(arg))();

            expect(args).to.have.lengthOf(1);
            expect(args).to.deep.equal([quoted(arg)]);
        });
        it('creates arg list if empty initial args provided', () => {
            const arg = crypto.randomBytes(crypto.randomInt(20, 101)).toString('utf8');
            const args = withArg(arg)([]);

            expect(args).to.have.lengthOf(1);
            expect(args).to.deep.equal([escaped(arg)]);
        });
        it('appends to initial arg list', () => {
            const initialArgs = new Array<ShellQuotedString>({ value: 'first', quoting: ShellQuoting.Escape }, { value: 'second', quoting: ShellQuoting.Strong });
            const newArgsCount = crypto.randomInt(1, 5);
            const newArgs: Array<ShellQuotedString> = [...range(newArgsCount)].map(() => {
                return { value: crypto.randomBytes(crypto.randomInt(20, 101)).toString('utf8'), quoting: ShellQuoting.Weak };
            });
            const args = withArg(...newArgs)(initialArgs);

            expect(initialArgs).to.have.lengthOf(2);
            expect(args).to.have.lengthOf(2 + newArgsCount);
            expect(args).to.deep.equal([...initialArgs, ...newArgs]);
        });
        it("doesn't append empty args", () => {
            const initialArgs = new Array<ShellQuotedString>({ value: 'first', quoting: ShellQuoting.Escape }, { value: 'second', quoting: ShellQuoting.Strong });
            const newArgs = ['third', '', 'fifth'];
            const args = withArg(...newArgs)(initialArgs);

            expect(initialArgs).to.have.lengthOf(2);
            expect(args).to.have.lengthOf(4);
            expect(args).to.deep.equal([...initialArgs, escaped('third'), escaped('fifth')]);
        });
    });
});
