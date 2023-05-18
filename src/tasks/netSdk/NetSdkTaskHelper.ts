/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import * as fse from 'fs-extra';
import * as os from 'os';
import { WorkspaceFolder } from "vscode";
import { vsDbgInstallBasePath } from "../../debugging/netcore/VsDbgHelper";
import { ext } from "../../extensionVariables";
import { RunContainerBindMount, Shell, composeArgs, withArg, withNamedArg } from "../../runtimes/docker";
import { getDockerOSType } from "../../utils/osUtils";
import { quickPickWorkspaceFolder } from "../../utils/quickPickWorkspaceFolder";
import { DockerContainerVolume } from "../DockerRunTaskDefinitionBase";
import { getMounts } from "../DockerRunTaskProvider";
import { defaultVsCodeLabels } from "../TaskDefinitionBase";
import { addVolumeWithoutConflicts } from "../TaskHelper";

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

export const netSdkBuildTaskSymbol = 'dotnet-sdk-build';
export const netSdkRunTaskSymbol = 'dotnet-sdk-run';

export class NetSdkTaskHelper {

    public async getNetSdkBuildCommand(context: IActionContext) {

        const configuration = 'Debug'; // intentionally default to Debug configuration for phase 1 of this feature
        const imageTag = 'dev'; // intentionally default to dev tag for phase 1 of this feature

        // {@link https://github.com/dotnet/sdk-container-builds/issues/141} this could change in the future
        const publishFlag = this.isWebApp ? '-p:PublishProfile=DefaultContainer' : '/t:PublishContainer';

        const folderName = await this.getFolderName(context);

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

    public async getNetSdkRunCommand(context: IActionContext): Promise<string> {
        const client = await ext.runtimeManager.getClient();
        const folderName = await this.getFolderName(context);

        const command = await client.runContainer({
            detached: true,
            publishAllPorts: true,
            name: folderName.name,
            environmentVariables: {},
            removeOnExit: true,
            imageRef: `${folderName.name}:dev`,
            labels: defaultVsCodeLabels,
            mounts: await this.getMounts(),
        });

        const quotedArgs = Shell.getShellOrDefault().quote(command.args);
        const commandLine = [client.commandName, ...quotedArgs].join(' ');

        return commandLine;
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

    private async getFolderName(context: IActionContext): Promise<WorkspaceFolder> {
        return await quickPickWorkspaceFolder(
            context,
            `Unable to determine task scope to execute task ${netSdkBuildTaskSymbol}. Please open a workspace folder.`
        );
    }

    private async getMounts(): Promise<RunContainerBindMount[] | undefined> {
        const volumes: DockerContainerVolume[] = [];
        const isLinux = await getDockerOSType() === 'linux';

        const debuggerVolume: DockerContainerVolume = {
            localPath: vsDbgInstallBasePath,
            containerPath: isLinux ? 'C:\\remote_debugger' : '/remote_debugger',
            permissions: 'ro'
        };

        addVolumeWithoutConflicts(volumes, debuggerVolume);
        return getMounts(volumes);
    }
}

export const netTaskHelper = new NetSdkTaskHelper();

