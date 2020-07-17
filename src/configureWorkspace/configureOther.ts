/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getComposePorts, PackageInfo } from './configure';

export let configureOther = {
    genDockerFile,
    genDockerCompose,
    genDockerComposeDebug,
    defaultPorts: [3000],
    initializeForDebugging: undefined,
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
    return `FROM docker/whalesay:latest
LABEL Name=${serviceNameAndRelativePath} Version=${version}
RUN apt-get -y update && apt-get install -y fortunes
CMD ["sh", "-c", "/usr/games/fortune -a | cowsay"]
`;
}

function genDockerCompose(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[]): string {
    return `version: '3.4'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
${getComposePorts(ports)}`;
}

function genDockerComposeDebug(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], _: Partial<PackageInfo>): string {
    return `version: '3.4'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build:
      context: .
      dockerfile: Dockerfile
${getComposePorts(ports)}`;
}
