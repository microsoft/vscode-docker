/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { runWithExtensionSettings } from '../runWithExtensionSettings';
import { CommandTemplate, selectCommandTemplate, defaultCommandTemplates, ext, DockerContext, isNewContextType } from '../../extension.bundle';
import { TestInput } from 'vscode-azureextensiondev';
import { IActionContext } from 'vscode-azureextensionui';
import { testUserInput } from '../global.test';
import assert = require('assert');

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
                    // Unconstrained hardcoded
                    label: 'fail3',
                    template: 'fail',
                },
                {
                    // Unconstrained hardcoded (value is test to assert isDefaultCommand == true)
                    // (If we try to choose here it will fail due to prompting unexpectedly)
                    label: 'fail4',
                    template: 'test',
                }
            ],
            [],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("One constrained from settings (contextTypes)", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // *Satisfied constraint (contextTypes + match)
                    label: 'test',
                    template: 'test',
                    match: 'test',
                    contextTypes: ['moby', 'aci'],
                },
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                    contextTypes: ['moby', 'aci'],
                },
                {
                    // Unconstrained
                    label: 'fail2',
                    template: 'fail',
                },
            ],
            [
                {
                    // Unconstrained hardcoded
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[moby, aci]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("Two constrained from settings", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // *Satisfied constraint (contextTypes)
                    label: 'test',
                    template: 'test',
                    contextTypes: ['moby'],
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
                    // Unconstrained hardcoded
                    label: 'fail2',
                    template: 'fail',
                },
            ],
            [TestInput.UseDefaultValue],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
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
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
                },
                {
                    // *Unconstrained
                    label: 'test',
                    template: 'test',
                },
            ],
            [
                {
                    // Unconstrained hardcoded
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
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
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
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
                    // Unconstrained hardcoded
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [TestInput.UseDefaultValue],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("One constrained from hardcoded (match)", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
                },
            ],
            [
                {
                    // *Satisfied constraint (match) hardcoded
                    label: 'test',
                    template: 'test',
                    match: 'test',
                },
                {
                    // Unconstrained hardcoded
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("One constrained from hardcoded (contextTypes)", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
                },
            ],
            [
                {
                    // *Satisfied constraint (contextTypes + match) hardcoded
                    label: 'test',
                    template: 'test',
                    match: 'test',
                    contextTypes: ['moby'],
                },
                {
                    // Unconstrained hardcoded
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[moby]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("Two constrained from hardcoded", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
                },
            ],
            [
                {
                    // *Satisfied constraint (contextTypes + match) hardcoded
                    label: 'test',
                    template: 'test',
                    match: 'test',
                    contextTypes: ['moby'],
                },
                {
                    // *Satisfied constraint (match) hardcoded
                    label: 'test2',
                    template: 'test',
                    match: 'test',
                },
                {
                    // Unconstrained hardcoded
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [TestInput.UseDefaultValue],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("One unconstrained from hardcoded", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
                },
            ],
            [
                {
                    // Unsatisfied constraint (match) hardcoded
                    label: 'fail3',
                    template: 'fail',
                    match: 'fail',
                    contextTypes: ['moby'],
                },
                {
                    // Unsatisfied constraint (contextTypes) hardcoded
                    label: 'fail4',
                    template: 'fail',
                    contextTypes: ['aci']
                },
                {
                    // *Unconstrained hardcoded
                    label: 'test',
                    template: 'test',
                },
            ],
            [],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("Two unconstrained from hardcoded", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // Unsatisfied constraint (match)
                    label: 'fail',
                    template: 'fail',
                    match: 'fail',
                },
                {
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
                },
            ],
            [
                {
                    // Unsatisfied constraint (match) hardcoded
                    label: 'fail3',
                    template: 'fail',
                    match: 'fail',
                    contextTypes: ['moby'],
                },
                {
                    // Unsatisfied constraint (contextTypes) hardcoded
                    label: 'fail4',
                    template: 'fail',
                    contextTypes: ['aci']
                },
                {
                    // *Unconstrained hardcoded
                    label: 'test',
                    template: 'test',
                },
                {
                    // *Unconstrained hardcoded
                    label: 'test2',
                    template: 'test',
                },
            ],
            [TestInput.UseDefaultValue],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("Setting is a string", async () => {
        const result = await runWithCommandSetting(
            // *String setting
            'test',
            [
                {
                    // Unconstrained hardcoded
                    label: 'fail',
                    template: 'fail',
                },
            ],
            [],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("Setting is falsy", async () => {
        const result = await runWithCommandSetting(
            [], // Falsy setting
            [
                {
                    // *Unconstrained hardcoded
                    label: 'test',
                    template: 'test',
                },
            ],
            [],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("Unknown context constrained", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // *Satisfied constraint (match)
                    label: 'test',
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
                    // Unconstrained hardcoded
                    label: 'fail2',
                    template: 'fail',
                },
            ],
            [],
            'abc',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'abc', 'Wrong value for currentContextType');
    });

    test("Unknown context unconstrained", async () => {
        const result = await runWithCommandSetting(
            [
                {
                    // *Unconstrained
                    label: 'test',
                    template: 'test',
                },
            ],
            [
                {
                    // Unconstrained hardcoded
                    label: 'fail',
                    template: 'fail',
                },
            ],
            [],
            'abc',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');

        // Quick aside: validate that the context manager thinks an unknown context is new
        assert.equal(isNewContextType('abc' as any), true, 'Incorrect context type identification');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'abc', 'Wrong value for currentContextType');
    });
});

async function runWithCommandSetting(
    settingsValues: CommandTemplate[] | string,
    hardcodedValues: CommandTemplate[],
    pickInputs: TestInput[],
    contextType: string,
    matchContext: string[]): Promise<{ command: string, context: IActionContext }> {

    const oldDefaultTemplates = defaultCommandTemplates['build'];
    defaultCommandTemplates['build'] = hardcodedValues;

    const oldContextManager = ext.dockerContextManager;
    ext.dockerContextManager = {
        onContextChanged: undefined,
        refresh: undefined,
        getContexts: undefined,
        inspect: undefined,
        use: undefined,
        remove: undefined,
        isNewCli: undefined,

        // Only getCurrentContext is called by selectCommandTemplate
        // From it, only Type is used
        getCurrentContext: async () => {
            return {
                ContextType: contextType,
            } as DockerContext;
        },

        getCurrentContextType: async () => {
            return Promise.resolve(<any>contextType);
        }
    };

    try {
        const tempContext: IActionContext = {
            telemetry: { properties: {}, measurements: {}, },
            errorHandling: { issueProperties: {}, },
            ui: undefined,
            valuesToMask: undefined,
        };

        const cmdResult: string = await runWithExtensionSettings({ 'commands.build': settingsValues }, async () => {
            return await testUserInput.runWithInputs(pickInputs, async () => {
                return await selectCommandTemplate(tempContext, 'build', matchContext, undefined, {});
            });
        });

        return {
            command: cmdResult,
            context: tempContext,
        };
    } finally {
        defaultCommandTemplates['build'] = oldDefaultTemplates;
        ext.dockerContextManager = oldContextManager;
    }
}
