/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';

export type PlatformType = 'Windows' | 'Linux';

export interface OSProvider {
    homedir: string;
    os: PlatformType;
    tmpdir: string;
    pathJoin(os: PlatformType, ...paths: string[]): string;
    pathNormalize(os: PlatformType, path: string): string;
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
        return paths.join(pathOS === 'Windows' ? '\\' : '/');
    }

    public pathNormalize(pathOS: PlatformType, path: string): string {
        return path.replace(
            pathOS === 'Windows' ? /\//g : /\\/g,
            pathOS === 'Windows' ? '\\' : '/');
    }
}

export default LocalOSProvider;
