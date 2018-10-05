/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import { PlatformOS } from '../../utils/platform';

export interface OSProvider {
    homedir: string;
    os: PlatformOS;
    tmpdir: string;
    pathJoin(os: PlatformOS, ...paths: string[]): string;
    pathNormalize(os: PlatformOS, rawPath: string): string;
}

export class LocalOSProvider implements OSProvider {
    get homedir(): string {
        return os.homedir();
    }

    get os(): PlatformOS {
        return os.platform() === 'win32' ? 'Windows' : 'Linux';
    }

    get tmpdir(): string {
        return os.tmpdir();
    }

    public pathJoin(pathOS: PlatformOS, ...paths: string[]): string {
        return pathOS === 'Windows' ? path.win32.join(...paths) : path.posix.join(...paths);
    }

    public pathNormalize(pathOS: PlatformOS, rawPath: string): string {
        return rawPath.replace(
            pathOS === 'Windows' ? /\//g : /\\/g,
            pathOS === 'Windows' ? '\\' : '/');
    }
}

export default LocalOSProvider;
