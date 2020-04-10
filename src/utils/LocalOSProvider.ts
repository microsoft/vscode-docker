/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/* eslint-disable unicorn/filename-case */

import * as os from 'os';
import * as path from 'path';
import { pathNormalize } from './pathNormalize';
import { PlatformOS } from './platform';

export interface OSProvider {
    homedir: string;
    isMac: boolean;
    os: PlatformOS;
    tmpdir: string;
    pathJoin(os: PlatformOS, ...paths: string[]): string;
    pathNormalize(os: PlatformOS, rawPath: string): string;
    pathParse(os: PlatformOS, rawPath: string): path.ParsedPath;
}

export class LocalOSProvider implements OSProvider {
    public get homedir(): string {
        return os.homedir();
    }

    public get isMac(): boolean {
        return os.platform() === 'darwin';
    }

    public get os(): PlatformOS {
        return os.platform() === 'win32' ? 'Windows' : 'Linux';
    }

    public get tmpdir(): string {
        return os.tmpdir();
    }

    public pathJoin(pathOS: PlatformOS, ...paths: string[]): string {
        return pathOS === 'Windows' ? path.win32.join(...paths) : path.posix.join(...paths);
    }

    public pathNormalize(pathOS: PlatformOS, rawPath: string): string {
        return pathNormalize(rawPath, pathOS);
    }

    public pathParse(pathOS: PlatformOS, rawPath: string): path.ParsedPath {
        return pathOS === 'Windows' ? path.win32.parse(rawPath) : path.posix.parse(rawPath);
    }
}

export default LocalOSProvider;
