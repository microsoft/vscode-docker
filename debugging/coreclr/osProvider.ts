/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';

export type PlatformType = 'Windows' | 'Linux';

export interface OSProvider {
    homedir: string;
    os: PlatformType;
    tmpdir: string;
    pathJoin(os: PlatformType, ...paths: string[]): string;
    pathNormalize(os: PlatformType, rawPath: string): string;
}

export class LocalOSProvider implements OSProvider {
    get homedir(): string {
        return os.homedir();
    }

    get os(): PlatformType {
        return os.platform() === 'win32' ? 'Windows' : 'Linux';
    }

    get tmpdir(): string {
        return os.tmpdir();
    }

    public pathJoin(pathOS: PlatformType, ...paths: string[]): string {
        return pathOS === 'Windows' ? path.win32.join(...paths) : path.posix.join(...paths);
    }

    public pathNormalize(pathOS: PlatformType, rawPath: string): string {
        return rawPath.replace(
            pathOS === 'Windows' ? /\//g : /\\/g,
            pathOS === 'Windows' ? '\\' : '/');
    }
}

export default LocalOSProvider;
