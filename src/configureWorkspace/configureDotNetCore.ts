/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import * as vscode from 'vscode';
import { WorkspaceFolder } from 'vscode';
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import ChildProcessProvider from '../debugging/coreclr/ChildProcessProvider';
import CommandLineDotNetClient from '../debugging/coreclr/CommandLineDotNetClient';
import { LocalFileSystemProvider } from '../debugging/coreclr/fsProvider';
import { MsBuildNetCoreProjectProvider, NetCoreProjectProvider } from '../debugging/coreclr/netCoreProjectProvider';
import { OSTempFileProvider } from '../debugging/coreclr/tempFileProvider';
import { DockerDebugScaffoldContext } from '../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider, NetCoreScaffoldingOptions } from '../debugging/DockerDebugScaffoldingProvider';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { hasTask } from '../tasks/TaskHelper';
import { extractRegExGroups } from '../utils/extractRegExGroups';
import { getValidImageName } from '../utils/getValidImageName';
import { globAsync } from '../utils/globAsync';
import LocalOSProvider from '../utils/LocalOSProvider';
import { isWindows, isWindows1019H1OrNewer, isWindows1019H2OrNewer, isWindows10RS3OrNewer, isWindows10RS4OrNewer, isWindows10RS5OrNewer } from '../utils/osUtils';
import { Platform, PlatformOS } from '../utils/platform';
import { generateNonConflictFileName } from '../utils/uniqueNameUtils';
import { getComposePorts, getExposeStatements } from './configure';
import { ConfigureTelemetryProperties, genCommonDockerIgnoreFile, getSubfolderDepth } from './configUtils';
import { ScaffolderContext, ScaffoldFile } from './scaffolding';

// This file handles both ASP.NET core and .NET Core Console

// .NET Core 1.0 - 2.0 images are published to Docker Hub Registry.
const LegacyAspNetCoreRuntimeImageFormat = "microsoft/aspnetcore:{1}.{2}{3}";
const LegacyAspNetCoreSdkImageFormat = "microsoft/aspnetcore-build:{1}.{2}{3}";
const LegacyDotNetCoreRuntimeImageFormat = "microsoft/dotnet:{1}.{2}-runtime{3}";
const LegacyDotNetCoreSdkImageFormat = "microsoft/dotnet:{1}.{2}-sdk{3}";

// .NET Core 2.1+ images are now published to Microsoft Container Registry (MCR).
// .NET Core 5.0+ images do not have "core/" in the name.
// https://hub.docker.com/_/microsoft-dotnet-core-runtime/
const DotNetCoreRuntimeImageFormat = "mcr.microsoft.com/dotnet/{0}runtime:{1}.{2}{3}";
// https://hub.docker.com/_/microsoft-dotnet-core-aspnet/
const AspNetCoreRuntimeImageFormat = "mcr.microsoft.com/dotnet/{0}aspnet:{1}.{2}{3}";
// https://hub.docker.com/_/microsoft-dotnet-core-sdk/
const DotNetCoreSdkImageFormat = "mcr.microsoft.com/dotnet/{0}sdk:{1}.{2}{3}";

function GetWindowsImageTag(): string {
    // The host OS version needs to match the version of .NET core images being created
    if (!isWindows()) {
        // If we're not on Windows (and therefore can't detect the version), assume a Windows 19H2 host
        return "-nanoserver-1909";
    } else if (isWindows1019H2OrNewer()) {
        return "-nanoserver-1909";
    } else if (isWindows1019H1OrNewer()) {
        return "-nanoserver-1903";
    } else if (isWindows10RS5OrNewer()) {
        return "-nanoserver-1809";
    } else if (isWindows10RS4OrNewer()) {
        return "-nanoserver-1803";
    } else if (isWindows10RS3OrNewer()) {
        return "-nanoserver-1709";
    } else {
        return "-nanoserver-sac2016";
    }
}

function formatVersion(format: string, version: string, tagForWindowsVersion: string): string {
    let asSemVer = new semver.SemVer(version);
    return format.replace('{0}', asSemVer.major >= 5 ? '' : 'core/')
        .replace('{1}', asSemVer.major.toString())
        .replace('{2}', asSemVer.minor.toString())
        .replace('{3}', tagForWindowsVersion);
}

// #region ASP.NET Core templates

