/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import * as os from 'os';
import { WorkspaceFolder, l10n } from "vscode";
import { vsDbgInstallBasePath } from "../../debugging/netcore/VsDbgHelper";
import { ext } from "../../extensionVariables";
import { RunContainerBindMount, Shell, composeArgs, withArg, withNamedArg } from "../../runtimes/docker";
import { getValidImageName } from "../../utils/getValidImageName";
import { getDockerOSType } from "../../utils/osUtils";
import { quickPickProjectFileItem } from "../../utils/quickPickFile";
import { quickPickWorkspaceFolder } from "../../utils/quickPickWorkspaceFolder";
import { DockerContainerVolume } from "../DockerRunTaskDefinitionBase";
import { defaultVsCodeLabels } from "../TaskDefinitionBase";
import { DockerTaskExecutionContext, addVolumeWithoutConflicts, getDefaultContainerName, getDefaultImageName, getMounts } from "../TaskHelper";
import { NetCoreTaskHelper } from "../netcore/NetCoreTaskHelper";

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

export const NetSdkRunTaskType = 'dotnet-container-sdk';
const NetSdkDefaultImageTag = 'dev'; // intentionally default to dev tag for phase 1 of this feature
const ErrMsgNoWorkplaceFolder = l10n.t(`Unable to determine task scope to execute task ${NetSdkRunTaskType}. Please open a workspace folder.`);

export class NetSdkTaskHelper {

    public async getNetSdkBuildCommand(context: DockerTaskExecutionContext): Promise<string> {

        const configuration = 'Debug'; // intentionally default to Debug configuration for phase 1 of this feature
        const projPath = await this.inferProjPath(context.actionContext, context.folder);

        // {@link https://github.com/dotnet/sdk-container-builds/issues/141} this could change in the future
        const publishFlag = NetCoreTaskHelper.isWebApp(projPath) ? '-p:PublishProfile=DefaultContainer' : '/t:PublishContainer';

        const folderName = await quickPickWorkspaceFolder(context.actionContext, ErrMsgNoWorkplaceFolder);

        const args = composeArgs(
            withArg('dotnet', 'publish'),
            withNamedArg('--os', await this.normalizeOsToRid()),
            withNamedArg('--arch', await this.normalizeArchitectureToRid()),
            withArg(publishFlag),
            withNamedArg('--configuration', configuration),
            withNamedArg('-p:ContainerImageName', getValidImageName(folderName.name), { assignValue: true }),
            withNamedArg('-p:ContainerImageTag', NetSdkDefaultImageTag, { assignValue: true })
        )();

        const quotedArgs = Shell.getShellOrDefault().quote(args);
        return quotedArgs.join(' ');
    }

    public async getNetSdkRunCommand(context: DockerTaskExecutionContext): Promise<string> {
        const client = await ext.runtimeManager.getClient();
        const folderName = await quickPickWorkspaceFolder(context.actionContext, ErrMsgNoWorkplaceFolder);

        const command = await client.runContainer({
            detached: true,
            publishAllPorts: true,
            name: getDefaultContainerName(folderName.name, NetSdkDefaultImageTag),
            environmentVariables: {},
            removeOnExit: true,
            imageRef: getDefaultImageName(folderName.name, NetSdkDefaultImageTag),
            labels: defaultVsCodeLabels,
            mounts: await this.getRemoteDebuggerMount(),
            exposes: [8080], // hard coded for now since the default port is 8080
            entrypoint: '/bin/sh'
        });

        const quotedArgs = Shell.getShellOrDefault().quote(command.args);
        const commandLine = [client.commandName, ...quotedArgs].join(' ');

        return commandLine;
    }

    public async inferProjPath(context: IActionContext, folder: WorkspaceFolder): Promise<string> {
        const noProjectFileErrMessage = l10n.t('No .csproj file could be found.');
        const item = await quickPickProjectFileItem(context, undefined, folder, noProjectFileErrMessage);
        return item.absoluteFilePath;
    }

    /**
     * This method normalizes the Docker OS type to match the .NET Core SDK conventions.
     * {@link https://learn.microsoft.com/en-us/dotnet/core/rid-catalog}
     */
    private async normalizeOsToRid(): Promise<'linux' | 'win'> {
        const dockerOsType = await getDockerOSType();
        return dockerOsType === 'windows' ? 'win' : 'linux';
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

    /**
     * This methods returns the mount for the remote debugger ONLY as the SDK built container will have
     * everything it needs to run the app already inside.
     */
    private async getRemoteDebuggerMount(): Promise<RunContainerBindMount[] | undefined> {
        const volumes: DockerContainerVolume[] = [];
        const isLinux = await getDockerOSType() === 'linux';

        const debuggerVolume: DockerContainerVolume = {
            localPath: vsDbgInstallBasePath,
            containerPath: isLinux ? '/remote_debugger' : 'C:\\remote_debugger',
            permissions: 'ro'
        };

        addVolumeWithoutConflicts(volumes, debuggerVolume);
        return getMounts(volumes);
    }
}

export const netTaskHelper = new NetSdkTaskHelper();

