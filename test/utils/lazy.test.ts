/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Lazy, AsyncLazy } from "../../extension.bundle";
import { delay } from '../../extension.bundle';

suite('(unit) Lazy tests', () => {
    suite('Lazy<T>', () => {
        test('Normal', async () => {
            let factoryCallCount = 0;
            const lazy: Lazy<boolean> = new Lazy(() => {
                factoryCallCount++;
                return true;
            });

            lazy.value;
            lazy.value;

            assert.equal(factoryCallCount, 1, 'Incorrect number of value factory calls.');
        });

        test('With lifetime', async () => {
            let factoryCallCount = 0;
            const lazy: Lazy<boolean> = new Lazy(() => {
                factoryCallCount++;
                return true;
            }, 5);

            lazy.value;
            lazy.value;

            assert.equal(factoryCallCount, 1, 'Incorrect number of value factory calls.');

            await delay(10);
            lazy.value;
            lazy.value;

            assert.equal(factoryCallCount, 2, 'Incorrect number of value factory calls.');
        });
    });

    suite('AsyncLazy<T>', () => {
        test('Normal', async () => {
            let factoryCallCount = 0;
            const lazy: AsyncLazy<boolean> = new AsyncLazy(async () => {
                factoryCallCount++;
                await delay(5);
                return true;
            });

            await lazy.getValue();
            await lazy.getValue();

            assert.equal(factoryCallCount, 1, 'Incorrect number of value factory calls.');
        });

        test('Simultaneous callers', async () => {
            let factoryCallCount = 0;
            const lazy: AsyncLazy<boolean> = new AsyncLazy(async () => {
                factoryCallCount++;
                await delay(5);
                return true;
            });

            const p1 = lazy.getValue();
            const p2 = lazy.getValue();
            await Promise.all([p1, p2]);

            assert.equal(factoryCallCount, 1, 'Incorrect number of value factory calls.');
        });

        test('With lifetime', async () => {
            let factoryCallCount = 0;
            const lazy: AsyncLazy<boolean> = new AsyncLazy(async () => {
                factoryCallCount++;
                await delay(5);
                return true;
            }, 10);

            await lazy.getValue();
            await lazy.getValue();

            assert.equal(factoryCallCount, 1, 'Incorrect number of value factory calls.');

            await delay(15);
            await lazy.getValue();
            await lazy.getValue();

            assert.equal(factoryCallCount, 2, 'Incorrect number of value factory calls.');
        });

        test('Simultaneous callers with lifetime', async () => {
            let factoryCallCount = 0;
            const lazy: AsyncLazy<boolean> = new AsyncLazy(async () => {
                factoryCallCount++;
                await delay(5);
                return true;
            }, 10);

            const p1 = lazy.getValue();
            const p2 = lazy.getValue();
            await Promise.all([p1, p2]);

            assert.equal(factoryCallCount, 1, 'Incorrect number of value factory calls.');

            await delay(15);
            const p3 = lazy.getValue();
            const p4 = lazy.getValue();
            await Promise.all([p3, p4]);

            assert.equal(factoryCallCount, 2, 'Incorrect number of value factory calls.');
        });
    });
});
