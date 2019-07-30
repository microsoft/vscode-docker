/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPlatformGeneratorInfo, PackageInfo } from './configure';

export let configureCpp: IPlatformGeneratorInfo = {
  genDockerFile,
  genDockerCompose: undefined, // We don't generate compose files for Cpp
  genDockerComposeDebug: undefined, // We don't generate compose files for Cpp
  defaultPorts: undefined // We don't open a port for Cpp
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
  return `# GCC support can be specified at major, minor, or micro version
# (e.g. 8, 8.2 or 8.2.0).
# See https://hub.docker.com/r/library/gcc/ for all supported GCC
# tags from Docker Hub.
# See https://docs.docker.com/samples/library/gcc/ for more on how to use this image
FROM gcc:latest

# These commands copy your files into the specified directory in the image
# and set that as the working location
COPY . /usr/src/myapp
WORKDIR /usr/src/myapp

# This command compiles your app using GCC, adjust for your source code
RUN g++ -o myapp main.cpp

# This command runs your application, comment out this line to compile only
CMD ["./myapp"]

LABEL Name=${serviceNameAndRelativePath} Version=${version}
`;
}