// AT-Kube: /src/Containers.Tools/Containers.Tools.Package/Templates/windows/dotnetcore/aspnetcore/Dockerfile
const aspNetCoreWindowsTemplate = `#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

FROM $base_image_name$ AS base
WORKDIR /app
$expose_statements$

FROM $sdk_image_name$ AS build
WORKDIR /src
$copy_project_commands$
RUN dotnet restore "$container_project_directory$/$project_file_name$"
COPY . .
WORKDIR "/src/$container_project_directory$"
RUN dotnet build "$project_file_name$" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "$project_file_name$" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "$assembly_name$"]
`;

// AT-Kube: /src/Containers.Tools/Containers.Tools.Package/Templates/linux/dotnetcore/aspnetcore/Dockerfile
const aspNetCoreLinuxTemplate = `FROM $base_image_name$ AS base
WORKDIR /app
$expose_statements$

FROM $sdk_image_name$ AS build
WORKDIR /src
$copy_project_commands$
RUN dotnet restore "$container_project_directory$/$project_file_name$"
COPY . .
WORKDIR "/src/$container_project_directory$"
RUN dotnet build "$project_file_name$" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "$project_file_name$" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "$assembly_name$"]
`;

// #endregion

// #region .NET Core Console templates

// AT-Kube: /src/Containers.Tools/Containers.Tools.Package/Templates/windows/dotnetcore/console/Dockerfile
const dotNetCoreConsoleWindowsTemplate = `#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

FROM $base_image_name$ AS base
WORKDIR /app
$expose_statements$

FROM $sdk_image_name$ AS build
WORKDIR /src
$copy_project_commands$
RUN dotnet restore "$container_project_directory$/$project_file_name$"
COPY . .
WORKDIR "/src/$container_project_directory$"
RUN dotnet build "$project_file_name$" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "$project_file_name$" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "$assembly_name$"]
`;

// AT-Kube: /src/Containers.Tools/Containers.Tools.Package/Templates/linux/dotnetcore/console/Dockerfile
const dotNetCoreConsoleLinuxTemplate = `FROM $base_image_name$ AS base
WORKDIR /app
$expose_statements$

FROM $sdk_image_name$ AS build
WORKDIR /src
$copy_project_commands$
RUN dotnet restore "$container_project_directory$/$project_file_name$"
COPY . .
WORKDIR "/src/$container_project_directory$"
RUN dotnet build "$project_file_name$" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "$project_file_name$" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "$assembly_name$"]
`;

const dotNetComposeTemplate = `$comment$version: '3.4'

services:
  $service_name$:
    image: $image_name$
    build:
      context: .
      dockerfile: $dockerfile$$ports$`;

const dotNetComposeDebugTemplate = `${dotNetComposeTemplate}$environment$
    volumes:
$volumes_list$
`;
// #endregion

function extractNetCoreVersion(projFileContent: string): string {
    // Parse version from TargetFramework or TargetFrameworks
    // Example: netcoreapp1.0 or net5.0
    let [tfm] = extractRegExGroups(projFileContent, /<TargetFramework>(.+)<\/TargetFramework>/, [undefined]);
    if (!tfm) {
        [tfm] = extractRegExGroups(projFileContent, /<TargetFrameworks>(.+)<\/TargetFrameworks>/, ['']);
    }

    const defaultNetCoreVersion = '2.1';
    let [netCoreVersion] = extractRegExGroups(tfm, /^netcoreapp([0-9.]+)|net([0-9.]+)$/, [defaultNetCoreVersion]);

    // semver requires a patch in the version, so add it if only major.minor
    if (netCoreVersion.match(/^[^.]+\.[^.]+$/)) {
        netCoreVersion += '.0';
    }

    return netCoreVersion;
}

