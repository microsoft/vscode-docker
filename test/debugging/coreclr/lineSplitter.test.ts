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
            testCase('Only CR', '\n', ['']);
            testCase('Multiple CRs', '\n\n', ['', '']);
            testCase('Single line', 'line one', ['line one']);
            testCase('Leading CR', '\nline two', ['', 'line two']);
            testCase('Trailing CR', 'line one\n', ['line one']);
            testCase('Multiple lines', 'line one\nline two', ['line one', 'line two']);
        });
    });
});

