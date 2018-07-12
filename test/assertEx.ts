import * as assert from 'assert';
import { parseError } from 'vscode-azureextensionui';

export function isTrue<T>(f: boolean, message?: string): void {
    assert.ok(f === true, message);
}

export function isFalse<T>(f: boolean, message?: string): void {
    assert.ok(f === false, message);
}

export function isTruthy<T>(f: any, message?: string): void {
    assert.ok(f, message);
}

export function isFalsey<T>(f: any, message?: string): void {
    assert.ok(!f, message);
}

function areUnorderedArraysEqual<T>(actual: T[], expected: T[]): { areEqual: boolean, message?: string } {
    actual = actual.slice();
    expected = expected.slice();
    actual.sort();
    expected.sort();

    let message = `Actual:   ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`

    if (!(actual.length === expected.length)) {
        return { areEqual: false, message };
    }

    for (let i = 0; i < actual.length; ++i) {
        if (actual[i] !== expected[i]) {
            return { areEqual: false, message };
        }
    }

    return { areEqual: true };
}

export function unorderedArraysEqual<T>(actual: T[], expected: T[], message?: string): void {
    let result = areUnorderedArraysEqual(actual, expected);
    assert(result.areEqual, `${message || "Unordered arrays are not equal"}\n${result.message}`);
}

export function notUnorderedArraysEqual<T>(actual: T[], expected: T[], message?: string): void {
    let result = areUnorderedArraysEqual(actual, expected);
    assert(!result.areEqual, `${message}\n${result.message}`);
}

export async function throwsOrRejectsAsync(block: () => Promise<any>, expected: {}, message?: string): Promise<void> {
    let error: any;
    try {
        await block();
    } catch (err) {
        error = err;
    }

    if (!error) {
        throw new Error(`Expected exception or rejection: ${parseError(expected).message}`);
    }
    for (let prop of Object.getOwnPropertyNames(expected)) {
        assert.equal(error[prop], expected[prop], `Error did not have the expected value for property '${prop}'`);
    }
}

suite("assertEx", () => {
    test("areUnorderedArraysEqual", () => {
        unorderedArraysEqual([], []);
        notUnorderedArraysEqual([], [1]);
        unorderedArraysEqual([1], [1]);
        notUnorderedArraysEqual([1], [1, 2]);
        unorderedArraysEqual([1, 2], [1, 2]);
        unorderedArraysEqual([1, 2], [2, 1]);
        notUnorderedArraysEqual([1, 2], [2, 1, 3]);
    });

    suite("throwsAsync", () => {
        test("throws", async () => {
            await throwsOrRejectsAsync(async () => {
                throw new Error("this is an error");
            },
                {
                    message: "this is an error"
                }
            );
        });

        test("rejects", async () => {
            await throwsOrRejectsAsync((): Promise<void> => {
                return Promise.reject(new Error("This is a rejection. Don't take it personally."));
            },
                {
                    message: "This is a rejection. Don't take it personally."
                }
            );
        });

        test("wrong message", async () => {
            let error: any;
            try {
                await throwsOrRejectsAsync((): Promise<void> => {
                    throw new Error("this is an error");
                },
                    {
                        message: "I'm expecting too much"
                    }
                );
            } catch (err) {
                error = err;
            }

            assert.equal(error && error.message, "Error did not have the expected value for property 'message'");
        });

        test("fails", async () => {
            let error: any;
            try {
                await throwsOrRejectsAsync((): Promise<void> => {
                    return Promise.resolve();
                },
                    {
                        message: "This is a rejection. Don't take it personally."
                    }
                );
            } catch (err) {
                error = err;
            }

            assert.equal(error && error.message, "Expected exception or rejection: This is a rejection. Don't take it personally.");
        })
    });
});
