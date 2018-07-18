import { unorderedArraysEqual, notUnorderedArraysEqual, throwsOrRejectsAsync } from "./assertEx";
import * as assert from "assert";

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
