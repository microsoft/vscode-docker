/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as semver from 'semver';
import * as vscode from 'vscode';
import { localize } from '../../../localize';
import { hasTask } from '../../../tasks/TaskHelper';
import { getValidImageNameFromPath } from '../../../utils/getValidImageName';
import { getNetCoreProjectInfo } from '../../../utils/netCoreUtils';
import { GatherInformationStep } from '../GatherInformationStep';
import { NetCoreScaffoldingWizardContext } from './NetCoreScaffoldingWizardContext';

// 1.23.9 contains the fix to not overwrite existing assets
const minCSharpVersionString = '1.23.9';

// All supported .NET versions no longer have "core" in the name
const aspNetBaseImage = 'mcr.microsoft.com/dotnet/aspnet';
const consoleNetBaseImage = 'mcr.microsoft.com/dotnet/runtime';
const netSdkImage = 'mcr.microsoft.com/dotnet/sdk';

const cSharpExtensionId = 'ms-dotnettools.csharp';
const cSharpConfigId = 'csharp';
const cSharpPromptSetting = 'suppressBuildAssetsNotification';
interface CSharpExtensionExports {
    // This is a subset of the C# extension's exports but contains all we care about
    initializationFinished(): Promise<void>;
}

export class NetCoreGatherInformationStep extends GatherInformationStep<NetCoreScaffoldingWizardContext> {
    private targetFramework: string;

    public async prompt(wizardContext: NetCoreScaffoldingWizardContext): Promise<void> {
        await this.ensureNetCoreBuildTasks(wizardContext);

        const projectInfo = await getNetCoreProjectInfo('GetProjectProperties', wizardContext.artifact);

        if (projectInfo.length < 2) {
            throw new Error(localize('vscode-docker.scaffold.netCoreGatherInformationStep.noProjectInfo', 'Unable to determine project info for \'{0}\'', wizardContext.artifact));
        }

        if (!wizardContext.netCoreAssemblyName) {
            wizardContext.netCoreAssemblyName = projectInfo[0]; // Line 1 is the assembly name including ".dll"
        }

        if (!wizardContext.netCoreRuntimeBaseImage || !wizardContext.netCoreSdkBaseImage) {
            this.targetFramework = projectInfo[1]; // Line 2 is the <TargetFramework> value, or first item from <TargetFrameworks>

            const regexMatch = /net(coreapp)?([\d\.]+)/i.exec(this.targetFramework);

            if (!regexMatch || regexMatch.length < 3) {
                throw new Error(localize('vscode-docker.scaffold.netCoreGatherInformationStep.noNetCoreVersion', 'Unable to determine .NET target framework version for \'{0}\'', wizardContext.artifact));
            }

            const [, , netCoreVersionString] = regexMatch;

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

    private async ensureNetCoreBuildTasks(wizardContext: NetCoreScaffoldingWizardContext): Promise<void> {
        let cSharpExtensionExports: CSharpExtensionExports;
        try {
            cSharpExtensionExports = await this.getMinimumCSharpExtensionExports();
        } catch (err) {
            // Suppress report issue and rethrow
            wizardContext.errorHandling.suppressReportIssue = true;
            throw err;
        }

        if (hasTask('build', wizardContext.workspaceFolder)) {
            // If a task named 'build' exists, and the C# extension with sufficient version is installed, we have everything necessary for running the service, so return
            return;
        }

        // Get the settings for the C# asset generation prompt...
        const cSharpPromptConfig = vscode.workspace.getConfiguration(cSharpConfigId);
        const oldSuppressSettings = cSharpPromptConfig.inspect<boolean>(cSharpPromptSetting);

        try {
            // Temporarily, we will turn *off* C#'s asset generation prompt, so that they don't show it when we're about to call it anyway
            await cSharpPromptConfig.update(cSharpPromptSetting, true, vscode.ConfigurationTarget.Global);

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: localize('vscode-docker.scaffold.netCoreGatherInformationStep.activatingCSharp', 'Activating C# extension...')
                },
                async () => {
                    // Await the C# extension initialization, which includes Omnisharp server init
                    await cSharpExtensionExports.initializationFinished();
                }
            );

            // It's potentially been a while since we've checked--e.g. the whole activation of the C# extension and Omnisharp--so check again for assets before force-creating them
            if (!hasTask('build', wizardContext.workspaceFolder)) {
                // Generate .NET assets
                await vscode.commands.executeCommand('dotnet.generateAssets');
            }
        } finally {
            // Restore the settings for the C# asset generation prompt to their previous value
            await cSharpPromptConfig.update(cSharpPromptSetting, oldSuppressSettings.globalValue, vscode.ConfigurationTarget.Global);
        }
    }

    private async getMinimumCSharpExtensionExports(): Promise<CSharpExtensionExports> {
        const minCSharpVersion = new semver.SemVer(minCSharpVersionString);
        const cSharpExtension: vscode.Extension<CSharpExtensionExports> | undefined = vscode.extensions.getExtension(cSharpExtensionId);
        const cSharpExtensionVersion: semver.SemVer | undefined = cSharpExtension ? new semver.SemVer((<{ version: string }>cSharpExtension.packageJSON).version) : undefined;

        if (!cSharpExtension || !cSharpExtensionVersion) {
            throw new Error(localize('vscode-docker.scaffold.netCoreGatherInformationStep.noCSharpExtension', 'Cannot generate Dockerfiles for a .NET project unless the C# extension is installed.'));
        } else if (cSharpExtensionVersion < minCSharpVersion) {
            throw new Error(localize('vscode-docker.scaffold.netCoreGatherInformationStep.badVersionCSharpExtension', 'Cannot generate Dockerfiles for a .NET project unless version {0} or higher of the C# extension is installed.', minCSharpVersionString));
        }

        return cSharpExtension.isActive ? await cSharpExtension.activate() : cSharpExtension.exports;
    }
}