function genDockerFile(serviceNameAndRelativePath: string, platform: Platform, os: PlatformOS | undefined, ports: number[], netCoreAppVersion: string, artifactName: string, assemblyName: string): string {
    // VS version of this function is in ResolveImageNames (src/Docker/Microsoft.VisualStudio.Docker.DotNetCore/DockerDotNetCoreScaffoldingProvider.cs)

    if (os !== 'Windows' && os !== 'Linux') {
        throw new Error(localize('vscode-docker.configureDotNetCore.unexpectedOs', 'Unexpected OS "{0}"', os));
    }

    let projectDirectory = path.dirname(serviceNameAndRelativePath);
    let projectFileName = path.basename(artifactName);

    // example: COPY Core2.0ConsoleAppWindows/Core2.0ConsoleAppWindows.csproj Core2.0ConsoleAppWindows/
    let copyProjectCommands = `COPY ["${artifactName}", "${projectDirectory}/"]`
    let exposeStatements = getExposeStatements(ports);
    let baseImageFormat: string;
    let sdkImageNameFormat: string;

    // For .NET Core 2.1+ use mcr.microsoft.com/dotnet/core/[sdk|aspnet|runtime|runtime-deps] repository.
    // See details here: https://devblogs.microsoft.com/dotnet/net-core-container-images-now-published-to-microsoft-container-registry/
    if (semver.gte(netCoreAppVersion, '2.1.0')) {
        if (platform === '.NET: ASP.NET Core') {
            baseImageFormat = AspNetCoreRuntimeImageFormat;
        } else if (platform === '.NET: Core Console') {
            baseImageFormat = DotNetCoreRuntimeImageFormat;
        } else {
            assert.fail(`Unknown platform`);
        }

        sdkImageNameFormat = DotNetCoreSdkImageFormat;
    } else {
        if (platform === '.NET: ASP.NET Core') {
            baseImageFormat = LegacyAspNetCoreRuntimeImageFormat;
            sdkImageNameFormat = LegacyAspNetCoreSdkImageFormat;
        } else if (platform === '.NET: Core Console') {

            baseImageFormat = LegacyDotNetCoreRuntimeImageFormat;
            sdkImageNameFormat = LegacyDotNetCoreSdkImageFormat;
        } else {
            assert.fail(`Unknown platform`);
        }
    }

    // When targeting Linux container or the dotnet core version is less than 2.0, use MA tag.
    // Otherwise, use specific nanoserver tags depending on Windows build.
    let tagForWindowsVersion: string;
    if (os === 'Linux' || semver.lt(netCoreAppVersion, '2.0.0')) {
        tagForWindowsVersion = '';
    } else {
        tagForWindowsVersion = GetWindowsImageTag();
    }

    let baseImageName = formatVersion(baseImageFormat, netCoreAppVersion, tagForWindowsVersion);
    let sdkImageName = formatVersion(sdkImageNameFormat, netCoreAppVersion, tagForWindowsVersion);

    let template: string;
    switch (platform) {
        case ".NET: Core Console":
            template = os === "Linux" ? dotNetCoreConsoleLinuxTemplate : dotNetCoreConsoleWindowsTemplate;
            break;
        case ".NET: ASP.NET Core":
            template = os === "Linux" ? aspNetCoreLinuxTemplate : aspNetCoreWindowsTemplate;
            break;
        default:
            throw new Error(localize('vscode-docker.configureDotNetCore.unexpectedPlatform', 'Unexpected platform "{0}"', platform));
    }

    let contents = template.replace('$base_image_name$', baseImageName)
        .replace(/\$expose_statements\$/g, exposeStatements)
        .replace(/\$sdk_image_name\$/g, sdkImageName)
        .replace(/\$container_project_directory\$/g, projectDirectory)
        .replace(/\$project_file_name\$/g, projectFileName)
        .replace(/\$assembly_name\$/g, assemblyName)
        .replace(/\$copy_project_commands\$/g, copyProjectCommands);

    validateForUnresolvedToken(contents);

    return contents;
}

function validateForUnresolvedToken(contents: string): void {
    let unreplacedToken = extractRegExGroups(contents, /(\$[a-z_]+\$)/, ['']);
    if (unreplacedToken[0]) {
        assert.fail(`Unreplaced template token "${unreplacedToken}"`);
    }
}

