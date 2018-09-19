/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { ProcessProvider } from "./processProvider";

export type MSBuildExecOptions = {
    target?: string;
    properties?: { [key: string]: string };
};

export interface MSBuildClient {
    execTarget(projectFile: string, options?: MSBuildExecOptions): Promise<void>;
}

export class CommandLineMSBuildClient implements MSBuildClient {
    constructor(private readonly processProvider: ProcessProvider) {
    }

    public async execTarget(projectFile: string, options?: MSBuildExecOptions): Promise<void> {
        let command = `msbuild ${projectFile}`;

        if (options) {
            if (options.target) {
                command += ` /t:${options.target}`;
            }

            if (options.properties) {
                command += Object.keys(options.properties).map(key => ` "/p:${key}=${options.properties[key]}"`).join('');
            }
        }

        await this.processProvider.exec(command, {});
    }
}

export default CommandLineMSBuildClient;
