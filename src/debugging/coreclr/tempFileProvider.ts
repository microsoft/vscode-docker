/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { OSProvider } from "../../utils/LocalOSProvider";
import { ProcessProvider } from './ChildProcessProvider';

export interface TempFileProvider {
    getTempFilename(prefix?: string, ext?: string): string;
}

export class OSTempFileProvider implements TempFileProvider {
    private count: number = 1;

    public constructor(
        private readonly osProvider: OSProvider,
        private readonly processProvider: ProcessProvider) {
    }

    public getTempFilename(prefix: string = 'temp', ext: string = 'tmp'): string {
        return path.join(this.osProvider.tmpdir, `${prefix}_${new Date().valueOf()}_${this.processProvider.pid}_${this.count++}.${ext}`);
    }
}
