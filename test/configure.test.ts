/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as assertEx from './assertEx';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Suite } from 'mocha';
import { PlatformOS, Platform, ext, configure, ConfigureTelemetryProperties, ConfigureApiOptions, globAsync } from '../extension.bundle';
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { getTestRootFolder, testInEmptyFolder, testUserInput } from './global.test';
import { TestInput } from 'vscode-azureextensiondev';

// Can be useful for testing
const outputAllGeneratedFileContents = false;

const windowsServer2016 = '10.0.14393';
const windows10RS3 = '10.0.16299';
const windows10RS4 = '10.0.17134';
const windows10RS5 = '10.0.17763';

let testRootFolder: string = getTestRootFolder();

/* Removes any leading blank lines, and also unindents all lines by however much the first non-empty line is indented.
    This lets you write this:

     const text = `
indented text:
    sub-indented text
`;

as the easier to read:

    const text = `
        indented text:
            sub-indented text
        `;
*/
function removeIndentation(text: string): string {
    while (text[0] === '\r' || text[0] === '\n') {
        text = text.substr(1);
    }

    // Figure out indentation of first line
    let spaces = text.match(/^[ ]+/);
    if (spaces) {
        let indentationPattern = new RegExp(`^${spaces[0]}`, 'gm');
        text = text.replace(indentationPattern, '');
    }

    // Truncate last line if only contains blanks
    text = text.replace(/[ ]+$/, '');

    return text;
}

async function readFile(pathRelativeToTestRootFolder: string): Promise<string> {
    let dockerFilePath = path.join(testRootFolder, pathRelativeToTestRootFolder);
    let dockerFileBuffer = await fse.readFile(dockerFilePath);
    let dockerFileContents = dockerFileBuffer.toString();
    return dockerFileContents;
}

async function testConfigureDockerViaApi(options: ConfigureApiOptions, inputs: (string | TestInput)[] = [], expectedOutputFiles?: string[]): Promise<void> {
    await testUserInput.runWithInputs(inputs, async () => {
        await vscode.commands.executeCommand('vscode-docker.api.configure', options);
    });

    if (expectedOutputFiles) {
        let projectFiles = await getFilesInProject();
        assertEx.unorderedArraysEqual(projectFiles, expectedOutputFiles, "The set of files in the project folder after configure was run is not correct.");

        if (outputAllGeneratedFileContents) {
            for (let file of projectFiles) {
                console.log(file);
                let contents = readFile(file);
                console.log(contents);
            }
        }
    }
}

function verifyTelemetryProperties(context: IActionContext, expectedTelemetryProperties?: ConfigureTelemetryProperties) {
    if (expectedTelemetryProperties) {
        let properties: TelemetryProperties & ConfigureTelemetryProperties = context.telemetry.properties;
        assert.equal(properties.configureOs, expectedTelemetryProperties.configureOs, "telemetry wrong: os");
        assert.equal(properties.packageFileSubfolderDepth, expectedTelemetryProperties.packageFileSubfolderDepth, "telemetry wrong: packageFileSubfolderDepth");
        assert.equal(properties.packageFileType, expectedTelemetryProperties.packageFileType, "telemetry wrong: packageFileType");
        assert.equal(properties.configurePlatform, expectedTelemetryProperties.configurePlatform, "telemetry wrong: platform");
    }
}
async function writeFile(subfolderName: string, fileName: string, text: string): Promise<void> {
    await fse.mkdirs(path.join(testRootFolder, subfolderName));
    await fse.writeFile(path.join(testRootFolder, subfolderName, fileName), text);
}

function assertFileContains(fileName: string, text: string): void {
    let filePath = path.join(testRootFolder, fileName);
    assertEx.assertFileContains(filePath, text);
}

function assertNotFileContains(fileName: string, text: string): void {
    let filePath = path.join(testRootFolder, fileName);
    assertEx.assertNotFileContains(filePath, text);
}

async function getFilesInProject(): Promise<string[]> {
    let files = await globAsync('**/*', {
        cwd: testRootFolder,
        dot: true, // include files beginning with dot
        nodir: true
    });
    return files;
}

async function testConfigureDocker(platform: Platform, expectedTelemetryProperties?: ConfigureTelemetryProperties, inputs: (string | TestInput)[] = [], expectedOutputFiles?: string[]): Promise<void> {
    // Set up simulated user input
    inputs.unshift(platform);
    let context: IActionContext = {
        telemetry: { properties: {}, measurements: {} },
        errorHandling: {}
    };

    await testUserInput.runWithInputs(inputs, async () => {
        await configure(context, testRootFolder);
    });

    if (expectedOutputFiles) {
        let projectFiles = await getFilesInProject();
        assertEx.unorderedArraysEqual(projectFiles, expectedOutputFiles, "The set of files in the project folder after configure was run is not correct.");

        if (outputAllGeneratedFileContents) {
            for (let file of projectFiles) {
                console.log(file);
                let contents = readFile(file);
                console.log(contents);
            }
        }
    }

    verifyTelemetryProperties(context, expectedTelemetryProperties);
}

//#region .NET Core Console projects

const dotnetCoreConsole_ProgramCsContents = `
using System;

namespace ConsoleApp1
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }
}
`;

// Created in Visual Studio 2017
const dotNetCoreConsole_10_ProjectFileContents = `
    <Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
      <OutputType>Exe</OutputType>
      <TargetFramework>netcoreapp1.0</TargetFramework>
      <RootNamespace>Core1._0ConsoleApp</RootNamespace>
    </PropertyGroup>

  </Project>
      `;

