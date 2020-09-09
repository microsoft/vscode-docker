/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SemVer } from 'semver';
import { localize } from '../../../localize';
import { hasTask } from '../../../tasks/TaskHelper';
import { getValidImageNameFromPath } from '../../../utils/getValidImageName';
import { getNetCoreProjectInfo } from '../../../utils/netCoreUtils';
import { GatherInformationStep } from '../GatherInformationStep';
import { NetCoreScaffoldingWizardContext } from './NetCoreScaffoldingWizardContext';

// .NET 5 and above
const aspNetBaseImage = 'mcr.microsoft.com/dotnet/aspnet';
const consoleNetBaseImage = 'mcr.microsoft.com/dotnet/runtime';
const netSdkImage = 'mcr.microsoft.com/dotnet/sdk';

// .NET Core 3.1 and below
// Note: this will work for .NET Core 2.2/2.1 (which are EOL), but not for <2.0 (which are way EOL)
const aspNetCoreBaseImage = 'mcr.microsoft.com/dotnet/core/aspnet';
const consoleNetCoreBaseImage = 'mcr.microsoft.com/dotnet/core/runtime';
const netCoreSdkImage = 'mcr.microsoft.com/dotnet/core/sdk';

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

            let netCoreVersion: SemVer;
            if (/^\d+\.\d+$/.test(netCoreVersionString)) {
                // SemVer requires a patch number in the version, so add it if the version matches e.g. 5.0
                netCoreVersion = new SemVer(netCoreVersionString + '.0');
            } else {
                netCoreVersion = new SemVer(netCoreVersionString)
            }

            if (netCoreVersion.major >= 5) {
                // .NET 5 or above
                wizardContext.netCoreRuntimeBaseImage = wizardContext.platform === '.NET: ASP.NET Core' ? `${aspNetBaseImage}:${netCoreVersionString}` : `${consoleNetBaseImage}:${netCoreVersionString}`;
                wizardContext.netCoreSdkBaseImage = `${netSdkImage}:${netCoreVersionString}`;
            } else {
                // .NET 3.1 or below
                wizardContext.netCoreRuntimeBaseImage = wizardContext.platform === '.NET: ASP.NET Core' ? `${aspNetCoreBaseImage}:${netCoreVersionString}` : `${consoleNetCoreBaseImage}:${netCoreVersionString}`;
                wizardContext.netCoreSdkBaseImage = `${netCoreSdkImage}:${netCoreVersionString}`;
            }
        }

        if (!wizardContext.serviceName) {
            wizardContext.serviceName = getValidImageNameFromPath(wizardContext.artifact);
        }

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: NetCoreScaffoldingWizardContext): boolean {
        return !wizardContext.netCoreAssemblyName || !wizardContext.netCoreRuntimeBaseImage || !wizardContext.netCoreSdkBaseImage || !wizardContext.serviceName;
    }

    protected setTelemetry(wizardContext: NetCoreScaffoldingWizardContext): void {
        wizardContext.telemetry.properties.netCoreVersion = this.targetFramework;
    }
}
