/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as gradleParser from "gradle-to-js/lib/parser";
import { EOL } from 'os';
import * as path from "path";
import * as pomParser from "pom-parser";
import * as vscode from "vscode";
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { globAsync } from '../helpers/async';
import { OS, Platform, promptForPort, quickPickOS, quickPickPlatform } from './config-utils';

export type ConfigureTelemetryProperties = {
    configurePlatform?: Platform;
    configureOs?: OS;
    packageFileType?: string; // 'build.gradle', 'pom.xml', 'package.json', '.csproj'
    packageFileSubfolderDepth?: string; // 0 = project/etc file in root folder, 1 = in subfolder, 2 = in subfolder of subfolder, etc.
};

// Note: serviceName includes the path of the service relative to the generated file, e.g. 'projectFolder1/myAspNetService'
// tslint:disable-next-line:max-func-body-length
function genDockerFile(serviceName: string, platform: string, os: string, port: string, { cmd, author, version, artifactName }: PackageJson): string {
    switch (platform.toLowerCase()) {
        case 'node.js':

            return `FROM node:8.9-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE ${port}
CMD ${cmd}`;

        case 'go':

            return `
#build stage
FROM golang:alpine AS builder
WORKDIR /go/src/app
COPY . .
RUN apk add --no-cache git
RUN go get -d -v ./...
RUN go install -v ./...

#final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /go/bin/app /app
ENTRYPOINT ./app
LABEL Name=${serviceName} Version=${version}
EXPOSE ${port}
`;

        case '.net core console':

            if (os.toLowerCase() === 'windows') {
                return `

FROM microsoft/dotnet:2.0-runtime-nanoserver-1709 AS base
WORKDIR /app

FROM microsoft/dotnet:2.0-sdk-nanoserver-1709 AS build
WORKDIR /src
COPY ${serviceName}.csproj ${serviceName}/
RUN dotnet restore ${serviceName}/${serviceName}.csproj
WORKDIR /src/${serviceName}
COPY . .
RUN dotnet build ${serviceName}.csproj -c Release -o /app

FROM build AS publish
RUN dotnet publish ${serviceName}.csproj -c Release -o /app

FROM base AS final
WORKDIR /app
COPY --from=publish /app .
ENTRYPOINT ["dotnet", "${serviceName}.dll"]
`;
            } else {
                return `
FROM microsoft/dotnet:2.0-runtime AS base
WORKDIR /app

FROM microsoft/dotnet:2.0-sdk AS build
WORKDIR /src
COPY ${serviceName}.csproj ${serviceName}/
RUN dotnet restore ${serviceName}/${serviceName}.csproj
WORKDIR /src/${serviceName}
COPY . .
RUN dotnet build ${serviceName}.csproj -c Release -o /app

FROM build AS publish
RUN dotnet publish ${serviceName}.csproj -c Release -o /app

FROM base AS final
WORKDIR /app
COPY --from=publish /app .
ENTRYPOINT ["dotnet", "${serviceName}.dll"]
`;
            }

        case 'asp.net core':

            if (os.toLowerCase() === 'windows') {
                return `
FROM microsoft/aspnetcore:2.0-nanoserver-1709 AS base
WORKDIR /app
EXPOSE ${port}

FROM microsoft/aspnetcore-build:2.0-nanoserver-1709 AS build
WORKDIR /src
COPY ${serviceName}.csproj ${serviceName}/
RUN dotnet restore ${serviceName}/${serviceName}.csproj
WORKDIR /src/${serviceName}
COPY . .
RUN dotnet build ${serviceName}.csproj -c Release -o /app

FROM build AS publish
RUN dotnet publish ${serviceName}.csproj -c Release -o /app

FROM base AS final
WORKDIR /app
COPY --from=publish /app .
ENTRYPOINT ["dotnet", "${serviceName}.dll"]
`;
            } else {
                return `
FROM microsoft/aspnetcore:2.0 AS base
WORKDIR /app
EXPOSE ${port}

FROM microsoft/aspnetcore-build:2.0 AS build
WORKDIR /src
COPY ${serviceName}.csproj ${serviceName}/
RUN dotnet restore ${serviceName}/${serviceName}.csproj
WORKDIR /src/${serviceName}
COPY . .
RUN dotnet build ${serviceName}.csproj -c Release -o /app

FROM build AS publish
RUN dotnet publish ${serviceName}.csproj -c Release -o /app

FROM base AS final
WORKDIR /app
COPY --from=publish /app .
ENTRYPOINT ["dotnet", "${serviceName}.dll"]
`;
            }

        case 'python':

            return `
# Python support can be specified down to the minor or micro version
# (e.g. 3.6 or 3.6.3).
# OS Support also exists for jessie & stretch (slim and full).
# See https://hub.docker.com/r/library/python/ for all supported Python
# tags from Docker Hub.
FROM python:alpine

# If you prefer miniconda:
#FROM continuumio/miniconda3

LABEL Name=${serviceName} Version=${version}
EXPOSE ${port}

WORKDIR /app
ADD . /app

# Using pip:
RUN python3 -m pip install -r requirements.txt
CMD ["python3", "-m", "${serviceName}"]

# Using pipenv:
#RUN python3 -m pip install pipenv
#RUN pipenv install --ignore-pipfile
#CMD ["pipenv", "run", "python3", "-m", "${serviceName}"]

# Using miniconda (make sure to replace 'myenv' w/ your environment name):
#RUN conda env create -f environment.yml
#CMD /bin/bash -c "source activate myenv && python3 -m ${serviceName}"
`;

        case 'ruby':

            return `
FROM ruby:2.5-slim

LABEL Name=${serviceName} Version=${version}
EXPOSE ${port}

# throw errors if Gemfile has been modified since Gemfile.lock
RUN bundle config --global frozen 1

WORKDIR /app
COPY . /app

COPY Gemfile Gemfile.lock ./
RUN bundle install

CMD ["ruby", "${serviceName}.rb"]
`;

        case 'java':
            const artifact = artifactName ? artifactName : `${serviceName}.jar`;
            return `
FROM openjdk:8-jdk-alpine
VOLUME /tmp
ARG JAVA_OPTS
ENV JAVA_OPTS=$JAVA_OPTS
ADD ${artifact} ${serviceName}.jar
EXPOSE ${port}
ENTRYPOINT exec java $JAVA_OPTS -jar ${serviceName}.jar
# For Spring-Boot project, use the entrypoint below to reduce Tomcat startup time.
#ENTRYPOINT exec java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar ${serviceName}.jar
`;

        default:

            return `
FROM docker/whalesay:latest
LABEL Name=${serviceName} Version=${version}
RUN apt-get -y update && apt-get install -y fortunes
CMD /usr/games/fortune -a | cowsay
`;
    }
}

