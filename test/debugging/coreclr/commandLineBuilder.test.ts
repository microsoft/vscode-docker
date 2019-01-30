/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as assert from 'assert';
import { CommandLineBuilder } from '../../../extension.bundle';

suite('debugging/coreclr/CommandLineBuilder', () => {
    function testBuilder(name: string, builderInitializer: (CommandLineBuilder) => CommandLineBuilder, expected: string, message: string) {
        test(name, () => {
            let builder = CommandLineBuilder.create();

            builder = builderInitializer(builder);

            assert.equal(builder.build(), expected, message);
        });
    }

    suite('create', () => {
        test('No args', () => assert.equal(CommandLineBuilder.create().build(), '', 'No arguments should return an empty command line.'));
        test('With args', () => assert.equal(CommandLineBuilder.create('--arg1', '--arg2').build(), '--arg1 --arg2', 'The command line should contain the arguments.'));
        test('With factory', () => assert.equal(CommandLineBuilder.create(() => '--arg1').build(), '--arg1', 'The command line should contain the argument.'));
        test('With undefined', () => assert.equal(CommandLineBuilder.create(undefined).build(), '', 'No arguments should return an empty command line.'));
    });

    suite('withArg', () => {
        testBuilder('With value', builder => builder.withArg('value'), 'value', 'The command line should contain the value.');
        testBuilder('With undefined', builder => builder.withArg(undefined), '', 'The command line should not contain the value.');
    });

    suite('withArgFactory', () => {
        testBuilder('With factory', builder => builder.withArgFactory(() => 'value'), 'value', 'The command line should contain the value.');
        testBuilder('With undefined', builder => builder.withArgFactory(undefined), '', 'The command line should not contain the value.');
    });

    suite('withArrayArgs', () => {
        testBuilder('With values', builder => builder.withArrayArgs('--arg', ['value1', 'value2']), '--arg "value1" --arg "value2"', 'The command line should contain the values.');
        testBuilder('With value', builder => builder.withArrayArgs('--arg', ['value1']), '--arg "value1"', 'The command line should contain the value.');
        testBuilder('With empty', builder => builder.withArrayArgs('--arg', []), '', 'The command line should not contain the value.');
        testBuilder('With undefined', builder => builder.withArrayArgs('--arg', undefined), '', 'The command line should not contain the value.');
    });

    suite('withFlagArg', () => {
        testBuilder('With true', builder => builder.withFlagArg('--arg', true), '--arg', 'The command line should contain the value.');
        testBuilder('With false', builder => builder.withFlagArg('--arg', false), '', 'The command line should not contain the value.');
        testBuilder('With undefined', builder => builder.withFlagArg('--arg', undefined), '', 'The command line should not contain the value.');
    });

    suite('withKeyValueArgs', () => {
        testBuilder('With values', builder => builder.withKeyValueArgs('--arg', { key1: 'value1', key2: 'value2' }), '--arg "key1=value1" --arg "key2=value2"', 'The command line should contain the values.');
        testBuilder('With value', builder => builder.withKeyValueArgs('--arg', { key1: 'value1' }), '--arg "key1=value1"', 'The command line should contain the value.');
        testBuilder('With empty', builder => builder.withKeyValueArgs('--arg', {}), '', 'The command line should not contain the value.');
        testBuilder('With undefined', builder => builder.withKeyValueArgs('--arg', undefined), '', 'The command line should not contain the value.');
    });

    suite('withNamedArg', () => {
        testBuilder('With value', builder => builder.withNamedArg('--arg', 'value'), '--arg "value"', 'The command line should contain the value.');
        testBuilder('With undefined', builder => builder.withNamedArg('--arg', undefined), '', 'The command line should not contain the value.');
    });

    suite('withQuotedArg', () => {
        testBuilder('With value', builder => builder.withQuotedArg('value'), '"value"', 'The command line should contain the value.');
        testBuilder('With undefined', builder => builder.withQuotedArg(undefined), '', 'The command line should not contain the value.');
    });
});
