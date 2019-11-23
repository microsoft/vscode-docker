/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPlatformGeneratorInfo, PackageInfo } from './configure';

export let configurePhp: IPlatformGeneratorInfo = {
  genDockerFile,
  genDockerCompose,
  genDockerComposeDebug,
  defaultPorts: undefined, //php:apache has 80 port already exposed
  initializeForDebugging: undefined,
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { cmd, author, version, artifactName }: Partial<PackageInfo>): string {

  return `
FROM php:apache
COPY . /var/www/html
LABEL Name=${serviceNameAndRelativePath} Version=${version}
`;
}

function genDockerCompose(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[]): string {
  return `version: '2.1'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
    volume: .:/var/www/html #mount project dir for active development
    ports: 3000:80  #php:apache exposes port 80 by default, defaults to localhost:3000
`;
}

function genDockerComposeDebug(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { fullCommand: cmd }: Partial<PackageInfo>): string {
  return `version: '2.1'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build:
      context: .
      dockerfile: Dockerfile
      ports: 3000:80`;
}
