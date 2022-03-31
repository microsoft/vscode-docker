/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { CommandTemplate, selectCommandTemplate } from '../../commands/selectCommandTemplate';
import { ContextType, DockerContext, isNewContextType } from '../../docker/Contexts';
import { ext } from '../../extensionVariables';

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
                    // Unconstrained default
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
                    // Unconstrained default
                    label: 'fail2',
                    template: 'fail',
                },
            ],
            [DefaultPickIndex],
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
                    // Unconstrained default
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
                    // Unconstrained default
                    label: 'fail3',
                    template: 'fail',
                },
            ],
            [DefaultPickIndex],
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
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
                {
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
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
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
    });

    test("One constrained from defaults (contextTypes)", async () => {
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
                    // *Satisfied constraint (contextTypes + match) default
                    label: 'test',
                    template: 'test',
                    match: 'test',
                    contextTypes: ['moby'],
                },
                {
                    // Unconstrained default
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

    test("Two constrained from defaults", async () => {
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
                    // *Satisfied constraint (contextTypes + match) default
                    label: 'test',
                    template: 'test',
                    match: 'test',
                    contextTypes: ['moby'],
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
            'moby',
            ['test']
        );

        assert.equal(result.command, 'test', 'Incorrect command selected');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'true', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'true', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.currentContextType, 'moby', 'Wrong value for currentContextType');
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
                {
                    // Unsatisfied constraint (contextTypes)
                    label: 'fail2',
                    template: 'fail',
                    contextTypes: ['aci'],
                },
            ],
            [
                {
                    // Unsatisfied constraint (match) default
                    label: 'fail3',
                    template: 'fail',
                    match: 'fail',
                    contextTypes: ['moby'],
                },
                {
                    // Unsatisfied constraint (contextTypes) default
                    label: 'fail4',
                    template: 'fail',
                    contextTypes: ['aci']
                },
                {
                    // *Unconstrained default
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

    test("Two unconstrained from defaults", async () => {
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
                    // Unsatisfied constraint (match) default
                    label: 'fail3',
                    template: 'fail',
                    match: 'fail',
                    contextTypes: ['moby'],
                },
                {
                    // Unsatisfied constraint (contextTypes) default
                    label: 'fail4',
                    template: 'fail',
                    contextTypes: ['aci']
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
                    // Unconstrained default
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
                    // *Unconstrained default
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
                    // Unconstrained default
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
                    // Unconstrained default
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
        assert.equal(isNewContextType('abc' as ContextType), true, 'Incorrect context type identification');
        assert.equal(result.context.telemetry.properties.isDefaultCommand, 'false', 'Wrong value for isDefaultCommand');
        assert.equal(result.context.telemetry.properties.isCommandRegexMatched, 'false', 'Wrong value for isCommandRegexMatched');
        assert.equal(result.context.telemetry.properties.commandContextType, '[]', 'Wrong value for commandContextType');
        assert.equal(result.context.telemetry.properties.currentContextType, 'abc', 'Wrong value for currentContextType');
    });
});

async function runWithCommandSetting(
    userTemplates: CommandTemplate[] | string,
    overriddenDefaultTemplates: CommandTemplate[],
    pickInputs: number[],
    contextType: string,
    matchContext: string[]): Promise<{ command: string, context: IActionContext }> {

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
            return Promise.resolve(contextType as ContextType);
        },

        getDockerCommand: () => {
            return 'docker';
        },

        getComposeCommand: async () => {
            return Promise.resolve('docker-compose');
        }
    };

    try {
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

        const cmdResult = await selectCommandTemplate(tempContext, 'build', matchContext, undefined, {}, settingsGetter, picker);

        if (pickInputs.length !== 0) {
            // selectCommandTemplate never asked for an input we have (fail)
            assert.fail('Unexpected leftover inputs!');
        }

        return {
            command: cmdResult,
            context: tempContext,
        };
    } finally {
        ext.dockerContextManager = oldContextManager;
    }
}