const dotNetCoreConsole_11_ProjectFileContents = removeIndentation(`
      <Project Sdk="Microsoft.NET.Sdk">

      <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>netcoreapp1.1</TargetFramework>
        <RootNamespace>Core1._1ConsoleApp</RootNamespace>
      </PropertyGroup>

      </Project>
        `);

const dotNetCoreConsole_20_ProjectFileContents = removeIndentation(`
      <Project Sdk="Microsoft.NET.Sdk">

      <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>netcoreapp2.0</TargetFramework>
        <RootNamespace>Core2._0ConsoleApp</RootNamespace>
      </PropertyGroup>

      </Project>
            `);

// https://github.com/dotnet/dotnet-docker/tree/master/samples/dotnetapp
const dotNetCoreConsole_21_ProjectFileContents = removeIndentation(`
    <Project Sdk="Microsoft.NET.Sdk" ToolsVersion="15.0">

        <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>netcoreapp2.1</TargetFramework>
        </PropertyGroup>

        <ItemGroup>
        <ProjectReference Include="..\\utils\\utils.csproj" />
        </ItemGroup>

    </Project>
    `);

const dotNetCoreConsole_22_ProjectFileContents = removeIndentation(`
    <Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
      <OutputType>Exe</OutputType>
      <TargetFramework>netcoreapp2.2</TargetFramework>
    </PropertyGroup>

  </Project>
`);

//#endregion

//#region ASP.NET Core projects

// https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
const aspNet_21_ProjectFileContents = removeIndentation(`
    <Project Sdk="Microsoft.NET.Sdk.Web">

    <PropertyGroup>
        <TargetFramework>netcoreapp2.1</TargetFramework>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.AspNetCore.App" />
    </ItemGroup>

    </Project>
    `);

// Generated by VS
const aspNet_22_ProjectFileContents = removeIndentation(`
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>netcoreapp2.2</TargetFramework>
    <AspNetCoreHostingModel>inprocess</AspNetCoreHostingModel>
    <DockerTargetOS>Linux</DockerTargetOS>
  </PropertyGroup>


  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
    <PackageReference Include="Microsoft.AspNetCore.Razor.Design" Version="2.2.0-preview2-35157" PrivateAssets="All" />
    <PackageReference Include="Microsoft.VisualStudio.Azure.Containers.Tools.Targets" Version="1.0.1916590" />
  </ItemGroup>

</Project>
`);

const aspNet_10_ProjectFileContents = removeIndentation(`
    <Project Sdk="Microsoft.NET.Sdk.Web">

    <PropertyGroup>
        <TargetFramework>netcoreapp1.1</TargetFramework>
        <DockerTargetOS>Windows</DockerTargetOS>
        <UserSecretsId>22a9bd21-dbf0-4ef0-9963-d56730908d16</UserSecretsId>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.AspNetCore.App" />
        <PackageReference Include="Microsoft.VisualStudio.Azure.Containers.Tools.Targets" Version="1.0.1916590" />
    </ItemGroup>

    </Project>
`);

const aspNet_20_ProjectFileContents = removeIndentation(`
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>netcoreapp2.0</TargetFramework>
    <DockerTargetOS>Linux</DockerTargetOS>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
    <PackageReference Include="Microsoft.VisualStudio.Azure.Containers.Tools.Targets" Version="1.0.1916590" />
  </ItemGroup>

</Project>
`);

//#endregion

const gradleWithJarContents = removeIndentation(`
    apply plugin: 'groovy'

    dependencies {
        compile gradleApi()
        compile localGroovy()
    }

    apply plugin: 'maven'
    apply plugin: 'signing'

    repositories {
        mavenCentral()
    }

    group = 'com.github.test'
    version = '1.2.3'
    sourceCompatibility = 1.7
    targetCompatibility = 1.7

    task javadocJar(type: Jar) {
        classifier = 'javadoc'
        from javadoc
    }

    task sourcesJar(type: Jar) {
        classifier = 'sources'
        from sourceSets.main.allSource
    }

    artifacts {
        archives javadocJar, sourcesJar
    }

    jar {
        configurations.shade.each { dep ->
            from(project.zipTree(dep)){
                duplicatesStrategy 'warn'
            }
        }

        manifest {
            attributes 'version':project.version
            attributes 'javaCompliance': project.targetCompatibility
            attributes 'group':project.group
            attributes 'Implementation-Version': project.version + getGitHash()
        }
        archiveName 'abc.jar'
    }

    uploadArchives {
        repositories {
            mavenDeployer {

                beforeDeployment { MavenDeployment deployment -> signing.signPom(deployment) }

                repository(url: uri('../repo'))

                pom.project {
                    name 'test'
                    packaging 'jar'
                    description 'test'
                    url 'https://github.com/test'
                }
            }
        }
    }
`);

