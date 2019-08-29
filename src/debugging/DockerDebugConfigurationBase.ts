import { DebugConfiguration } from 'vscode';

export interface DockerServerReadyAction {
    pattern: string;
    containerName: string;
    uriFormat?: string;
}

export interface DebugConfigurationBase extends DebugConfiguration {
    preLaunchTask?: string;
}

export interface DockerDebugConfigurationBase extends DebugConfigurationBase {
    dockerServerReadyAction?: DockerServerReadyAction;
    removeContainerAfterDebug?: boolean;
}