function generateComposeFiles(dockerfileName: string, platform: Platform, os: PlatformOS | undefined, ports: number[], artifactName: string): ScaffoldFile[] {
    const serviceName = path.basename(artifactName, path.extname(artifactName));
    let comment = '';
    // Compose doesn't configure the https, so expose only the http port.
    // Otherwise the 'Open in Browser' command will try to open https endpoint and will not work.
    let jsonPorts: string = ports?.length > 0 ? `\n${getComposePorts([ports[0]])}` : '';

    let environmentVariables: string = '';
    if (platform === '.NET: ASP.NET Core') {
        comment = '# Please refer https://aka.ms/HTTPSinContainer on how to setup an https developer certificate for your ASP .NET Core service.\n';
        environmentVariables = `\n    environment:
      - ASPNETCORE_ENVIRONMENT=Development`;
        // For now assume the first port is http. (default scaffolding behavior)
        // TODO: This is not the perfect logic, this should be improved later.
        if (ports && ports.length > 0) {
            // eslint-disable-next-line @typescript-eslint/tslint/config
            let aspNetCoreUrl: string = `      - ASPNETCORE_URLS=http://+:${ports[0]}`;
            environmentVariables += `\n${aspNetCoreUrl}`
        }
    }

    let volumesList = os === 'Windows' ?
        '      - ~/.vsdbg:c:\\remote_debugger:rw'
        : '      - ~/.vsdbg:/remote_debugger:rw';

    // Ensure the path scaffolded in the Dockerfile uses POSIX separators (which work on both Linux and Windows).
    dockerfileName = dockerfileName.replace(/\\/g, '/');

    const normalizedServiceName = getValidImageName(serviceName);

    let composeFileContent = dotNetComposeTemplate.replace('$service_name$', normalizedServiceName)
        .replace(/\$image_name\$/g, normalizedServiceName)
        .replace(/\$dockerfile\$/g, dockerfileName)
        .replace(/\$ports\$/g, jsonPorts)
        .replace('$comment$', comment);
    validateForUnresolvedToken(composeFileContent);

    let composeDebugFileContent = dotNetComposeDebugTemplate.replace('$service_name$', normalizedServiceName)
        .replace(/\$image_name\$/g, normalizedServiceName)
        .replace(/\$dockerfile\$/g, dockerfileName)
        .replace(/\$ports\$/g, jsonPorts)
        .replace(/\$environment\$/g, environmentVariables)
        .replace(/\$volumes_list\$/g, volumesList)
        .replace('$comment$', comment);
    validateForUnresolvedToken(composeDebugFileContent);

    return [
        { fileName: 'docker-compose.yml', contents: composeFileContent, onConflict: async (filePath) => { return await generateNonConflictFileName(filePath) } },
        { fileName: 'docker-compose.debug.yml', contents: composeDebugFileContent, onConflict: async (filePath) => { return await generateNonConflictFileName(filePath) } }
    ];
}

// Returns the relative path of the project file without the extension
async function findCSProjOrFSProjFile(context?: ScaffolderContext): Promise<string> {
    const opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Project'
    }

    const projectFiles: string[] = await globAsync('**/*.@(c|f)sproj', { cwd: context?.rootFolder });

    if (!projectFiles || !projectFiles.length) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(localize('vscode-docker.configureDotNetCore.noCsproj', 'No .csproj or .fsproj file could be found. You need a C# or F# project file in the workspace to generate Docker files for the selected platform.'));
    }

    if (projectFiles.length > 1) {
        let items = projectFiles.map(p => <vscode.QuickPickItem>{ label: p });
        let result = await ext.ui.showQuickPick(items, opt);
        return result.label;
    } else {
        return projectFiles[0];
    }
}

async function initializeForDebugging(context: ScaffolderContext, folder: WorkspaceFolder, platformOS: PlatformOS, workspaceRelativeDockerfileName: string, workspaceRelativeProjectFileName: string): Promise<void> {
    const scaffoldContext: DockerDebugScaffoldContext = {
        folder: folder,
        platform: 'netCore',
        actionContext: context,
        // always use posix for debug config because it's committed to source control and works on all OS's
        /* eslint-disable-next-line no-template-curly-in-string */
        dockerfile: path.posix.join('${workspaceFolder}', workspaceRelativeDockerfileName),
        ports: context.ports,
    };

    const options: NetCoreScaffoldingOptions = {
        // always use posix for debug config because it's committed to source control and works on all OS's
        /* eslint-disable-next-line no-template-curly-in-string */
        appProject: path.posix.join('${workspaceFolder}', workspaceRelativeProjectFileName),
        platformOS: platformOS,
    };

    await dockerDebugScaffoldingProvider.initializeNetCoreForDebugging(scaffoldContext, options);
}

async function inferOutputAssemblyName(appProjectFilePath: string): Promise<string> {
    const processProvider = new ChildProcessProvider();
    const fsProvider = new LocalFileSystemProvider();
    const osProvider = new LocalOSProvider();
    const dotNetClient = new CommandLineDotNetClient(
        processProvider,
        fsProvider,
        osProvider
    );
    const netCoreProjectProvider: NetCoreProjectProvider = new MsBuildNetCoreProjectProvider(
        fsProvider,
        dotNetClient,
        new OSTempFileProvider(osProvider, processProvider)
    );

    const fullOutputPath = await netCoreProjectProvider.getTargetPath(appProjectFilePath);
    return path.basename(fullOutputPath);
}

