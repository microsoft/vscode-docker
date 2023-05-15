/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as os from 'os';
import { CancellationToken, ProviderResult, ShellExecution, Task, TaskProvider, TaskScope } from "vscode";
import { ext } from '../../extensionVariables';
import { Shell, composeArgs, withArg, withNamedArg } from "../../runtimes/docker";
import { getDockerOSType } from "../../utils/osUtils";
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';

const netSdkTaskName = 'dotnet-sdk-build';

/**
 * Native architecture of the current machine in the RID format
 * {@link https://github.com/dotnet/runtime/blob/main/src/libraries/Microsoft.NETCore.Platforms/src/runtime.json}
 */
export type RidCpuArchitecture =
    | 'x64'
    | 'x86'
    | 'arm64'
    | 'arm'
    | 'ppc64le'
    | 'mips64'
    | 's390x'
    | string;

export class NetSdkBuildTaskProvider implements TaskProvider {

    provideTasks(token: CancellationToken): ProviderResult<Task[]> {

        return callWithTelemetryAndErrorHandling(`${netSdkTaskName}-execute`, async (actionContext: IActionContext) => {
            actionContext.errorHandling.suppressDisplay = true; // Suppress display. VSCode already has a modal popup and we don't want focus taken away from Terminal window.
            actionContext.errorHandling.rethrow = true; // Rethrow to hit the try/catch outside this block.

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ext.activityMeasurementService.recordActivity('overallnoedit');

            const netSdkBuildCommandPromise = this.getNetSdkBuildCommand(actionContext);
            return await netSdkBuildCommandPromise.then(netSdkBuildCommand => {
                return [
                    new Task(
                        { type: netSdkTaskName },
                        TaskScope.Workspace,
                        'debug',
                        netSdkTaskName,
                        new ShellExecution(netSdkBuildCommand),
                    )
                ];
            });
        });

    }

    resolveTask(task: Task, token: CancellationToken): ProviderResult<Task> {
        return task; // we can just return the task as-is
    }

    private async getNetSdkBuildCommand(context: IActionContext) {

        const configuration = 'Debug'; // intentionally default to Debug configuration for phase 1 of this feature
        const imageTag = 'dev'; // intentionally default to dev tag for phase 1 of this feature

        // {@link https://github.com/dotnet/sdk-container-builds/issues/141} this could change in the future
        const publishFlag = this.isWebApp ? '-p:PublishProfile=DefaultContainer' : '/t:PublishContainer';

        const folderName = await quickPickWorkspaceFolder(
            context,
            `Unable to determine task scope to execute task ${netSdkTaskName}. Please open a workspace folder.`
        );

        const args = composeArgs(
            withArg('dotnet', 'publish'),
            withNamedArg('--os', await this.normalizeOsToRid()),
            withNamedArg('--arch', await this.normalizeArchitectureToRid()),
            withArg(publishFlag),
            withNamedArg('--configuration', configuration),
            withNamedArg('-p:ContainerImageName', folderName.name, { assignValue: true }),
            withNamedArg('-p:ContainerImageTag', imageTag, { assignValue: true }),
        )();

        const quotedArgs = Shell.getShellOrDefault().quote(args);
        return quotedArgs.join(' ');
    }

    private async isWebApp(): Promise<boolean> {
        const projectContents = await fse.readFile('${workspaceFolder}/dotnet.csproj');
        return /Sdk\s*=\s*"Microsoft\.NET\.Sdk\.Web"/ig.test(projectContents.toString());
    }

    /**
     * This method normalizes the Docker OS type to match the .NET Core SDK conventions.
     * {@link https://learn.microsoft.com/en-us/dotnet/core/rid-catalog}
     */
    private async normalizeOsToRid(): Promise<'linux' | 'win'> {
        if (await getDockerOSType() === 'windows') {
            return 'win';
        }
        return 'linux';
    }

    /**
     * This method normalizes the native architecture to match the .NET Core SDK conventions.
     * {@link https://learn.microsoft.com/en-us/dotnet/core/rid-catalog}
     */
    private async normalizeArchitectureToRid(): Promise<RidCpuArchitecture> {
        const architecture = os.arch();
        switch (architecture) {
            case 'x32':
            case 'ia32':
                return 'x86';
            default:
                return architecture;
        }
    }


}
