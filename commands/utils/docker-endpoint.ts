/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Docker from 'dockerode';
import * as vscode from "vscode";
import { nonNullValue } from '../../utils/nonNull';

export type ContainerStatus = "created" | "restarting" | "running" | "paused" | "exited" | "dead";
export type ListContainerDescOptions = {
    filters?: {
        status?: ContainerStatus[];
    }
};
export const AllStatusFilter: ContainerStatus[] = ["created", "restarting", "running", "paused", "exited", "dead"];

export enum DockerEngineType {
    Linux,
    Windows
}

class DockerClient {
    private _endPoint: Docker | undefined;

    private get endPoint(): Docker {
        return nonNullValue(this._endPoint, 'endPoint');
    }

    constructor() {
        this.refreshEndpoint();
    }

    public refreshEndpoint(): void {
        const errorMessage = 'The docker.host configuration setting must be entered as <host>:<port>, e.g. dockerhost:2375';
        const value: string = vscode.workspace.getConfiguration("docker").get("host", "");
        if (value) {
            let newHost: string = '';
            let newPort: number = 2375;
            let sep: number = -1;

            sep = value.lastIndexOf(':');

            if (sep < 0) {
                vscode.window.showErrorMessage(errorMessage);
            } else {
                newHost = value.slice(0, sep);
                newPort = Number(value.slice(sep + 1));
                if (isNaN(newPort)) {
                    vscode.window.showErrorMessage(errorMessage);
                } else {
                    this._endPoint = new Docker({ host: newHost, port: newPort });
                }
            }
        }
        if (!this._endPoint || !value) {
            // Pass no options so that the defaultOpts of docker-modem will be used if the endpoint wasn't created
            // or the user went from configured setting to empty settign
            this._endPoint = new Docker();
        }
    }

    public getContainerDescriptors(opts?: ListContainerDescOptions): Thenable<Docker.ContainerDesc[]> {
        return new Promise((resolve, reject) => {
            if (!opts) {
                opts = {}
            }

            this.endPoint.listContainers(opts, (err, containers) => {
                if (err) {
                    return reject(err);
                }
                return resolve(containers);
            });
        });
    };

    public getImageDescriptors(opts?: {}): Thenable<Docker.ImageDesc[]> {
        return new Promise((resolve, reject) => {
            if (!opts) {
                opts = {}
            }
            this.endPoint.listImages(opts, (err, images) => {
                if (err) {
                    return reject(err);
                }
                return resolve(images);
            });
        });
    };

    public getContainer(id: string): Docker.Container {
        return this.endPoint.getContainer(id);
    }

    public async getEngineType(): Promise<DockerEngineType> {
        let engineType: DockerEngineType;
        if (process.platform === 'win32') {
            engineType = await new Promise<DockerEngineType>((resolve, reject) => {
                this.endPoint.info((error, info) => {
                    if (error) {
                        return reject(error);
                    }

                    resolve(info.OSType === "windows" ? DockerEngineType.Windows : DockerEngineType.Linux);
                });
            });
        } else {
            // On Linux or macOS, this can only ever be linux,
            // so short-circuit the Docker call entirely.
            engineType = DockerEngineType.Linux;
        }

        return engineType;
    }

    public getEngineInfo(): Thenable<Docker.EngineInfo> {
        return new Promise((resolve, reject) => {
            this.endPoint.info((error, info) => {
                if (error) {
                    return reject(error);
                }
                return resolve(info);
            });
        });
    }

    public async getExposedPorts(imageId: string): Promise<string[]> {
        return await new Promise<string[]>((resolve, reject) => {
            this.getImage(imageId).inspect((error: {}, data: { Config: { ExposedPorts: {} } }) => {
                if (error) {
                    reject(error);
                } else {
                    let exposedPorts = data.Config.ExposedPorts;
                    if (!exposedPorts) {
                        resolve([]);
                    } else {
                        const ports = Object.keys(exposedPorts);
                        resolve(ports);
                    }
                }
            });
        });
    }

    public getImage(id: string): Docker.Image {
        return this.endPoint.getImage(id);
    }
}

export const docker = new DockerClient();
