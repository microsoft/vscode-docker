/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import { CancellationToken, ProviderResult, ShellExecution, Task, TaskProvider, TaskScope } from "vscode";
import { ext } from '../../extensionVariables';
import { Shell, composeArgs, getNativeArchitecture, withArg, withNamedArg } from "../../runtimes/docker";
import { getDockerOSType } from "../../utils/osUtils";
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';

const netSdkTelemetryName = 'dotnet-sdk-build';

export class NetCoreSdkBuildProvider implements TaskProvider {

    provideTasks(token: CancellationToken): ProviderResult<Task[]> {

        return callWithTelemetryAndErrorHandling(`${netSdkTelemetryName}-execute`, async (actionContext: IActionContext) => {
            actionContext.errorHandling.suppressDisplay = true; // Suppress display. VSCode already has a modal popup and we don't want focus taken away from Terminal window.
            actionContext.errorHandling.rethrow = true; // Rethrow to hit the try/catch outside this block.

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ext.activityMeasurementService.recordActivity('overallnoedit');

            const netSdkBuildCommandPromise = this.getNetSdkBuildCommand(actionContext);
            const netSdkBuildCommand = await netSdkBuildCommandPromise;
            return netSdkBuildCommandPromise.then(netSdkBuildCommand => {
                return [
                    new Task(
                        { type: 'dotnet-sdk-build' },
                        TaskScope.Workspace,
                        'debug',
                        'dotnet-sdk-build',
                        new ShellExecution(netSdkBuildCommand),
                    )
                ];
            });
        });

    }

    resolveTask(task: Task, token: CancellationToken): ProviderResult<Task> {
        return task;
    }

    async getNetSdkBuildCommand(context: IActionContext) {

        const configuration = 'Debug'; // intentionally default to Debug configuration for phase 1 of this feature
        const imageTag = 'dev'; // intentionally default to dev tag for phase 1 of this feature

        // {@link https://github.com/dotnet/sdk-container-builds/issues/141} this could change in the future
        const publishFlag = this.isWebApp ? '-p:PublishProfile=DefaultContainer' : '/t:PublishContainer';

        const folderName = await quickPickWorkspaceFolder(
            context,
            `Unable to determine task scope to execute task ${netSdkTelemetryName}. Please open a workspace folder.`
        );

        const args = composeArgs(
            withArg('dotnet', 'publish'),
            withNamedArg('-os', await getDockerOSType()),
            withNamedArg('-arch', getNativeArchitecture()), // TODO: change this to adhere to .NET Core SDK conventions
            withArg(publishFlag),
            withNamedArg('-c', configuration),
            withNamedArg('-p:ContainerImageName', folderName.name, { assignValue: true }),
            withNamedArg('-p:ContainerImageTag', imageTag, { assignValue: true }),
        )();

        // If there is a shell provider, apply its quoting, otherwise just flatten arguments into strings
        // const normalizedArgs: string[] = args.map(arg => typeof arg === 'string' ? arg : arg.value);
        const quotedArgs = Shell.getShellOrDefault().quote(args);
        return quotedArgs.join(' ');

    }

    private async isWebApp(): Promise<boolean> {
        const projectContents = await fse.readFile('${workspaceFolder}/dotnet.csproj');
        return /Sdk\s*=\s*"Microsoft\.NET\.Sdk\.Web"/ig.test(projectContents.toString());
    }

}