suite("Configure (Add Docker files to Workspace)", function (this: Suite): void {
    this.timeout(30 * 1000);

    test('add tests for compose files');

    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Docker extension tests');
    ext.outputChannel = outputChannel;

    async function testDotNetCoreConsole(os: PlatformOS, hostOs: PlatformOS, hostOsRelease: string, projectFolder: string, projectFileName: string, projectFileContents: string, expectedDockerFileContents?: string): Promise<void> {
        let previousOs = ext.os;
        ext.os = {
            platform: hostOs === 'Windows' ? 'win32' : 'linux',
            release: hostOsRelease
        };
        try {

            await writeFile(projectFolder, projectFileName, projectFileContents);
            await writeFile(projectFolder, 'Program.cs', dotnetCoreConsole_ProgramCsContents);

            await testConfigureDocker(
                '.NET Core Console',
                {
                    configurePlatform: '.NET Core Console',
                    configureOs: os,
                    packageFileType: '.csproj',
                    packageFileSubfolderDepth: projectFolder.includes('/') ? '2' : '1'
                },
                [os /* it doesn't ask for a port, so we don't specify one here */],
                ['Dockerfile', '.dockerignore', `${projectFolder}/Program.cs`, `${projectFolder}/${projectFileName}`]
            );

            let dockerFileContents = await readFile('Dockerfile');
            if (expectedDockerFileContents) {
                assert.equal(dockerFileContents, expectedDockerFileContents);
            }
        } finally {
            ext.os = previousOs;
        }
    }

    async function testAspNetCore(os: PlatformOS, hostOs: PlatformOS, hostOsRelease: string, projectFolder: string, projectFileName: string, projectFileContents: string, expectedDockerFileContents?: string): Promise<void> {
        let previousOs = ext.os;
        ext.os = {
            platform: hostOs === 'Windows' ? 'win32' : 'linux',
            release: hostOsRelease
        };
        try {
            await writeFile(projectFolder, projectFileName, projectFileContents);
            await writeFile(projectFolder, 'Program.cs', dotNetCoreConsole_10_ProjectFileContents);

            await testConfigureDocker(
                'ASP.NET Core',
                {
                    configurePlatform: 'ASP.NET Core',
                    configureOs: os,
                    packageFileType: '.csproj',
                    packageFileSubfolderDepth: '1'
                },
                [os, '1234'],
                ['Dockerfile', '.dockerignore', `${projectFolder}/Program.cs`, `${projectFolder}/${projectFileName}`]
            );

            let dockerFileContents = await readFile('Dockerfile');
            if (expectedDockerFileContents) {
                assert.equal(dockerFileContents, expectedDockerFileContents);
            }
        } finally {
            ext.os = previousOs;
        }
    }

    // Node.js

    suite("Node.js", () => {
        testInEmptyFolder("No package.json", async () => {
            await testConfigureDocker(
                'Node.js',
                {
                    configurePlatform: 'Node.js',
                    configureOs: undefined,
                    packageFileType: undefined,
                    packageFileSubfolderDepth: undefined
                },
                ['1234'],
                ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'EXPOSE 1234');
            assertFileContains('Dockerfile', 'CMD npm start');

            assertFileContains('docker-compose.debug.yml', '1234:1234');
            assertFileContains('docker-compose.debug.yml', '9229:9229');
            assertFileContains('docker-compose.debug.yml', 'image: testoutput');
            assertFileContains('docker-compose.debug.yml', 'NODE_ENV: development');
            assertFileContains('docker-compose.debug.yml', 'command: node --inspect index.js');

            assertFileContains('docker-compose.yml', '1234:1234');
            assertNotFileContains('docker-compose.yml', '9229:9229');
            assertFileContains('docker-compose.yml', 'image: testoutput');
            assertFileContains('docker-compose.yml', 'NODE_ENV: production');
            assertNotFileContains('docker-compose.yml', 'command: node --inspect index.js');

            assertFileContains('.dockerignore', '.vscode');
        });

        testInEmptyFolder("With start script", async () => {
            await writeFile('', 'package.json',
                `{
        "name": "vscode-docker",
        "version": "0.0.28",
        "main": "./out/dockerExtension",
        "author": "Azure",
        "scripts": {
            "vscode:prepublish": "tsc -p ./",
            "start": "startMyUp.cmd",
            "test": "npm run build && node ./node_modules/vscode/bin/test"
        },
        "dependencies": {
            "azure-arm-containerregistry": "^1.0.0-preview"
        }
    }
        `);

            await testConfigureDocker(
                'Node.js',
                {
                    configurePlatform: 'Node.js',
                    configureOs: undefined,
                    packageFileType: 'package.json',
                    packageFileSubfolderDepth: '0'
                },
                ['4321'],
                ['package.json', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'EXPOSE 4321');
            assertFileContains('Dockerfile', 'CMD npm start');

            assertFileContains('docker-compose.debug.yml', '4321:4321');
            assertFileContains('docker-compose.debug.yml', '9229:9229');
            assertFileContains('docker-compose.debug.yml', 'image: testoutput');
            assertFileContains('docker-compose.debug.yml', 'NODE_ENV: development');
            assertFileContains('docker-compose.debug.yml', 'command: node --inspect index.js');

            assertFileContains('docker-compose.yml', '4321:4321');
            assertNotFileContains('docker-compose.yml', '9229:9229');
            assertFileContains('docker-compose.yml', 'image: testoutput');
            assertFileContains('docker-compose.yml', 'NODE_ENV: production');
            assertNotFileContains('docker-compose.yml', 'command: node --inspect index.js');

            assertFileContains('.dockerignore', '.vscode');
        });

        testInEmptyFolder("Without start script", async () => {
            await writeFile('', 'package.json',
                `{
        "name": "vscode-docker",
        "version": "0.0.28",
        "main": "./out/dockerExtension",
        "author": "Azure",
        "scripts": {
            "vscode:prepublish": "tsc -p ./",
            "test": "npm run build && node ./node_modules/vscode/bin/test"
        },
        "dependencies": {
            "azure-arm-containerregistry": "^1.0.0-preview"
        }
    }
        `);

            await testConfigureDocker(
                'Node.js',
                {
                    configurePlatform: 'Node.js',
                    configureOs: undefined,
                    packageFileType: 'package.json',
                    packageFileSubfolderDepth: '0',
                },
                ['4321'],
                ['package.json', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'EXPOSE 4321');
            assertFileContains('Dockerfile', 'CMD node ./out/dockerExtension');
        });
    });

    // .NET Core Console

    suite(".NET Core General", () => {
        testInEmptyFolder("No project file", async () => {
            await assertEx.throwsOrRejectsAsync(async () =>
                testConfigureDocker(
                    '.NET Core Console',
                    {
                        configurePlatform: '.NET Core Console',
                        configureOs: 'Windows',
                        packageFileType: undefined,
                        packageFileSubfolderDepth: undefined
                    },
                    ['Windows']
                ),
                { message: "No .csproj or .fsproj file could be found. You need a C# or F# project file in the workspace to generate Docker files for the selected platform." }
            );
        });

        testInEmptyFolder("ASP.NET Core no project file", async () => {
            await assertEx.throwsOrRejectsAsync(async () => testConfigureDocker('ASP.NET Core', {}, ['Windows', '1234']),
                { message: "No .csproj or .fsproj file could be found. You need a C# or F# project file in the workspace to generate Docker files for the selected platform." }
            );
        });

        testInEmptyFolder("Multiple project files", async () => {
            await writeFile('projectFolder1', 'aspnetapp.csproj', dotNetCoreConsole_21_ProjectFileContents);
            await writeFile('projectFolder2', 'aspnetapp.csproj', dotNetCoreConsole_21_ProjectFileContents);
            await testConfigureDocker(
                '.NET Core Console',
                {
                    configurePlatform: '.NET Core Console',
                    configureOs: 'Windows',
                    packageFileType: '.csproj',
                    packageFileSubfolderDepth: '1'
                },
                ['Windows', 'projectFolder2/aspnetapp.csproj'],
                ['Dockerfile', '.dockerignore', 'projectFolder1/aspnetapp.csproj', 'projectFolder2/aspnetapp.csproj']
            );

            assertNotFileContains('Dockerfile', 'projectFolder1');
            assertFileContains('Dockerfile', `COPY ["projectFolder2/aspnetapp.csproj", "projectFolder2/"]`);
            assertFileContains('Dockerfile', `RUN dotnet restore "projectFolder2/aspnetapp.csproj"`);
            assertFileContains('Dockerfile', `ENTRYPOINT ["dotnet", "aspnetapp.dll"]`);
        });
    });

    suite(".NET Core Console 2.1", async () => {
        testInEmptyFolder("Windows", async () => {
            await testDotNetCoreConsole(
                'Windows',
                'Windows',
                windows10RS5,
                'ConsoleApp1Folder',
                'ConsoleApp1.csproj',
                dotNetCoreConsole_21_ProjectFileContents,
                removeIndentation(`
                    #Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
                    #For more information, please see https://aka.ms/containercompat

                    FROM mcr.microsoft.com/dotnet/core/runtime:2.1-nanoserver-1809 AS base
                    WORKDIR /app

                    FROM mcr.microsoft.com/dotnet/core/sdk:2.1-nanoserver-1809 AS build
                    WORKDIR /src
                    COPY ["ConsoleApp1Folder/ConsoleApp1.csproj", "ConsoleApp1Folder/"]
                    RUN dotnet restore "ConsoleApp1Folder/ConsoleApp1.csproj"
                    COPY . .
                    WORKDIR "/src/ConsoleApp1Folder"
                    RUN dotnet build "ConsoleApp1.csproj" -c Release -o /app/build

                    FROM build AS publish
                    RUN dotnet publish "ConsoleApp1.csproj" -c Release -o /app/publish

                    FROM base AS final
                    WORKDIR /app
                    COPY --from=publish /app/publish .
                    ENTRYPOINT ["dotnet", "ConsoleApp1.dll"]
                `));

            assertNotFileContains('Dockerfile', 'EXPOSE');
        });

        testInEmptyFolder("Linux", async () => {
            await testDotNetCoreConsole(
                'Linux',
                'Linux',
                '',
                'ConsoleApp1Folder',
                'ConsoleApp1.csproj',
                dotNetCoreConsole_21_ProjectFileContents,
                removeIndentation(`
                    FROM mcr.microsoft.com/dotnet/core/runtime:2.1 AS base
                    WORKDIR /app

                    FROM mcr.microsoft.com/dotnet/core/sdk:2.1 AS build
                    WORKDIR /src
                    COPY ["ConsoleApp1Folder/ConsoleApp1.csproj", "ConsoleApp1Folder/"]
                    RUN dotnet restore "ConsoleApp1Folder/ConsoleApp1.csproj"
                    COPY . .
                    WORKDIR "/src/ConsoleApp1Folder"
                    RUN dotnet build "ConsoleApp1.csproj" -c Release -o /app/build

                    FROM build AS publish
                    RUN dotnet publish "ConsoleApp1.csproj" -c Release -o /app/publish

                    FROM base AS final
                    WORKDIR /app
                    COPY --from=publish /app/publish .
                    ENTRYPOINT ["dotnet", "ConsoleApp1.dll"]
                `));

            assertNotFileContains('Dockerfile', 'EXPOSE');
        });
    });

    suite(".NET Core Console 2.0", async () => {
        testInEmptyFolder("Windows", async () => {
            await testDotNetCoreConsole(
                'Windows',
                'Windows',
                windows10RS5,
                'subfolder/projectFolder',
                'ConsoleApp1.csproj',
                dotNetCoreConsole_20_ProjectFileContents,
                removeIndentation(`
                    #Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
                    #For more information, please see https://aka.ms/containercompat

                    FROM microsoft/dotnet:2.0-runtime-nanoserver-1809 AS base
                    WORKDIR /app

                    FROM microsoft/dotnet:2.0-sdk-nanoserver-1809 AS build
                    WORKDIR /src
                    COPY ["subfolder/projectFolder/ConsoleApp1.csproj", "subfolder/projectFolder/"]
                    RUN dotnet restore "subfolder/projectFolder/ConsoleApp1.csproj"
                    COPY . .
                    WORKDIR "/src/subfolder/projectFolder"
                    RUN dotnet build "ConsoleApp1.csproj" -c Release -o /app/build

                    FROM build AS publish
                    RUN dotnet publish "ConsoleApp1.csproj" -c Release -o /app/publish

                    FROM base AS final
                    WORKDIR /app
                    COPY --from=publish /app/publish .
                    ENTRYPOINT ["dotnet", "ConsoleApp1.dll"]
                `));

            assertNotFileContains('Dockerfile', 'EXPOSE');
        });

        testInEmptyFolder("Linux", async () => {
            await testDotNetCoreConsole(
                'Linux',
                'Linux',
                '',
                'subfolder/projectFolder',
                'ConsoleApp1.csproj',
                dotNetCoreConsole_20_ProjectFileContents,
                removeIndentation(`
                    FROM microsoft/dotnet:2.0-runtime AS base
                    WORKDIR /app

                    FROM microsoft/dotnet:2.0-sdk AS build
                    WORKDIR /src
                    COPY ["subfolder/projectFolder/ConsoleApp1.csproj", "subfolder/projectFolder/"]
                    RUN dotnet restore "subfolder/projectFolder/ConsoleApp1.csproj"
                    COPY . .
                    WORKDIR "/src/subfolder/projectFolder"
                    RUN dotnet build "ConsoleApp1.csproj" -c Release -o /app/build

                    FROM build AS publish
                    RUN dotnet publish "ConsoleApp1.csproj" -c Release -o /app/publish

                    FROM base AS final
                    WORKDIR /app
                    COPY --from=publish /app/publish .
                    ENTRYPOINT ["dotnet", "ConsoleApp1.dll"]
                `));

            assertNotFileContains('Dockerfile', 'EXPOSE');
        });
    });

    suite(".NET Core Console 1.1", async () => {
        testInEmptyFolder("Windows", async () => {
            await testDotNetCoreConsole(
                'Windows',
                'Windows',
                windows10RS5,
                'subfolder/projectFolder',
                'ConsoleApp1.csproj',
                dotNetCoreConsole_11_ProjectFileContents);

            assertNotFileContains('Dockerfile', 'EXPOSE');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:1.1-runtime AS base');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:1.1-sdk AS build');
        });

        testInEmptyFolder("Linux", async () => {
            await testDotNetCoreConsole(
                'Linux',
                'Linux',
                '',
                'subfolder/projectFolder',
                'ConsoleApp1.csproj',
                dotNetCoreConsole_11_ProjectFileContents);

            assertNotFileContains('Dockerfile', 'EXPOSE');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:1.1-runtime AS base');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:1.1-sdk AS build');
        });
    });

    suite(".NET Core Console 2.2", async () => {
        testInEmptyFolder("Windows", async () => {
            await testDotNetCoreConsole(
                'Windows',
                'Windows',
                windows10RS5,
                'subfolder/projectFolder',
                'ConsoleApp1.csproj',
                dotNetCoreConsole_22_ProjectFileContents);

            assertNotFileContains('Dockerfile', 'EXPOSE');
            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/runtime:2.2-nanoserver-1809 AS base');
            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/sdk:2.2-nanoserver-1809 AS build');
        });

        testInEmptyFolder("Linux", async () => {
            await testDotNetCoreConsole(
                'Linux',
                'Linux',
                '',
                'subfolder/projectFolder',
                'ConsoleApp1.csproj',
                dotNetCoreConsole_22_ProjectFileContents);

            assertNotFileContains('Dockerfile', 'EXPOSE');
            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/runtime:2.2 AS base');
            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/sdk:2.2 AS build');
        });
    });

    // ASP.NET Core

    suite("ASP.NET Core 2.2", async () => {
        testInEmptyFolder("Default port (80)", async () => {
            await writeFile('projectFolder1', 'aspnetapp.csproj', dotNetCoreConsole_21_ProjectFileContents);
            await testConfigureDocker(
                'ASP.NET Core',
                undefined,
                ['Windows', TestInput.UseDefaultValue]
            );

            assertFileContains('Dockerfile', 'EXPOSE 80');
        });

        testInEmptyFolder("No port", async () => {
            await writeFile('projectFolder1', 'aspnetapp.csproj', dotNetCoreConsole_21_ProjectFileContents);
            await testConfigureDocker(
                'ASP.NET Core',
                undefined,
                ['Windows', '']
            );

            assertNotFileContains('Dockerfile', 'EXPOSE');
        });

        testInEmptyFolder("Windows 10 RS5", async () => {
            await testAspNetCore(
                'Windows',
                'Windows',
                windows10RS5,
                'AspNetApp1',
                'project1.csproj',
                aspNet_22_ProjectFileContents,
                removeIndentation(`
                    #Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
                    #For more information, please see https://aka.ms/containercompat

                    FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-nanoserver-1809 AS base
                    WORKDIR /app
                    EXPOSE 1234

                    FROM mcr.microsoft.com/dotnet/core/sdk:2.2-nanoserver-1809 AS build
                    WORKDIR /src
                    COPY ["AspNetApp1/project1.csproj", "AspNetApp1/"]
                    RUN dotnet restore "AspNetApp1/project1.csproj"
                    COPY . .
                    WORKDIR "/src/AspNetApp1"
                    RUN dotnet build "project1.csproj" -c Release -o /app/build

                    FROM build AS publish
                    RUN dotnet publish "project1.csproj" -c Release -o /app/publish

                    FROM base AS final
                    WORKDIR /app
                    COPY --from=publish /app/publish .
                    ENTRYPOINT ["dotnet", "project1.dll"]
                `));
        });

        testInEmptyFolder("Linux", async () => {
            await testAspNetCore(
                'Linux',
                'Linux',
                '',
                'project2',
                'project2.csproj',
                aspNet_22_ProjectFileContents,
                removeIndentation(`
                    FROM mcr.microsoft.com/dotnet/core/aspnet:2.2 AS base
                    WORKDIR /app
                    EXPOSE 1234

                    FROM mcr.microsoft.com/dotnet/core/sdk:2.2 AS build
                    WORKDIR /src
                    COPY ["project2/project2.csproj", "project2/"]
                    RUN dotnet restore "project2/project2.csproj"
                    COPY . .
                    WORKDIR "/src/project2"
                    RUN dotnet build "project2.csproj" -c Release -o /app/build

                    FROM build AS publish
                    RUN dotnet publish "project2.csproj" -c Release -o /app/publish

                    FROM base AS final
                    WORKDIR /app
                    COPY --from=publish /app/publish .
                    ENTRYPOINT ["dotnet", "project2.dll"]
                `));
        });

        testInEmptyFolder("Windows 10 RS4", async () => {
            await testAspNetCore(
                'Windows',
                'Windows',
                windows10RS4,
                'AspNetApp1',
                'project1.csproj',
                aspNet_22_ProjectFileContents);

            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-nanoserver-1803 AS base');
            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/sdk:2.2-nanoserver-1803 AS build');
        });

        testInEmptyFolder("Windows 10 RS3", async () => {
            await testAspNetCore(
                'Windows',
                'Windows',
                windows10RS3,
                'AspNetApp1',
                'project1.csproj',
                aspNet_22_ProjectFileContents);

            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-nanoserver-1709 AS base');
            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/sdk:2.2-nanoserver-1709 AS build');
        });

        testInEmptyFolder("Windows Server 2016", async () => {
            await testAspNetCore(
                'Windows',
                'Windows',
                windowsServer2016,
                'AspNetApp1',
                'project1.csproj',
                aspNet_22_ProjectFileContents);

            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-nanoserver-sac2016 AS base');
            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/sdk:2.2-nanoserver-sac2016 AS build');
        });

        testInEmptyFolder("Host=Linux", async () => {
            await testAspNetCore(
                'Windows',
                'Linux',
                '',
                'AspNetApp1',
                'project1.csproj',
                aspNet_22_ProjectFileContents);

            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-nanoserver-1903 AS base');
            assertFileContains('Dockerfile', 'FROM mcr.microsoft.com/dotnet/core/sdk:2.2-nanoserver-1903 AS build');
        });
    });

    suite("ASP.NET Core 1.1", async () => {
        testInEmptyFolder("Windows", async () => {
            await testAspNetCore(
                'Windows',
                'Windows',
                windows10RS5,
                'AspNetApp1',
                'project1.csproj',
                aspNet_10_ProjectFileContents);

            assertFileContains('Dockerfile', 'FROM microsoft/aspnetcore:1.1 AS base');
            assertFileContains('Dockerfile', 'FROM microsoft/aspnetcore-build:1.1 AS build');
        });
    });

    suite("ASP.NET Core 2.0", async () => {
        testInEmptyFolder("Linux", async () => {
            await testAspNetCore(
                'Linux',
                'Linux',
                '',
                'project2',
                'project2.csproj',
                aspNet_20_ProjectFileContents);

            assertFileContains('Dockerfile', 'FROM microsoft/aspnetcore:2.0 AS base');
            assertFileContains('Dockerfile', 'FROM microsoft/aspnetcore-build:2.0 AS build');
        });
    });


    // Java

    suite("Java", () => {
        testInEmptyFolder("No port", async () => {
            await testConfigureDocker(
                'Java',
                undefined,
                [''],
                ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertNotFileContains('Dockerfile', 'EXPOSE');
        });

        testInEmptyFolder("Default port", async () => {
            await testConfigureDocker(
                'Java',
                undefined,
                [TestInput.UseDefaultValue],
                ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'EXPOSE 3000');
        });

        testInEmptyFolder("No pom file", async () => {
            await testConfigureDocker(
                'Java',
                {
                    configurePlatform: 'Java',
                    configureOs: undefined,
                    packageFileType: undefined,
                    packageFileSubfolderDepth: undefined,
                },
                ['1234'],
                ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'EXPOSE 1234');
            assertFileContains('Dockerfile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD testoutput.jar testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar testoutput.jar');
        });

        testInEmptyFolder("Empty pom file", async () => {
            await writeFile('', 'pom.xml', `
                <? xml version = "1.0" encoding = "UTF-8" ?>
                    `);

            await testConfigureDocker(
                'Java',
                {
                    configurePlatform: 'Java',
                    configureOs: undefined,
                    packageFileType: 'pom.xml',
                    packageFileSubfolderDepth: '0',
                },
                [TestInput.UseDefaultValue /*port*/],
                ['pom.xml', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('Dockerfile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD testoutput.jar testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar testoutput.jar');
        });

        testInEmptyFolder("Pom file", async () => {
            await writeFile('', 'pom.xml', `
                    <?xml version="1.0" encoding="UTF-8"?>
                        <project xmlns="http://maven.apache.org/POM/4.0.0"
                        xmlns:xsi = "http://www.w3.org/2001/XMLSchema-instance"
                        xsi:schemaLocation = "http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
            <modelVersion>4.0.0 </modelVersion>

            <groupId>com.microsoft.azure</groupId>
            <artifactId>app-artifact-id</artifactId>
            <version>1.0-SNAPSHOT</version>
            <packaging>jar</packaging>

            <name>app-on-azure</name>
            <description>Test</description>
            </project>
            `);

            await testConfigureDocker(
                'Java',
                {
                    configurePlatform: 'Java',
                    configureOs: undefined,
                    packageFileType: 'pom.xml',
                    packageFileSubfolderDepth: '0',
                },
                [TestInput.UseDefaultValue /*port*/],
                ['pom.xml', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']);

            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('Dockerfile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD target/app-artifact-id-1.0-SNAPSHOT.jar testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar testoutput.jar');
        });

        testInEmptyFolder("Empty gradle file - defaults", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('', 'build.gradle', ``);

            await testConfigureDocker('Java',
                {
                    configurePlatform: 'Java',
                    configureOs: undefined,
                    packageFileType: 'build.gradle',
                    packageFileSubfolderDepth: '0',
                },
                [TestInput.UseDefaultValue /*port*/],
                ['build.gradle', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('Dockerfile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD build/libs/testOutput-0.0.1.jar testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar testoutput.jar');
        });

        testInEmptyFolder("Gradle with jar", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('', 'build.gradle', gradleWithJarContents);

            await testConfigureDocker(
                'Java',
                {
                    configurePlatform: 'Java',
                    configureOs: undefined,
                    packageFileType: 'build.gradle',
                    packageFileSubfolderDepth: '0',
                },
                [TestInput.UseDefaultValue /*port*/],
                ['build.gradle', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('Dockerfile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD build/libs/testOutput-1.2.3.jar testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar testoutput.jar');
        });

    });

    // Python

    suite("Python", () => {
        testInEmptyFolder("Python", async () => {
            await testConfigureDocker(
                'Python',
                {
                    configurePlatform: 'Python',
                    configureOs: undefined,
                    packageFileType: undefined,
                    packageFileSubfolderDepth: undefined
                },
                [TestInput.UseDefaultValue /*port*/],
                ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
            );

            assertFileContains('Dockerfile', 'FROM python:alpine');
            assertFileContains('Dockerfile', 'LABEL Name=testoutput Version=0.0.1');
            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('Dockerfile', 'CMD ["python3", "-m", "testoutput"]');
        });
    });

    // Ruby

    suite("Ruby", () => {
        testInEmptyFolder("Ruby, empty folder", async () => {
            await testConfigureDocker(
                'Ruby',
                {
                    configurePlatform: 'Ruby',
                    configureOs: undefined,
                    packageFileType: undefined,
                    packageFileSubfolderDepth: undefined
                },
                [TestInput.UseDefaultValue /*port*/],
                ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']);

            assertFileContains('Dockerfile', 'FROM ruby:2.5-slim');
            assertFileContains('Dockerfile', 'LABEL Name=testoutput Version=0.0.1');
            assertFileContains('Dockerfile', 'COPY Gemfile Gemfile.lock ./');
            assertFileContains('Dockerfile', 'RUN bundle install');
            assertFileContains('Dockerfile', 'CMD ["ruby", "testoutput.rb"]');
        });
    });

    // C++

    suite("C++", () => {
        testInEmptyFolder("C++", async () => {
            await testConfigureDocker(
                'C++',
                {
                    configurePlatform: 'C++',
                    configureOs: undefined,
                    packageFileType: undefined,
                    packageFileSubfolderDepth: undefined
                });

            assertFileContains('Dockerfile', 'FROM gcc:latest');
            assertFileContains('Dockerfile', 'COPY . /usr/src/myapp');
            assertFileContains('Dockerfile', 'WORKDIR /usr/src/myapp');
            assertFileContains('Dockerfile', 'RUN g++ -o myapp main.cpp');
            assertFileContains('Dockerfile', 'CMD ["./myapp"]');
            assertNotFileContains('Dockerfile', 'EXPOSE');
        });
    });

    suite("'Other'", () => {
        testInEmptyFolder("with package.json", async () => {
            await writeFile('', 'package.json', JSON.stringify({
                "name": "myexpressapp",
                "version": "1.2.3",
                "private": true,
                "scripts": {
                    "start": "node ./bin/www"
                },
                "dependencies": {
                    "cookie-parser": "~1.4.3",
                    "debug": "~2.6.9",
                    "express": "~4.16.0",
                    "http-errors": "~1.6.2",
                    "jade": "~1.11.0",
                    "morgan": "~1.9.0"
                }
            }))
            await testConfigureDocker(
                'Other',
                {
                    configurePlatform: 'Other',
                    configureOs: undefined,
                    packageFileType: 'package.json',
                    packageFileSubfolderDepth: '0'
                },
                [TestInput.UseDefaultValue /*port*/],
                ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore', 'package.json']);

            let dockerfileContents = await readFile('Dockerfile');
            let composeContents = await readFile('docker-compose.yml');
            let debugComposeContents = await readFile('docker-compose.debug.yml');

            assert.strictEqual(dockerfileContents, removeIndentation(`
                FROM docker/whalesay:latest
                LABEL Name=testoutput Version=1.2.3
                RUN apt-get -y update && apt-get install -y fortunes
                CMD /usr/games/fortune -a | cowsay
                `));
            assert.strictEqual(composeContents, removeIndentation(`
                version: '2.1'

                services:
                  testoutput:
                    image: testoutput
                    build: .
                    ports:
                      - 3000:3000`));
            assert.strictEqual(debugComposeContents, removeIndentation(`
                version: '2.1'

                services:
                  testoutput:
                    image: testoutput
                    build:
                      context: .
                      dockerfile: Dockerfile
                    ports:
                      - 3000:3000`));
        });
    });

    // API (vscode-docker.api.configure)

    suite("API", () => {
        suite("Partially-specified options", async () => {
            testInEmptyFolder("Telemetry properties are set correctly", async () => {
                await testConfigureDockerViaApi(
                    {
                        rootPath: testRootFolder,
                        outputFolder: testRootFolder,
                        platform: 'Ruby',
                        ports: [234]
                    }
                );
            });

            testInEmptyFolder("Only platform specified, others come from user", async () => {
                await testConfigureDockerViaApi(
                    {
                        rootPath: testRootFolder,
                        outputFolder: testRootFolder,
                        platform: 'Ruby'
                    },
                    ["555"], // port
                    ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
                );
                assertFileContains('Dockerfile', 'EXPOSE 555');
            });

            testInEmptyFolder("Only platform/OS specified, others come from user", async () => {
                await writeFile('projectFolder1', 'aspnetapp.csproj', dotNetCoreConsole_21_ProjectFileContents);
                await writeFile('projectFolder2', 'aspnetapp.csproj', dotNetCoreConsole_21_ProjectFileContents);

                await testConfigureDockerViaApi(
                    {
                        rootPath: testRootFolder,
                        outputFolder: testRootFolder,
                        platform: '.NET Core Console',
                        os: "Linux"
                    },
                    [
                        'projectFolder2/aspnetapp.csproj'
                    ],
                    ['Dockerfile', '.dockerignore', 'projectFolder1/aspnetapp.csproj', 'projectFolder2/aspnetapp.csproj']
                );
                assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "aspnetapp.dll"]');
                assertNotFileContains('Dockerfile', 'projectFolder1');
                assertNotFileContains('Dockerfile', 'EXPOSE');
            });

            testInEmptyFolder("Only port specified, others come from user", async () => {
                await testConfigureDockerViaApi(
                    {
                        rootPath: testRootFolder,
                        outputFolder: testRootFolder,
                        ports: [444]
                    },
                    ["Ruby"],
                    ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore']
                );
                assertFileContains('Dockerfile', 'EXPOSE 444');
            });

            suite("Requirements from IoT team", async () => {
                // We will be passed a directory path which will be the service folder. The dockerFile needs to be generated at this location. This holds true for all language types.
                // The csproj might be present in this folder or a sub directory or none at all (if the app is not C# type).
                // We will not be passed the csproj location. The language-type prompts will be presented by the plugin like they appear today. Platform will not be passed in. All the language specific processing should happen within this plugin.
                // Will pass in: Port number, Operating System, folder path where the dockerFile should be created, service name if desired.
                // The service folder will only have 0 or 1 csproj within them. So even though there are multiple service directories within the root, we will only be passed 1 service directory at a time, so that only 1 dockerFile generation happens at a time.
                // So the command which is "Add DockerFile to this Workspace" now extends to "Add DockerFile to the directory", and we would do all the searching and processing only within the passed directory path.

                testInEmptyFolder("All files in service folder, output to service folder", async () => {
                    let rootFolder = 'serviceFolder';
                    await writeFile(rootFolder, 'somefile1.cs', "// Some file");
                    await writeFile(rootFolder, 'aspnetapp.csproj', dotNetCoreConsole_21_ProjectFileContents);

                    await testConfigureDockerViaApi(
                        {
                            rootPath: path.join(testRootFolder, 'serviceFolder'),
                            outputFolder: path.join(testRootFolder, 'serviceFolder'),
                            os: "Linux",
                            ports: [1234]
                        },
                        ['.NET Core Console'],
                        ['serviceFolder/Dockerfile', 'serviceFolder/.dockerignore', 'serviceFolder/somefile1.cs', 'serviceFolder/aspnetapp.csproj']
                    );
                    assertFileContains('serviceFolder/Dockerfile', 'ENTRYPOINT ["dotnet", "aspnetapp.dll"]');
                });


                testInEmptyFolder(".csproj file in subfolder, output to service folder", async () => {
                    let rootFolder = 'serviceFolder';
                    await writeFile(path.join(rootFolder, 'subfolder1'), 'somefile1.cs', "// Some file");
                    await writeFile(path.join(rootFolder, 'subfolder1'), 'aspnetapp.csproj', dotNetCoreConsole_21_ProjectFileContents);

                    await testConfigureDockerViaApi(
                        {
                            rootPath: path.join(testRootFolder, 'serviceFolder'),
                            outputFolder: path.join(testRootFolder, 'serviceFolder'),
                            os: "Windows",
                            ports: [1234]
                        },
                        ['.NET Core Console'],
                        ['serviceFolder/Dockerfile', 'serviceFolder/.dockerignore', 'serviceFolder/subfolder1/somefile1.cs', 'serviceFolder/subfolder1/aspnetapp.csproj']
                    );
                    assertFileContains('serviceFolder/Dockerfile', 'ENTRYPOINT ["dotnet", "aspnetapp.dll"]');
                });

                testInEmptyFolder(".csproj file in subfolder, output to subfolder", async () => {
                    let rootFolder = 'serviceFolder';
                    await writeFile(path.join(rootFolder, 'subfolder1'), 'somefile1.cs', "// Some file");
                    await writeFile(path.join(rootFolder, 'subfolder1'), 'aspnetapp.csproj', aspNet_21_ProjectFileContents);

                    await testConfigureDockerViaApi(
                        {
                            rootPath: path.join(testRootFolder, 'serviceFolder'),
                            outputFolder: path.join(testRootFolder, 'serviceFolder', 'subfolder1'),
                            os: "Windows",
                            ports: [1234, 5678]
                        },
                        ['ASP.NET Core'], ['serviceFolder/subfolder1/Dockerfile', 'serviceFolder/subfolder1/.dockerignore', 'serviceFolder/subfolder1/somefile1.cs', 'serviceFolder/subfolder1/aspnetapp.csproj']
                    );
                    assertFileContains('serviceFolder/subfolder1/Dockerfile', 'ENTRYPOINT ["dotnet", "aspnetapp.dll"]');
                });
            });
        });
    });
});
