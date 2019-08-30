import { DebugConfiguration } from 'vscode';

export interface ServerReadyAction {
    pattern: string;
    action?: 'openExternally' | 'debugWithChrome';
    uriFormat?: string;
    webRoot?: string;
}

export interface DockerServerReadyAction extends ServerReadyAction {
    containerName: string;
}

export interface DebugConfigurationBase extends DebugConfiguration {
    preLaunchTask?: string;
    serverReadyAction?: ServerReadyAction;
}

export interface DockerDebugConfigurationBase extends DebugConfigurationBase {
    dockerServerReadyAction?: DockerServerReadyAction;
    removeContainerAfterDebug?: boolean;
}
