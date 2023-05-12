/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Task } from "vscode";
import { composeArgs, getNativeArchitecture, withArg, withNamedArg } from "../../runtimes/docker";
import { cloneObject } from "../../utils/cloneObject";
import { getDockerOSType } from "../../utils/osUtils";
import { DockerTaskProvider } from "../DockerTaskProvider";
import { DockerTaskContext, DockerTaskExecutionContext, getDefaultImageName, throwIfCancellationRequested } from "../TaskHelper";
import { NetCoreSdkBuildDefinitionBase, NetCoreSdkBuildOptions } from "./NetCoreSdkBuildTaskDefinitionBase";

export interface NetCoreSdkBuildTask extends Task {
    definition: NetCoreSdkBuildDefinitionBase;
}

export class NetCoreSdkBuildProvider extends DockerTaskProvider {

    public constructor() { super('dotnet-sdk-build', undefined); }

    protected async executeTaskInternal(context: DockerTaskExecutionContext, task: Task): Promise<void> {
        const buildDefinition = cloneObject(task.definition);
        buildDefinition.netcoreSdkBuild = await this.getDotnetSdkBuildOptions(context, buildDefinition);

        throwIfCancellationRequested(context);

        const sdkBuildCommand = composeArgs(
            withArg('dotnet', 'publish'),
            withNamedArg('-os', buildDefinition.netcoreSdkBuild.platform?.os),
            withNamedArg('-arch', buildDefinition.netcoreSdkBuild.platform?.architecture),
            withNamedArg('-c', buildDefinition.netcoreSdkBuild.configuration),
            // TODO: add more options
        )();

        const commandLine = sdkBuildCommand.join(' ');
        await context.terminal.execAsyncInTerminal(
            commandLine,
            {
                folder: context.folder,
                token: context.cancellationToken,
            }
        );

        throwIfCancellationRequested(context);
    }

    public async getDotnetSdkBuildOptions(context: DockerTaskContext, buildDefinition: NetCoreSdkBuildDefinitionBase): Promise<NetCoreSdkBuildOptions> {

        const buildOptions = buildDefinition.netcoreSdkBuild || {};

        buildOptions.platform = {
            architecture: buildOptions.platform?.architecture || getNativeArchitecture(),
            os: buildOptions.platform?.os || await getDockerOSType()
        };

        buildOptions.configuration = 'Debug'; // intentionally default to Debug configuration for phase 1 of this feature
        buildOptions.tag = buildOptions.tag || getDefaultImageName(context.folder.name);

        return buildOptions;
    }
}
