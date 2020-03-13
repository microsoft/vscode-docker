/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WorkspaceFolder } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { DockerDebugScaffoldContext } from '../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider } from '../debugging/DockerDebugScaffoldingProvider';
import { PlatformOS } from '../utils/platform';
import { getComposePorts, getExposeStatements, IPlatformGeneratorInfo, PackageInfo } from './configure';

export let configureNode: IPlatformGeneratorInfo = {
    genDockerFile,
    genDockerCompose,
    genDockerComposeDebug,
    defaultPorts: [3000],
    initializeForDebugging,
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
    let exposeStatements = getExposeStatements(ports);

    return `FROM node:10.13-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
${exposeStatements}
CMD ${cmd}`;
}

function genDockerCompose(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[]): string {
    return `version: '3.4'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
    environment:
      NODE_ENV: production
${getComposePorts(ports)}`;
}

function genDockerComposeDebug(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { fullCommand: cmd }: Partial<PackageInfo>): string {
    const inspectConfig = '--inspect=0.0.0.0:9229';
    const cmdArray: string[] = cmd.split(' ');
    if (cmdArray[0].toLowerCase() === 'node') {
        cmdArray.splice(1, 0, inspectConfig);
        cmd = `command: ${cmdArray.join(' ')}`;
    } else {
        cmd = `## set your startup file here\n    command: node ${inspectConfig} index.js`;
    }

    return `version: '3.4'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
    environment:
      NODE_ENV: development
${getComposePorts(ports, 9229)}
    ${cmd}`;
}

async function initializeForDebugging(context: IActionContext, folder: WorkspaceFolder, platformOS: PlatformOS, dockerfile: string, packageInfo: PackageInfo): Promise<void> {
    const scaffoldContext: DockerDebugScaffoldContext = {
        folder: folder,
        platform: 'node',
        actionContext: context,
        dockerfile: dockerfile,
    }

    await dockerDebugScaffoldingProvider.initializeNodeForDebugging(scaffoldContext);
}
