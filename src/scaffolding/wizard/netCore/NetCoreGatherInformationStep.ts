/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as semver from 'semver';
import { localize } from '../../../localize';
import { hasTask } from '../../../tasks/TaskHelper';
import { getValidImageNameFromPath } from '../../../utils/getValidImageName';
import { getNetCoreProjectInfo } from '../../../utils/netCoreUtils';
import { GatherInformationStep } from '../GatherInformationStep';
import { NetCoreScaffoldingWizardContext } from './NetCoreScaffoldingWizardContext';

// All supported .NET versions no longer have "core" in the name
const aspNetBaseImage = 'mcr.microsoft.com/dotnet/aspnet';
const consoleNetBaseImage = 'mcr.microsoft.com/dotnet/runtime';
const netSdkImage = 'mcr.microsoft.com/dotnet/sdk';

export class NetCoreGatherInformationStep extends GatherInformationStep<NetCoreScaffoldingWizardContext> {
    private targetFramework: string;

    public async prompt(wizardContext: NetCoreScaffoldingWizardContext): Promise<void> {
        // First, we need to validate that build tasks are created
        if (!hasTask('build', wizardContext.workspaceFolder)) {
            wizardContext.errorHandling.suppressReportIssue = true;
            throw new Error(localize('vscode-docker.scaffold.netCoreGatherInformationStep.prereqs', 'A build task is missing. Please generate a build task by running \'.NET: Generate Assets for Build and Debug\' before running this command.'));
        }

        const projectInfo = await getNetCoreProjectInfo('GetProjectProperties', wizardContext.artifact);

        if (projectInfo.length < 2) {
            throw new Error(localize('vscode-docker.scaffold.netCoreGatherInformationStep.noProjectInfo', 'Unable to determine project info for \'{0}\'', wizardContext.artifact));
        }

        if (!wizardContext.netCoreAssemblyName) {
            wizardContext.netCoreAssemblyName = projectInfo[0]; // Line 1 is the assembly name including ".dll"
        }

        if (!wizardContext.netCoreRuntimeBaseImage || !wizardContext.netCoreSdkBaseImage) {
            this.targetFramework = projectInfo[1]; // Line 2 is the <TargetFramework> value, or first item from <TargetFrameworks>

            const [, , netCoreVersionString] = /net(coreapp)?([\d\.]+)/i.exec(this.targetFramework);

            // semver.coerce tolerates version strings like "5.0" which is typically what is present in the .NET project file
            const netCoreVersion = semver.coerce(netCoreVersionString);

            wizardContext.netCoreRuntimeBaseImage = wizardContext.platform === '.NET: ASP.NET Core' ? `${aspNetBaseImage}:${netCoreVersion.major}.${netCoreVersion.minor}` : `${consoleNetBaseImage}:${netCoreVersion.major}.${netCoreVersion.minor}`;
            wizardContext.netCoreSdkBaseImage = `${netSdkImage}:${netCoreVersion.major}.${netCoreVersion.minor}`;
        }

        if (!wizardContext.serviceName) {
            wizardContext.serviceName = getValidImageNameFromPath(wizardContext.artifact);
        }

        if (!wizardContext.dockerfileDirectory) {
            // For .NET Core, the Dockerfile is always adjacent the artifact (csproj)
            wizardContext.dockerfileDirectory = path.dirname(wizardContext.artifact);
        }

        // No need to set dockerBuildContext because the superclass will set it to the proper value (the workspace root)

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: NetCoreScaffoldingWizardContext): boolean {
        return !wizardContext.netCoreAssemblyName || !wizardContext.netCoreRuntimeBaseImage || !wizardContext.netCoreSdkBaseImage || !wizardContext.serviceName || !wizardContext.dockerfileDirectory;
    }

    protected setTelemetry(wizardContext: NetCoreScaffoldingWizardContext): void {
        wizardContext.telemetry.properties.netCoreVersion = this.targetFramework;
    }
}
