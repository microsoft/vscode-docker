/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import * as assertEx from './assertEx';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Platform } from "../configureWorkspace/config-utils";
import { ext } from '../extensionVariables';
import { Suite } from 'mocha';
import { configure, ConfigureTelemetryProperties, configureApi, ConfigureApiOptions } from '../configureWorkspace/configure';
import { TestUserInput, IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { globAsync } from '../helpers/async';
import { getTestRootFolder, constants, testInEmptyFolder } from './global.test';

let testRootFolder: string = getTestRootFolder();

suite("configure (Add Docker files to Workspace)", function (this: Suite): void {
    this.timeout(30 * 1000);

    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Docker extension tests');
    ext.outputChannel = outputChannel;

    async function testConfigureDocker(platform: Platform, expectedTelemetryProperties?: ConfigureTelemetryProperties, ...inputs: (string | undefined)[]): Promise<void> {
        // Set up simulated user input
        inputs.unshift(platform);
        const ui: TestUserInput = new TestUserInput(inputs);
        ext.ui = ui;
        let actionContext: IActionContext = {
            properties: { isActivationEvent: 'false', cancelStep: '', errorMessage: '', error: undefined, result: 'Succeeded' },
            measurements: { duration: 0 },
            suppressTelemetry: false,
            rethrowError: false,
            suppressErrorDisplay: false
        };

        await configure(actionContext, testRootFolder);
        assert.equal(inputs.length, 0, 'Not all inputs were used.');

    }

    async function testConfigureDockerViaApi(options: ConfigureApiOptions, ...inputs: (string | undefined)[]): Promise<void> {
        ext.ui = new TestUserInput(inputs);
        await vscode.commands.executeCommand('vscode-docker.api.configure', options);
        assert.equal(inputs.length, 0, 'Not all inputs were used.');
    }

    function verifyTelemetryProperties(actionContext: IActionContext, expectedTelemetryProperties?: ConfigureTelemetryProperties) {
        if (expectedTelemetryProperties) {
            let properties: TelemetryProperties & ConfigureTelemetryProperties = actionContext.properties;
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

    const dotNetCoreConsoleProjectFileContents = `
    <Project Sdk="Microsoft.NET.Sdk" ToolsVersion="15.0">

        <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>netcoreapp2.1</TargetFramework>
        </PropertyGroup>

        <ItemGroup>
        <ProjectReference Include="..\\utils\\utils.csproj" />
        </ItemGroup>

    </Project>
    `;

    const aspNetProjectFileContents = `
    <Project Sdk="Microsoft.NET.Sdk.Web">

    <PropertyGroup>
        <TargetFramework>netcoreapp2.1</TargetFramework>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.AspNetCore.App" />
    </ItemGroup>

    </Project>
    `;

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
                '1234');

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

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
                '4321');

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['package.json', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

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
                '4321');

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['package.json', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 4321');
            assertFileContains('Dockerfile', 'CMD node ./out/dockerExtension');
        });
    });

    // .NET Core Console

    suite(".NET Core Console", () => {
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
                    'Windows', '1234'),
                { message: "No .csproj file could be found." }
            );
        });

        testInEmptyFolder("Multiple project files", async () => {
            await writeFile('projectFolder1', 'aspnetapp.csproj', dotNetCoreConsoleProjectFileContents);
            await writeFile('projectFolder2', 'aspnetapp.csproj', dotNetCoreConsoleProjectFileContents);
            await testConfigureDocker(
                '.NET Core Console',
                {
                    configurePlatform: '.NET Core Console',
                    configureOs: 'Windows',
                    packageFileType: '.csproj',
                    packageFileSubfolderDepth: '1'
                },
                'Windows', '1234', 'projectFolder2/aspnetapp.csproj');

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(
                projectFiles,
                ['Dockerfile', '.dockerignore', 'projectFolder1/aspnetapp.csproj', 'projectFolder2/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertNotFileContains('Dockerfile', 'projectFolder1/aspnetapp');
            assertFileContains('Dockerfile', 'projectFolder2/aspnetapp');
        });

        testInEmptyFolder("Windows", async () => {
            await writeFile('projectFolder', 'aspnetapp.csproj', dotNetCoreConsoleProjectFileContents);

            await testConfigureDocker(
                '.NET Core Console',
                {
                    configurePlatform: '.NET Core Console',
                    configureOs: 'Windows',
                    packageFileType: '.csproj',
                    packageFileSubfolderDepth: '1'
                },
                'Windows', '1234');

            let projectFiles = await getFilesInProject();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertNotFileContains('Dockerfile', 'EXPOSE');
            assertFileContains('Dockerfile', 'RUN dotnet build projectFolder/aspnetapp.csproj -c Release -o /app');
            assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder/aspnetapp.dll"]');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:2.0-runtime-nanoserver-1709 AS base');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:2.0-sdk-nanoserver-1709 AS build');
        });

        testInEmptyFolder("Linux", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('projectFolder2', 'aspnetapp2.csproj', dotNetCoreConsoleProjectFileContents);

            await testConfigureDocker(
                '.NET Core Console',
                {
                    configurePlatform: '.NET Core Console',
                    configureOs: 'Linux',
                    packageFileType: '.csproj',
                    packageFileSubfolderDepth: '1'
                },
                'Linux', '1234');

            let projectFiles = await getFilesInProject();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder2/aspnetapp2.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertNotFileContains('Dockerfile', 'EXPOSE 1234');
            assertFileContains('Dockerfile', 'RUN dotnet build projectFolder2/aspnetapp2.csproj -c Release -o /app');
            assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder2/aspnetapp2.dll"]');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:2.0-runtime AS base');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:2.0-sdk AS build');
        });
    });

    // ASP.NET Core

    suite("ASP.NET Core", () => {
        testInEmptyFolder("ASP.NET Core no project file", async () => {
            await assertEx.throwsOrRejectsAsync(async () => testConfigureDocker('ASP.NET Core', {}, 'Windows', '1234'),
                { message: "No .csproj file could be found." }
            );
        });

        testInEmptyFolder("Windows", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('projectFolder', 'aspnetapp.csproj', aspNetProjectFileContents);

            await testConfigureDocker(
                'ASP.NET Core',
                {
                    configurePlatform: 'ASP.NET Core',
                    configureOs: 'Windows',
                    packageFileType: '.csproj',
                    packageFileSubfolderDepth: '1',
                },
                'Windows', undefined /*use default port*/);

            let projectFiles = await getFilesInProject();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 80');
            assertFileContains('Dockerfile', 'RUN dotnet build projectFolder/aspnetapp.csproj -c Release -o /app');
            assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder/aspnetapp.dll"]');
            assertFileContains('Dockerfile', 'FROM microsoft/aspnetcore-build:2.0-nanoserver-1709 AS build');
        });

        testInEmptyFolder("Linux", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('projectFolder2/subfolder', 'aspnetapp2.csproj', aspNetProjectFileContents);

            await testConfigureDocker(
                'ASP.NET Core',
                {
                    configurePlatform: 'ASP.NET Core',
                    configureOs: 'Linux',
                    packageFileType: '.csproj',
                    packageFileSubfolderDepth: '2',
                },
                'Linux', '1234');

            let projectFiles = await getFilesInProject();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder2/subfolder/aspnetapp2.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 1234');
            assertFileContains('Dockerfile', 'RUN dotnet build projectFolder2/subfolder/aspnetapp2.csproj -c Release -o /app');
            assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder2/subfolder/aspnetapp2.dll"]');
            assertFileContains('Dockerfile', 'FROM microsoft/aspnetcore-build:2.0 AS build');
        });

    });

    // Java

    suite("Java", () => {
        testInEmptyFolder("No pom file", async () => {
            await testConfigureDocker(
                'Java',
                {
                    configurePlatform: 'Java',
                    configureOs: undefined,
                    packageFileType: undefined,
                    packageFileSubfolderDepth: undefined,
                },
                '1234');

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 1234');
            assertFileContains('Dockerfile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD testoutput.jar testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar testoutput.jar');
        });

        testInEmptyFolder("Empty pom file", async () => {
            await writeFile('', 'pom.xml', `
                <?xml version = "1.0" encoding = "UTF-8"?>
                `);

            await testConfigureDocker(
                'Java',
                {
                    configurePlatform: 'Java',
                    configureOs: undefined,
                    packageFileType: 'pom.xml',
                    packageFileSubfolderDepth: '0',
                },
                undefined /*port*/);

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['pom.xml', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('Dockerfile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD testoutput.jar testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar testoutput.jar');
        });

        testInEmptyFolder("Pom file", async () => {
            await writeFile('', 'pom.xml', `
                <?xml version = "1.0" encoding = "UTF-8"?>
                    <project xmlns="http://maven.apache.org/POM/4.0.0"
                        xmlns:xsi = "http://www.w3.org/2001/XMLSchema-instance"
                        xsi:schemaLocation = "http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
                    <modelVersion>4.0.0</modelVersion>

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
                undefined /*port*/);

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['pom.xml', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

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
                undefined /*port*/);

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['build.gradle', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('Dockerfile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD build/libs/testOutput-0.0.1.jar testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar testoutput.jar');
        });

        testInEmptyFolder("Gradle with jar", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('', 'build.gradle', `
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

            await testConfigureDocker(
                'Java',
                {
                    configurePlatform: 'Java',
                    configureOs: undefined,
                    packageFileType: 'build.gradle',
                    packageFileSubfolderDepth: '0',
                },
                undefined /*port*/);

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['build.gradle', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

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
                undefined /*port*/);

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'FROM python:alpine');
            assertFileContains('Dockerfile', 'LABEL Name=testoutput Version=0.0.1');
            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('Dockerfile', 'CMD ["python3", "-m", "testoutput"]');
        });
    });

    // Ruby

    suite("Ruby", () => {
        testInEmptyFolder("Ruby", async () => {
            await testConfigureDocker(
                'Ruby',
                {
                    configurePlatform: 'Ruby',
                    configureOs: undefined,
                    packageFileType: undefined,
                    packageFileSubfolderDepth: undefined
                },
                undefined /*port*/);

            let projectFiles = await getFilesInProject();
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'FROM ruby:2.5-slim');
            assertFileContains('Dockerfile', 'LABEL Name=testoutput Version=0.0.1');
            assertFileContains('Dockerfile', 'COPY Gemfile Gemfile.lock ./');
            assertFileContains('Dockerfile', 'RUN bundle install');
            assertFileContains('Dockerfile', 'CMD ["ruby", "testoutput.rb"]');
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
                        port: '234'
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
                    "555" // port
                );
                let projectFiles = await getFilesInProject();
                assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");
                assertFileContains('Dockerfile', 'EXPOSE 555');
            });

            testInEmptyFolder("Only platform/OS specified, others come from user", async () => {
                await writeFile('projectFolder1', 'aspnetapp.csproj', dotNetCoreConsoleProjectFileContents);
                await writeFile('projectFolder2', 'aspnetapp.csproj', dotNetCoreConsoleProjectFileContents);

                await testConfigureDockerViaApi(
                    {
                        rootPath: testRootFolder,
                        outputFolder: testRootFolder,
                        platform: '.NET Core Console',
                        os: "Linux"
                    },
                    "555", // port
                    'projectFolder2/aspnetapp.csproj'
                );
                let projectFiles = await getFilesInProject();
                assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder1/aspnetapp.csproj', 'projectFolder2/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");
                assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder2/aspnetapp.dll"]');
                assertNotFileContains('Dockerfile', 'projectFolder1');
            });

            testInEmptyFolder("Only port specified, others come from user", async () => {
                await testConfigureDockerViaApi(
                    {
                        rootPath: testRootFolder,
                        outputFolder: testRootFolder,
                        port: "444"
                    },
                    "Ruby"
                );
                let projectFiles = await getFilesInProject();
                assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");
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
                    await writeFile(rootFolder, 'aspnetapp.csproj', dotNetCoreConsoleProjectFileContents);

                    await testConfigureDockerViaApi(
                        {
                            rootPath: path.join(testRootFolder, 'serviceFolder'),
                            outputFolder: path.join(testRootFolder, 'serviceFolder'),
                            os: "Linux",
                            port: "1234"
                        },
                        '.NET Core Console'
                    );
                    let projectFiles = await getFilesInProject();
                    assertEx.unorderedArraysEqual(projectFiles, ['serviceFolder/Dockerfile', 'serviceFolder/.dockerignore', 'serviceFolder/somefile1.cs', 'serviceFolder/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");
                    assertFileContains('serviceFolder/Dockerfile', 'ENTRYPOINT ["dotnet", "aspnetapp.dll"]');
                });


                testInEmptyFolder(".csproj file in subfolder, output to service folder", async () => {
                    let rootFolder = 'serviceFolder';
                    await writeFile(path.join(rootFolder, 'subfolder1'), 'somefile1.cs', "// Some file");
                    await writeFile(path.join(rootFolder, 'subfolder1'), 'aspnetapp.csproj', dotNetCoreConsoleProjectFileContents);

                    await testConfigureDockerViaApi(
                        {
                            rootPath: path.join(testRootFolder, 'serviceFolder'),
                            outputFolder: path.join(testRootFolder, 'serviceFolder'),
                            os: "Windows",
                            port: "1234"
                        },
                        '.NET Core Console'
                    );
                    let projectFiles = await getFilesInProject();
                    assertEx.unorderedArraysEqual(projectFiles, ['serviceFolder/Dockerfile', 'serviceFolder/.dockerignore', 'serviceFolder/subfolder1/somefile1.cs', 'serviceFolder/subfolder1/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");
                    assertFileContains('serviceFolder/Dockerfile', 'ENTRYPOINT ["dotnet", "subfolder1/aspnetapp.dll"]');
                });

                testInEmptyFolder(".csproj file in subfolder, output to subfolder", async () => {
                    let rootFolder = 'serviceFolder';
                    await writeFile(path.join(rootFolder, 'subfolder1'), 'somefile1.cs', "// Some file");
                    await writeFile(path.join(rootFolder, 'subfolder1'), 'aspnetapp.csproj', aspNetProjectFileContents);

                    await testConfigureDockerViaApi(
                        {
                            rootPath: path.join(testRootFolder, 'serviceFolder'),
                            outputFolder: path.join(testRootFolder, 'serviceFolder', 'subfolder1'),
                            os: "Windows",
                            port: "1234"
                        },
                        'ASP.NET Core'
                    );
                    let projectFiles = await getFilesInProject();
                    assertEx.unorderedArraysEqual(projectFiles, ['serviceFolder/subfolder1/Dockerfile', 'serviceFolder/subfolder1/.dockerignore', 'serviceFolder/subfolder1/somefile1.cs', 'serviceFolder/subfolder1/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");
                    assertFileContains('serviceFolder/subfolder1/Dockerfile', 'ENTRYPOINT ["dotnet", "aspnetapp.dll"]');
                });
            });
        });
    });
});
