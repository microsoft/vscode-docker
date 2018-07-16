/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';

export type PlatformType = 'Windows' | 'Linux';

export interface OSProvider {
    homedir: string;
    os: PlatformType;
    pathJoin(os: PlatformType, ...paths: string[]): string;
}

export class LocalOSProvider implements OSProvider {
    get homedir(): string {
        return os.homedir();
    }

    get os(): PlatformType {
        return os.platform() === 'win32' ? 'Windows' : 'Linux';
    }

    pathJoin(pathOS: PlatformType, ...paths: string[]): string {
        return paths.join(pathOS === 'Windows' ? '\\' : '/');
    }
}

export default LocalOSProvider;
