/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export enum RegistryApi {
    /**
     * https://docs.docker.com/registry/spec/api/
     */
    DockerV2 = 'DockerV2',

    /**
     * https://docs.gitlab.com/ee/api/README.html
     * https://docs.gitlab.com/ee/api/container_registry.html
     */
    GitLabV4 = 'GitLabV4',

    /**
     * No public docs found
     */
    DockerHubV2 = 'DockerHubV2'
}
