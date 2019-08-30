import { TaskDefinition } from 'vscode';

export interface DockerBuildOptions {
    args?: { [key: string]: string };
    context?: string;
    dockerfile?: string;
    labels?: { [key: string]: string };
    tag?: string;
    target?: string;
    pull?: boolean;
}

export interface DockerBuildTaskDefinitionBase extends TaskDefinition {
    dockerBuild?: DockerBuildOptions;
}
