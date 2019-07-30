/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as path from 'path';
import * as semver from 'semver';
import { extractRegExGroups } from '../utils/extractRegExGroups';
import { isWindows, isWindows1019H1OrNewer, isWindows10RS3OrNewer, isWindows10RS4OrNewer, isWindows10RS5OrNewer } from '../utils/osUtils';
import { Platform, PlatformOS } from '../utils/platform';
import { getExposeStatements, IPlatformGeneratorInfo, PackageInfo } from './configure';

// This file handles both ASP.NET core and .NET Core Console

export const configureAspDotNetCore: IPlatformGeneratorInfo = {
    genDockerFile,
    genDockerCompose: undefined, // We don't generate compose files for .net core
    genDockerComposeDebug: undefined, // We don't generate compose files for .net core
    defaultPorts: [80, 443]
};

export const configureDotNetCoreConsole: IPlatformGeneratorInfo = {
    genDockerFile,
    genDockerCompose: undefined, // We don't generate compose files for .net core
    genDockerComposeDebug: undefined, // We don't generate compose files for .net core
    defaultPorts: undefined
};

// .NET Core 1.0 - 2.0 images are published to Docker Hub Registry.
const LegacyAspNetCoreRuntimeImageFormat = "microsoft/aspnetcore:{0}.{1}{2}";
const LegacyAspNetCoreSdkImageFormat = "microsoft/aspnetcore-build:{0}.{1}{2}";
const LegacyDotNetCoreRuntimeImageFormat = "microsoft/dotnet:{0}.{1}-runtime{2}";
const LegacyDotNetCoreSdkImageFormat = "microsoft/dotnet:{0}.{1}-sdk{2}";

// .NET Core 2.1+ images are now published to Microsoft Container Registry (MCR).
// https://hub.docker.com/_/microsoft-dotnet-core-runtime/
const DotNetCoreRuntimeImageFormat = "mcr.microsoft.com/dotnet/core/runtime:{0}.{1}{2}";
// https://hub.docker.com/_/microsoft-dotnet-core-aspnet/
const AspNetCoreRuntimeImageFormat = "mcr.microsoft.com/dotnet/core/aspnet:{0}.{1}{2}";
// https://hub.docker.com/_/microsoft-dotnet-core-sdk/
const DotNetCoreSdkImageFormat = "mcr.microsoft.com/dotnet/core/sdk:{0}.{1}{2}";

function GetWindowsImageTag(): string {
    // The host OS version needs to match the version of .NET core images being created
    if (!isWindows() || isWindows1019H1OrNewer()) {
        // If we're not on Windows (and therefore can't detect the version), assume a Windows 19H1 host
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
    return format.replace('{0}', asSemVer.major.toString())
        .replace('{1}', asSemVer.minor.toString())
        .replace('{2}', tagForWindowsVersion);
}

//#region ASP.NET Core templates

//AT-Kube: /src/Containers.Tools/Containers.Tools.Package/Templates/windows/dotnetcore/aspnetcore/Dockerfile
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
ENTRYPOINT ["dotnet", "$assembly_name$.dll"]
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
ENTRYPOINT ["dotnet", "$assembly_name$.dll"]
`;

//#endregion

//#region .NET Core Console templates

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
ENTRYPOINT ["dotnet", "$assembly_name$.dll"]
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
ENTRYPOINT ["dotnet", "$assembly_name$.dll"]
`;

//#endregion

function genDockerFile(serviceNameAndRelativePath: string, platform: Platform, os: PlatformOS | undefined, ports: number[], { version, artifactName }: Partial<PackageInfo>): string {
    // VS version of this function is in ResolveImageNames (src/Docker/Microsoft.VisualStudio.Docker.DotNetCore/DockerDotNetCoreScaffoldingProvider.cs)

    if (os !== 'Windows' && os !== 'Linux') {
        throw new Error(`Unexpected OS "${os}"`);
    }

    let serviceName = path.basename(serviceNameAndRelativePath);
    let projectDirectory = path.dirname(serviceNameAndRelativePath);
    let projectFileName = path.basename(artifactName);

    // We don't want the project folder in $assembly_name$ because the assembly is in /app and WORKDIR has been set to that
    let assemblyNameNoExtension = serviceName;
    // example: COPY Core2.0ConsoleAppWindows/Core2.0ConsoleAppWindows.csproj Core2.0ConsoleAppWindows/
    let copyProjectCommands = `COPY ["${artifactName}", "${projectDirectory}/"]`
    let exposeStatements = getExposeStatements(ports);

    // Parse version from TargetFramework
    // Example: netcoreapp1.0
    const defaultNetCoreVersion = '2.1';
    let [netCoreAppVersion] = extractRegExGroups(version, /^netcoreapp([0-9.]+)$/, [defaultNetCoreVersion]);

    // semver requires a patch in the version, so add it if only major.minor
    if (netCoreAppVersion.match(/^[^.]+\.[^.]+$/)) {
        netCoreAppVersion += '.0';
    }

    let baseImageFormat: string;
    let sdkImageNameFormat: string;

    // For .NET Core 2.1+ use mcr.microsoft.com/dotnet/core/[sdk|aspnet|runtime|runtime-deps] repository.
    // See details here: https://devblogs.microsoft.com/dotnet/net-core-container-images-now-published-to-microsoft-container-registry/
    if (semver.gte(netCoreAppVersion, '2.1.0')) {
        if (platform === 'ASP.NET Core') {
            baseImageFormat = AspNetCoreRuntimeImageFormat;
        } else if (platform === '.NET Core Console') {
            baseImageFormat = DotNetCoreRuntimeImageFormat;
        } else {
            assert.fail(`Unknown platform`);
        }

        sdkImageNameFormat = DotNetCoreSdkImageFormat;
    } else {
        if (platform === 'ASP.NET Core') {
            baseImageFormat = LegacyAspNetCoreRuntimeImageFormat;
            sdkImageNameFormat = LegacyAspNetCoreSdkImageFormat;
        } else if (platform === '.NET Core Console') {

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
        case ".NET Core Console":
            template = os === "Linux" ? dotNetCoreConsoleLinuxTemplate : dotNetCoreConsoleWindowsTemplate;
            break;
        case "ASP.NET Core":
            template = os === "Linux" ? aspNetCoreLinuxTemplate : aspNetCoreWindowsTemplate;
            break;
        default:
            throw new Error(`Unexpected platform "${platform}"`);
    }

    let contents = template.replace('$base_image_name$', baseImageName)
        .replace(/\$expose_statements\$/g, exposeStatements)
        .replace(/\$sdk_image_name\$/g, sdkImageName)
        .replace(/\$container_project_directory\$/g, projectDirectory)
        .replace(/\$project_file_name\$/g, projectFileName)
        .replace(/\$assembly_name\$/g, assemblyNameNoExtension)
        .replace(/\$copy_project_commands\$/g, copyProjectCommands);

    let unreplacedToken = extractRegExGroups(contents, /(\$[a-z_]+\$)/, ['']);
    if (unreplacedToken[0]) {
        assert.fail(`Unreplaced template token "${unreplacedToken}"`);
    }

    return contents;
}