// tslint:disable-next-line: export-name
export async function scaffoldNetCore(context: ScaffolderContext): Promise<ScaffoldFile[]> {
    ensureDotNetCoreDependencies(context.folder, context);
    const os = context.os ?? (context.os = await context.promptForOS());
    const isCompose = await context.promptForCompose();

    const telemetryProperties = <TelemetryProperties & ConfigureTelemetryProperties>context.telemetry.properties;

    telemetryProperties.configureOs = os;
    if (isCompose) {
        telemetryProperties.orchestration = 'docker-compose';
    }

    context.ports = context.ports ?? (context.platform === '.NET: ASP.NET Core' ? await context.promptForPorts([80, 443]) : undefined);

    const rootRelativeProjectFileName = await context.captureStep('project', findCSProjOrFSProjFile)(context);
    const projectFullPath = path.join(context.rootFolder, rootRelativeProjectFileName);
    const rootRelativeProjectDirectory = path.dirname(rootRelativeProjectFileName);

    telemetryProperties.packageFileType = path.extname(rootRelativeProjectFileName);
    telemetryProperties.packageFileSubfolderDepth = getSubfolderDepth(context.rootFolder, rootRelativeProjectFileName);

    const projectFilePath = path.posix.join(context.rootFolder, rootRelativeProjectFileName);
    const workspaceRelativeProjectFileName = path.posix.relative(context.folder.uri.fsPath, projectFilePath);

    let serviceNameAndPathRelative = rootRelativeProjectFileName.slice(0, -(path.extname(rootRelativeProjectFileName).length));
    const projFileContent = (await fse.readFile(path.join(context.rootFolder, rootRelativeProjectFileName))).toString();
    const netCoreVersion = extractNetCoreVersion(projFileContent);
    telemetryProperties.netCoreVersion = netCoreVersion;

    if (context.outputFolder) {
        // We need paths in the Dockerfile to be relative to the output folder, not the root
        serviceNameAndPathRelative = path.relative(context.outputFolder, path.join(context.rootFolder, serviceNameAndPathRelative));
    }

    // Ensure the path scaffolded in the Dockerfile uses POSIX separators (which work on both Linux and Windows).
    serviceNameAndPathRelative = serviceNameAndPathRelative.replace(/\\/g, '/');

    const assemblyName = await inferOutputAssemblyName(projectFullPath);
    let dockerFileContents = genDockerFile(serviceNameAndPathRelative, context.platform, os, context.ports, netCoreVersion, workspaceRelativeProjectFileName, assemblyName);

    // Remove multiple empty lines with single empty lines, as might be produced
    // if $expose_statements$ or another template variable is an empty string
    dockerFileContents = dockerFileContents
        .replace(/(\r\n){3,4}/g, "\r\n\r\n")
        .replace(/(\n){3,4}/g, "\n\n");

    const dockerFileName = path.join(context.outputFolder ?? rootRelativeProjectDirectory, 'Dockerfile');
    const dockerIgnoreFileName = path.join(context.outputFolder ?? '', '.dockerignore');

    const composeFiles = isCompose ? generateComposeFiles(dockerFileName, context.platform, os, context.ports, workspaceRelativeProjectFileName) : [];

    let files: ScaffoldFile[] = [
        { fileName: dockerFileName, contents: dockerFileContents, open: true },
        { fileName: dockerIgnoreFileName, contents: genCommonDockerIgnoreFile(context.platform) }
    ];

    files = files.concat(composeFiles);

    if (context.initializeForDebugging) {
        const dockerFilePath = path.resolve(context.rootFolder, dockerFileName);
        const workspaceRelativeDockerfileName = path.relative(context.folder.uri.fsPath, dockerFilePath);

        await initializeForDebugging(context, context.folder, context.os, workspaceRelativeDockerfileName, workspaceRelativeProjectFileName);
    }

    return files;
}

export function ensureDotNetCoreDependencies(workspaceFolder: WorkspaceFolder, context: IActionContext): void {
    // Even if the build task is created by the test and validated, sometimes the hasTask check fails.
    // So disabling this check for unit test.
    if (!ext.runningTests && !hasTask('build', workspaceFolder)) {
        context.errorHandling.suppressReportIssue = true;
        const message = localize('vscode-docker.configureDotNetCore.missingDependencies', 'A build task is missing. Please generate build task by running \'.NET: Generate Assets for Build and Debug\' before running this command');
        throw new Error(message);
    }
}
