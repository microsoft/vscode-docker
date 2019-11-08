/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { ext } from "../../extensionVariables";
import { DotNetClient } from "./CommandLineDotNetClient";
import { FileSystemProvider } from "./fsProvider";
import { TempFileProvider } from './tempFileProvider';

export interface NetCoreProjectProvider {
    getTargetPath(projectFile: string): Promise<string>;
}

export class MsBuildNetCoreProjectProvider implements NetCoreProjectProvider {
    constructor(
        private readonly fsProvider: FileSystemProvider,
        private readonly dotNetClient: DotNetClient,
        private readonly tempFileProvider: TempFileProvider) {
    }

    public async getTargetPath(projectFile: string): Promise<string> {
        const getTargetPathProjectFile = path.join(ext.context.asAbsolutePath('resources'), 'GetTargetPath.proj');
        const targetOutputFilename = this.tempFileProvider.getTempFilename();
        try {
            await this.dotNetClient.execTarget(
                getTargetPathProjectFile,
                {
                    target: 'GetTargetPath',
                    properties: {
                        'ProjectFilename': projectFile,
                        'TargetOutputFilename': targetOutputFilename
                    }
                });

            const targetOutputContent = await this.fsProvider.readFile(targetOutputFilename);

            return targetOutputContent.split(/\r?\n/)[0];
        }
        finally {
            if (await this.fsProvider.fileExists(targetOutputFilename)) {
                await this.fsProvider.unlinkFile(targetOutputFilename);
            }
        }
    }
}
