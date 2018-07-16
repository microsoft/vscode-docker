/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { AsyncPool } from '../utils/asyncpool'
import { TIMEOUT } from 'dns';

suite("AsyncPool Tests", () => {

    test("Counting, Low Worker Count", async () => {
        let pool = new AsyncPool(2);
        let counter = 0;
        for (let i = 0; i < 100000; i++) {
            pool.addTask(async () => {
                counter++;
            });
        }
        await pool.runAll();
        assert.equal(counter, 100000);
    })

    test("Counting, High Worker Count", async () => {
        let pool = new AsyncPool(300);
        let counter = 0;
        for (let i = 0; i < 100000; i++) {
            pool.addTask(async () => {
                counter++;
            });
        }
        await pool.runAll();
        assert.equal(counter, 100000);
    })

    test("Counting, Resonable Worker Count", async () => {
        let pool = new AsyncPool(10);
        let counter = 0;
        for (let i = 0; i < 100000; i++) {
            pool.addTask(async () => {
                counter++;
            });
        }
        await pool.runAll();
        assert.equal(counter, 100000);
    })

    test("Timer, Random 1-10 ms tests", async () => {
        let pool = new AsyncPool(8);
        let counter = 0;
        for (let i = 0; i < 2000; i++) {
            pool.addTask(async () => {
                await sleep(Math.random() * 10);
                counter++;
            });
        }
        await pool.runAll();
        assert.equal(counter, 2000);
    }).timeout(7000);

    test("Timer, 100ms , High Worker Count", async () => {
        let pool = new AsyncPool(300);
        let counter = 0;
        for (let i = 0; i < 10000; i++) {
            pool.addTask(async () => {
                await sleep(100);
                counter++;
            });
        }
        await pool.runAll();
        assert.equal(counter, 10000);
    }).timeout(7000);

    test("Empty array", async () => {
        let pool = new AsyncPool(8);
        let arr = [];
        for (let i = 0; i < 100000; i++) {
            arr.push('testData' + i);
        }
        for (let i = 0; i < 100000; i++) {
            pool.addTask(async () => {
                arr.pop();
            });
        }
        await pool.runAll();
        assert.equal(0, arr.length);
    });

    test("Fill array", async () => {
        let pool = new AsyncPool(8);
        let arr: number[] = [];
        let arr2: number[] = [];
        for (let i = 0; i < 100000; i++) {
            arr.push(i);
        }
        for (let i = 0; i < 100000; i++) {
            pool.addTask(async () => {
                arr2.push(i);
            });
        }
        await pool.runAll();
        assert.equal(arr2.length, arr.length);
        arr2.sort((a, b) => {
            if (a > b) {
                return 1;
            } else if (a === b) {
                return 0;
            } else {
                return -1;
            }
        });
        assert.deepEqual(arr2, arr);
    });

    test("Error thrown appropiately", async () => {
        let pool = new AsyncPool(8);
        for (let i = 0; i < 100000; i++) {
            pool.addTask(async () => {
                //Empty decoy functions
            });
        }
        pool.addTask(async () => {
            throw 'fake Error'
        });
        let errorThrown: boolean = false;
        try {
            await pool.runAll();
        } catch (error) {
            errorThrown = true;
        }
        assert.equal(true, errorThrown);
    });
});

//Helpers
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