function genDockerCompose(serviceName: string, platform: string, os: string, port: string): string {
    switch (platform.toLowerCase()) {
        case 'node.js':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    environment:
      NODE_ENV: production
    ports:
      - ${port}:${port}`;

        case 'go':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;

        case '.net core console':
            // we don't generate compose files for .net core
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;

        case 'asp.net core':
            // we don't generate compose files for .net core
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;

        case 'python':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;

        case 'ruby':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;

        case 'java':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;

        default:
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;
    }
}

// tslint:disable-next-line:max-func-body-length
function genDockerComposeDebug(serviceName: string, platform: string, os: string, port: string, { fullCommand: cmd }: PackageJson): string {
    switch (platform.toLowerCase()) {
        case 'node.js':

            const cmdArray: string[] = cmd.split(' ');
            if (cmdArray[0].toLowerCase() === 'node') {
                cmdArray.splice(1, 0, '--inspect=0.0.0.0:9229');
                cmd = `command: ${cmdArray.join(' ')}`;
            } else {
                cmd = '## set your startup file here\n    command: node --inspect index.js';
            }

            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    environment:
      NODE_ENV: development
    ports:
      - ${port}:${port}
      - 9229:9229
    ${cmd}`;

        case 'go':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
        - ${port}:${port}
`;

        case '.net core console':
            // we don't generate compose files for .net core
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;

        case 'asp.net core':
            // we don't generate compose files for .net core
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;

        case 'python':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
        - ${port}:${port}
`;

        case 'ruby':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
        - ${port}:${port}
`;

        case 'java':
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      JAVA_OPTS: -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005,quiet=y
    ports:
      - ${port}:${port}
      - 5005:5005
    `;

        default:
            return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - ${port}:${port}
`;
    }
}

function genDockerIgnoreFile(service: string, platformType: string, os: string, port: string): string {
    return `node_modules
npm-debug.log
Dockerfile*
docker-compose*
.dockerignore
.git
.gitignore
README.md
LICENSE
.vscode`;
}

interface PackageJson {
    npmStart: boolean, //has npm start
    cmd: string,
    fullCommand: string, //full command
    author: string,
    version: string,
    artifactName: string
}

async function getPackageJson(folderPath: string): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, 'package.json'), null, 1, null);
}

function getDefaultPackageJson(): PackageJson {
    return {
        npmStart: true,
        fullCommand: 'npm start',
        cmd: 'npm start',
        author: 'author',
        version: '0.0.1',
        artifactName: ''
    };
}

async function readPackageJson(folderPath: string): Promise<{ packagePath?: string, packageContents: PackageJson }> {
    // open package.json and look for main, scripts start
    const uris: vscode.Uri[] = await getPackageJson(folderPath);
    let packageContents: PackageJson = getDefaultPackageJson(); //default
    let packagePath: string | undefined;

    if (uris && uris.length > 0) {
        packagePath = uris[0].fsPath;
        const json = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        if (json.scripts && json.scripts.start) {
            packageContents.npmStart = true;
            packageContents.fullCommand = json.scripts.start;
            packageContents.cmd = 'npm start';
        } else if (json.main) {
            packageContents.npmStart = false;
            packageContents.fullCommand = 'node' + ' ' + json.main;
            packageContents.cmd = packageContents.fullCommand;
        } else {
            packageContents.fullCommand = '';
        }

        if (json.author) {
            packageContents.author = json.author;
        }

        if (json.version) {
            packageContents.version = json.version;
        }
    }

    return { packagePath, packageContents };
}

/**
 * Looks for a pom.xml or build.gradle file, and returns its parsed contents, or else a default package contents if none path
 */
async function readPomOrGradle(folderPath: string): Promise<{ foundPath?: string, packageContents: PackageJson }> {
    let pkg: PackageJson = getDefaultPackageJson(); //default
    let foundPath: string | undefined;

    let pomPath = path.join(folderPath, 'pom.xml');
    let gradlePath = path.join(folderPath, 'build.gradle');

    if (await fse.pathExists(pomPath)) {
        foundPath = pomPath;
        let json = await new Promise<any>((resolve, reject) => {
            pomParser.parse({
                filePath: pomPath
            }, (error, response) => {
                if (error) {
                    reject(`Failed to parse pom.xml: ${error}`);
                    return;
                }
                resolve(response.pomObject);
            });
        });
        json = json || {};

        if (json.project && json.project.version) {
            pkg.version = json.project.version;
        }

        if (json.project && json.project.artifactid) {
            pkg.artifactName = `target/${json.project.artifactid}-${pkg.version}.jar`;
        }
    } else if (await fse.pathExists(gradlePath)) {
        foundPath = gradlePath;
        const json = await gradleParser.parseFile(gradlePath);

        if (json.jar && json.jar.version) {
            pkg.version = json.jar.version;
        } else if (json.version) {
            pkg.version = json.version;
        }

        if (json.jar && json.jar.archiveName) {
            pkg.artifactName = `build/libs/${json.jar.archiveName}`;
        } else {
            const baseName = json.jar && json.jar.baseName ? json.jar.baseName : json.archivesBaseName || path.basename(folderPath);
            pkg.artifactName = `build/libs/${baseName}-${pkg.version}.jar`;
        }
    }

    return { foundPath, packageContents: pkg };
}

// Returns the relative path of the project file without the extension
async function findCSProjFile(folderPath: string): Promise<string> {
    const opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Project'
    }

    const projectFiles: string[] = await globAsync('**/*.csproj', { cwd: folderPath });

    if (!projectFiles || !projectFiles.length) {
        throw new Error("No .csproj file could be found.");
    }

    if (projectFiles.length > 1) {
        let items = projectFiles.map(p => <vscode.QuickPickItem>{ label: p });
        const res = await ext.ui.showQuickPick(items, opt);
        return res.label.slice(0, -'.csproj'.length);
    }

    return projectFiles[0].slice(0, -'.csproj'.length);
}

type GeneratorFunction = (serviceName: string, platform: string, os: string, port: string, packageJson?: PackageJson) => string;

const DOCKER_FILE_TYPES: { [key: string]: GeneratorFunction } = {
    'docker-compose.yml': genDockerCompose,
    'docker-compose.debug.yml': genDockerComposeDebug,
    'Dockerfile': genDockerFile,
    '.dockerignore': genDockerIgnoreFile
};

const YES_PROMPT: vscode.MessageItem = {
    title: "Yes",
    isCloseAffordance: false
};
const YES_OR_NO_PROMPTS: vscode.MessageItem[] = [
    YES_PROMPT,
    {
        title: "No",
        isCloseAffordance: true
    }
];

export interface ConfigureApiOptions {
    /**
     * Root folder from which to search for .csproj, package.json, .pom or .gradle files
     */
    rootPath: string;

    /**
     * Output folder for the docker files. Relative paths in the Dockerfile we will calculated based on this folder
     */
    outputFolder: string;

    /**
     * Platform
     */
    platform?: Platform;

    /**
     * Port to expose
     */
    port?: string;

    /**
     * The OS for the images. Currently only needed for .NET platforms.
     */
    os?: OS;
}

export async function configure(actionContext: IActionContext, rootFolderPath?: string): Promise<void> {
    if (!rootFolderPath) {
        let folder: vscode.WorkspaceFolder;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
            folder = vscode.workspace.workspaceFolders[0];
        } else {
            folder = await vscode.window.showWorkspaceFolderPick();
        }

        if (!folder) {
            if (!vscode.workspace.workspaceFolders) {
                throw new Error('Docker files can only be generated if VS Code is opened on a folder.');
            } else {
                throw new Error('Docker files can only be generated if a workspace folder is picked in VS Code.');
            }
        }

        rootFolderPath = folder.uri.fsPath;
    }

    return configureCore(
        actionContext,
        {
            rootPath: rootFolderPath,
            outputFolder: rootFolderPath
        });
}

export async function configureApi(actionContext: IActionContext, options: ConfigureApiOptions): Promise<void> {
    return configureCore(actionContext, options);
}

// tslint:disable-next-line:max-func-body-length // Because of nested functions
async function configureCore(actionContext: IActionContext, options: ConfigureApiOptions): Promise<void> {
    let properties: TelemetryProperties & ConfigureTelemetryProperties = actionContext.properties;
    let rootFolderPath: string = options.rootPath;
    let outputFolder = options.outputFolder;

    const platformType: Platform = options.platform || await quickPickPlatform();
    properties.configurePlatform = platformType;

    let os: OS | undefined = options.os;
    if (!os && platformType.toLowerCase().includes('.net')) {
        os = await quickPickOS();
    }
    properties.configureOs = os;

    let port: string = options.port;
    if (!port) {
        if (platformType.toLowerCase().includes('.net')) {
            port = await promptForPort(80);
        } else {
            port = await promptForPort(3000);
        }
    }

    let serviceNameAndPathRelativeToOutput: string;
    {
        // Scope serviceNameAndPathRelativeToRoot only to this block of code
        let serviceNameAndPathRelativeToRoot: string;
        if (platformType.toLowerCase().includes('.net')) {
            serviceNameAndPathRelativeToRoot = await findCSProjFile(rootFolderPath);
            properties.packageFileType = '.csproj';
            properties.packageFileSubfolderDepth = getSubfolderDepth(serviceNameAndPathRelativeToRoot);
        } else {
            serviceNameAndPathRelativeToRoot = path.basename(rootFolderPath).toLowerCase();
        }

        // We need paths in the Dockerfile to be relative to the output folder, not the root
        serviceNameAndPathRelativeToOutput = path.relative(outputFolder, path.join(rootFolderPath, serviceNameAndPathRelativeToRoot));
        serviceNameAndPathRelativeToOutput = serviceNameAndPathRelativeToOutput.replace(/\\/g, '/');
    }

    let packageContents: PackageJson = getDefaultPackageJson();
    if (platformType === 'Java') {
        let foundPomOrGradlePath: string | undefined;
        ({ packageContents, foundPath: foundPomOrGradlePath } = await readPomOrGradle(rootFolderPath));
        if (foundPomOrGradlePath) {
            properties.packageFileType = path.basename(foundPomOrGradlePath);
            properties.packageFileSubfolderDepth = getSubfolderDepth(foundPomOrGradlePath);
        }
    } else {
        let packagePath: string | undefined;
        ({ packagePath, packageContents } = await readPackageJson(rootFolderPath));
        if (packagePath) {
            properties.packageFileType = 'package.json';
            properties.packageFileSubfolderDepth = getSubfolderDepth(packagePath);
        }
    }

    let filesWritten: string[] = [];

    await Promise.all(Object.keys(DOCKER_FILE_TYPES).map(async (fileName) => {
        if (platformType.toLowerCase().includes('.net') && fileName.includes('docker-compose')) {
            // don't generate docker-compose files for .NET Core apps
            return;
        }

        return createWorkspaceFileIfNotExists(fileName, DOCKER_FILE_TYPES[fileName]);
    }));

    // Don't wait
    vscode.window.showInformationMessage(
        filesWritten.length ?
            `The following files were written into the workspace:${EOL}${EOL}${filesWritten.join(', ')}` :
            "No files were written"
    );

    async function createWorkspaceFileIfNotExists(fileName: string, generatorFunction: GeneratorFunction): Promise<void> {
        const filePath = path.join(outputFolder, fileName);
        let writeFile = false;
        if (await fse.pathExists(filePath)) {
            const response: vscode.MessageItem = await vscode.window.showErrorMessage(`"${fileName}" already exists.Would you like to overwrite it?`, ...YES_OR_NO_PROMPTS);
            if (response === YES_PROMPT) {
                writeFile = true;
            }
        } else {
            writeFile = true;
        }

        if (writeFile) {
            // Paths in the docker files should be relative to the Dockerfile (which is in the output folder)
            fs.writeFileSync(filePath, generatorFunction(serviceNameAndPathRelativeToOutput, platformType, os, port, packageContents), { encoding: 'utf8' });
            filesWritten.push(fileName);
        }
    }

    function getSubfolderDepth(filePath: string): string {
        let relativeToRoot = path.relative(outputFolder, path.resolve(outputFolder, filePath));
        let matches = relativeToRoot.match(/[\/\\]/g);
        let depth: number = matches ? matches.length : 0;
        return String(depth);
    }
}
