/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getComposePorts, getExposeStatements, IPlatformGeneratorInfo, PackageInfo } from './configure';

export let configureRuby: IPlatformGeneratorInfo = {
    genDockerFile,
    genDockerCompose,
    genDockerComposeDebug,
    defaultPorts: [3000],
    initializeForDebugging: undefined,
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
    let exposeStatements = getExposeStatements(ports);

    return `FROM ruby:2.5-slim

LABEL Name=${serviceNameAndRelativePath} Version=${version}
${exposeStatements}

# throw errors if Gemfile has been modified since Gemfile.lock
RUN bundle config --global frozen 1

WORKDIR /app
COPY . /app

COPY Gemfile Gemfile.lock ./
RUN bundle install

CMD ["ruby", "${serviceNameAndRelativePath}.rb"]
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
