/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { CommandTemplate, selectCommandTemplate } from '../../commands/selectCommandTemplate';

const DefaultPickIndex = 0;

suite("(unit) selectCommandTemplate", () => {
    test("One constrained from settings (match)", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // *Satisfied constraint (match)
                    label: 'test',
                    template: 'test',
                    match: 'test',
                },
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // Unconstrained
                    label: 'fail2',
                    template: 'fail',
                },
            ],
            [
                {
                    // Unconstrained default
                    label: 'fail3',
                    template: 'fail',
                },
                {
                    // Unconstrained default (value is test to assert isDefaultCommand == true)
                    // (If we try to choose here it will fail due to prompting unexpectedly)
                    label: 'fail4',
                    template: 'test',
                }
            ],
            [],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
    });

    test("Two constrained from settings", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // *Satisfied constraint (match)
                    label: 'test',
                    template: 'test',
                    match: 'test',
                },
                {
                    // *Satisfied constraint (match)
                    label: 'test2',
                    template: 'test',
                    match: 'test',
                },
                {
                    // Unconstrained
                    label: 'fail',
                    template: 'fail',
                },
            ],
            [
                {
                    // Unconstrained default
                    label: 'fail2',
                    template: 'fail',
                },
            ],
            [DefaultPickIndex],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
    });

    test("One unconstrained from settings", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // *Unconstrained
                    label: 'test',
                    template: 'test',
                },
            ],
            [
                {
                    // Unconstrained default
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
    });

    test("Two unconstrained from settings", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // *Unconstrained
                    label: 'test',
                    template: 'test',
                },
                {
                    // *Unconstrained
                    label: 'test2',
                    template: 'test',
                },
            ],
            [
                {
                    // Unconstrained default
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [DefaultPickIndex],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
    });

    test("One constrained from defaults (match)", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
            ],
            [
                {
                    // *Satisfied constraint (match) default
                    label: 'test',
                    template: 'test',
                    match: 'test',
                },
                {
                    // Unconstrained default
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
    });

    test("Two constrained from defaults", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
            ],
            [
                {
                    // *Satisfied constraint (match) default
                    label: 'test',
                    template: 'test',
                    match: 'test',
                },
                {
                    // *Satisfied constraint (match) default
                    label: 'test2',
                    template: 'test',
                    match: 'test',
                },
                {
                    // Unconstrained default
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [DefaultPickIndex],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
    });

    test("One unconstrained from defaults", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
            ],
            [
                {
                    // Unsatisfied constraint (match) default
                    label: 'fail3',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // *Unconstrained default
                    label: 'test',
                    template: 'test',
                },
            ],
            [],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
    });

    test("Two unconstrained from defaults", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
            ],
            [
                {
                    // Unsatisfied constraint (match) default
                    label: 'fail3',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // *Unconstrained default
                    label: 'test',
                    template: 'test',
                },
                {
                    // *Unconstrained default
                    label: 'test2',
                    template: 'test',
                },
            ],
            [DefaultPickIndex],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
    });

    test("Setting is a string", async () => {
        const result = await runWithCommandSetting(
            // *String setting
            'test',
            [
                {
                    // Unconstrained default
                    label: 'fail',
                    template: 'fail',
                },
            ],
            [],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
    });

    test("Setting is falsy", async () => {
        const result = await runWithCommandSetting(
            [], // Falsy setting
            [
                {
                    // *Unconstrained default
                    label: 'test',
                    template: 'test',
                },
            ],
            [],
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
    });
});

async function runWithCommandSetting(
    userTemplates: CommandTemplate[] | string,
    overriddenDefaultTemplates: CommandTemplate[],
    pickInputs: number[],
    matchContext: string[]): Promise<{ command: string, context: IActionContext }> {

    const tempContext: IActionContext = {
        telemetry: { properties: {}, measurements: {}, },
        errorHandling: { issueProperties: {}, },
        ui: undefined,
        valuesToMask: undefined,
    };

    const picker = (items: IAzureQuickPickItem<CommandTemplate>[]) => {
        if (pickInputs.length === 0) {
            // selectCommandTemplate asked for user input, but we have none left to give it (fail)
            assert.fail('Received an unexpected request for input!');
        }

        return Promise.resolve(items[pickInputs.shift()]);
    };

    const settingsGetter = () => {
        return { globalValue: userTemplates, defaultValue: overriddenDefaultTemplates };
    };

    const cmdResult = await selectCommandTemplate(tempContext, 'build', matchContext, undefined, {}, picker, settingsGetter);

    if (pickInputs.length !== 0) {
        // selectCommandTemplate never asked for an input we have (fail)
        assert.fail('Unexpected leftover inputs!');
    }

    return {
        command: cmdResult.command,
        context: tempContext,
    };
}
