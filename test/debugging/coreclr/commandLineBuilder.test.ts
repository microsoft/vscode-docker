import * as assert from 'assert';
import CommandLineBuilder from '../../../debugging/coreclr/commandLineBuilder';

suite('debugging/coreclr/CommandLineBuilder', () => {
    suite('create', () => {
        test('No args', () => assert.equal(CommandLineBuilder.create().build(), '', 'No arguments should return an empty command line.'));
    });

    suite('withArg', () => {
        test('With value', () => assert.equal(CommandLineBuilder.create().withArg('value').build(), 'value', 'The command line should contain the value.'));
        test('With undefined', () => assert.equal(CommandLineBuilder.create().withArg(undefined).build(), '', 'The command line should not contain the value.'));
    });

    suite('withArgFactory', () => {
        test('With factory', () => assert.equal(CommandLineBuilder.create().withArgFactory(() => 'value').build(), 'value', 'The command line should contain the value.'));
        test('With undefined', () => assert.equal(CommandLineBuilder.create().withArgFactory(undefined).build(), '', 'The command line should not contain the value.'));
    });

    suite('withArrayArgs', () => {
        test('With values', () => assert.equal(CommandLineBuilder.create().withArrayArgs('--arg', ['value1', 'value2']).build(), '--arg "value1" --arg "value2"', 'The command line should contain the values.'));
        test('With value', () => assert.equal(CommandLineBuilder.create().withArrayArgs('--arg', ['value1']).build(), '--arg "value1"', 'The command line should contain the value.'));
        test('With empty', () => assert.equal(CommandLineBuilder.create().withArrayArgs('--arg', []).build(), '', 'The command line should not contain the value.'));
        test('With undefined', () => assert.equal(CommandLineBuilder.create().withArrayArgs('--arg', undefined).build(), '', 'The command line should not contain the value.'));
    });

    suite('withFlagArg', () => {
        test('With true', () => assert.equal(CommandLineBuilder.create().withFlagArg('--arg', true).build(), '--arg', 'The command line should contain the value.'));
        test('With false', () => assert.equal(CommandLineBuilder.create().withFlagArg('--arg', false).build(), '', 'The command line should not contain the value.'));
        test('With undefined', () => assert.equal(CommandLineBuilder.create().withFlagArg('--arg', undefined).build(), '', 'The command line should not contain the value.'));
    });

    suite('withKeyValueArgs', () => {
        test('With values', () => assert.equal(CommandLineBuilder.create().withKeyValueArgs('--arg', { key1: 'value1', key2: 'value2' }).build(), '--arg "key1=value1" --arg "key2=value2"', 'The command line should contain the values.'));
        test('With value', () => assert.equal(CommandLineBuilder.create().withKeyValueArgs('--arg', { key1: 'value1' }).build(), '--arg "key1=value1"', 'The command line should contain the value.'));
        test('With empty', () => assert.equal(CommandLineBuilder.create().withKeyValueArgs('--arg', {}).build(), '', 'The command line should not contain the value.'));
        test('With undefined', () => assert.equal(CommandLineBuilder.create().withKeyValueArgs('--arg', undefined).build(), '', 'The command line should not contain the value.'));
    });

    suite('withNamedArg', () => {
        test('With value', () => assert.equal(CommandLineBuilder.create().withNamedArg('--arg', 'value').build(), '--arg "value"', 'The command line should contain the value.'));
        test('With undefined', () => assert.equal(CommandLineBuilder.create().withNamedArg('--arg', undefined).build(), '', 'The command line should not contain the value.'));
    });

    suite('withQuotedArg', () => {
        test('With value', () => assert.equal(CommandLineBuilder.create().withQuotedArg('value').build(), '"value"', 'The command line should contain the value.'));
        test('With undefined', () => assert.equal(CommandLineBuilder.create().withQuotedArg(undefined).build(), '', 'The command line should not contain the value.'));
    });
});
