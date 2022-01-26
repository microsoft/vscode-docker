/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import { Platform } from './platform';

export type PythonProjectType = 'django' | 'fastapi' | 'flask' | 'general';

export const PythonFileExtension = ".py";
export const PythonDefaultDebugPort: number = 5678;
export const PythonDefaultPorts = new Map<PythonProjectType, number | undefined>([
    ['django', 8000],
    ['fastapi', 8000],
    ['flask', 5002],
    ['general', undefined],
]);

export type PythonTarget = PythonFileTarget | PythonModuleTarget;
export interface PythonFileTarget {
    file: string;
}

export interface PythonModuleTarget {
    module: string;
}

export function inferPythonArgs(projectType: PythonProjectType, ports: number[]): string[] | undefined {
    switch (projectType) {
        case 'django':
            return [
                'runserver',
                `0.0.0.0:${ports !== undefined ? ports[0] : PythonDefaultPorts.get(projectType)}`,
                '--nothreading',
                '--noreload'
            ];
        case 'fastapi':
            return [
                '--host', '0.0.0.0',
                '--port', `${ports !== undefined ? ports[0] : PythonDefaultPorts.get(projectType)}`,
            ];
        case 'flask':
            return [
                'run',
                '--no-debugger',
                '--no-reload',
                '--host', '0.0.0.0',
                '--port', `${ports !== undefined ? ports[0] : PythonDefaultPorts.get(projectType)}`,
            ];
        default:
            return undefined;
    }
}

export function getPythonProjectType(platform: Platform): PythonProjectType | undefined {
    switch (platform) {
        case 'Python: Django':
            return 'django';
        case 'Python: FastAPI':
            return 'fastapi';
        case 'Python: Flask':
            return 'flask';
        case 'Python: General':
            return 'general';
        default:
            return undefined;
    }
}

export async function getTempDirectoryPath(): Promise<string> {
    return await fse.realpath(os.tmpdir());
}
