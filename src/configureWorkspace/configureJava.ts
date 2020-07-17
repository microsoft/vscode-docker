/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getComposePorts, getExposeStatements, IPlatformGeneratorInfo, PackageInfo } from './configure';

export let configureJava: IPlatformGeneratorInfo = {
    genDockerFile,
    genDockerCompose,
    genDockerComposeDebug,
    defaultPorts: [3000],
    initializeForDebugging: undefined,
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
    let exposeStatements = getExposeStatements(ports);
    const artifact = artifactName ? artifactName : `${serviceNameAndRelativePath}.jar`;

    return `
FROM openjdk:8-jdk-alpine
VOLUME /tmp
ARG JAVA_OPTS
ENV JAVA_OPTS=$JAVA_OPTS
ADD ${artifact} ${serviceNameAndRelativePath}.jar
${exposeStatements}
ENTRYPOINT exec java $JAVA_OPTS -jar ${serviceNameAndRelativePath}.jar
# For Spring-Boot project, use the entrypoint below to reduce Tomcat startup time.
#ENTRYPOINT exec java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar ${serviceNameAndRelativePath}.jar
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
    environment:
      JAVA_OPTS: -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005,quiet=y
${getComposePorts(ports, 5005)}`;
}
