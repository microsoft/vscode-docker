import * as assert from 'assert';
import LineSplitter from '../../../debugging/coreclr/lineSplitter';

suite('debugging', () => {
    suite('coreclr', () => {
        suite('LineSplitter', () => {
            const testCase = (name: string, input: string, output: string[]) => {
                test(name, () => {
                    const lines = LineSplitter.splitLines(input);

                    assert.deepEqual(lines, output, 'The number or contents of the lines are not the same.');
                });
            };

            testCase('Empty string', '', []);
            testCase('Only LF', '\n', ['']);
            testCase('CR & LF', '\r\n', ['']);
            testCase('Multiple LFs', '\n\n', ['', '']);
            testCase('Multiple CR & LFs', '\r\n\r\n', ['', '']);
            testCase('Single line', 'line one', ['line one']);
            testCase('Leading LF', '\nline two', ['', 'line two']);
            testCase('Leading CR & LF', '\r\nline two', ['', 'line two']);
            testCase('Trailing LF', 'line one\n', ['line one']);
            testCase('Trailing CR & LF', 'line one\r\n', ['line one']);
            testCase('Multiple lines with LF', 'line one\nline two', ['line one', 'line two']);
            testCase('Multiple lines with CR & LF', 'line one\r\nline two', ['line one', 'line two']);
        });
    });
});

