/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { PlatformType } from "./osProvider";
import { VsDbgClient } from "./vsdbgClient";

export interface DebuggerClient {
    getDebugger(os: PlatformType): Promise<string>;
}

export class DefaultDebuggerClient {
    private static debuggerVersion: string = 'vs2017u5';
    private static debuggerLinuxRuntime: string = 'debian.8-x64';
    private static debuggerWindowsRuntime: string = 'win7-x64';

    constructor(private readonly vsdbgClient: VsDbgClient) {
    }

    public getDebugger(os: PlatformType): Promise<string> {
        return this.vsdbgClient.getVsDbgVersion(
            DefaultDebuggerClient.debuggerVersion,
            os === 'Windows' ? DefaultDebuggerClient.debuggerWindowsRuntime : DefaultDebuggerClient.debuggerLinuxRuntime);
    }
}
