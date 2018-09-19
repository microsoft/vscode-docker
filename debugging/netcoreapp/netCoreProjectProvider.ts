/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { FileSystemProvider } from "./fsProvider";
import { MSBuildClient } from "./msBuildClient";
import { TempFileProvider } from './tempFileProvider';

const getTargetPathProjectFileContent =
`<Project>
    <Target Name="GetTargetPath">
        <MSBuild
            Projects="$(ProjectFilename)"
            Targets="GetTargetPath">
        <Output
            TaskParameter="TargetOutputs"
            ItemName="TargetOutput" />
        </MSBuild>
        <WriteLinesToFile
            File="$(TargetOutputFilename)"
            Lines="@(TargetOutput)"
            Overwrite="True" />
    </Target>
</Project>`;

export interface NetCoreProjectProvider {
    getTargetPath(projectFile: string): Promise<string>;
}

export class MsBuildNetCoreProjectProvider implements NetCoreProjectProvider {
    constructor(
        private readonly fsProvider: FileSystemProvider,
        private readonly msBuildClient: MSBuildClient,
        private readonly tempFileProvider: TempFileProvider) {
    }

    public async getTargetPath(projectFile: string): Promise<string> {
        const getTargetPathProjectFile = this.tempFileProvider.getTempFilename();
        const targetOutputFilename = this.tempFileProvider.getTempFilename();
        await this.fsProvider.writeFile(getTargetPathProjectFile, getTargetPathProjectFileContent);
        try {
            await this.msBuildClient.execTarget(
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
            await this.fsProvider.unlinkFile(getTargetPathProjectFile);
            await this.fsProvider.unlinkFile(targetOutputFilename);
        }
    }
}
