import * as Docker from 'dockerode';
import * as vscode from "vscode";

export enum DockerEngineType {
    Linux,
    Windows
}

class DockerClient {
    private endPoint: Docker;

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
                    this.endPoint = new Docker({ host: newHost, port: newPort });
                }
            }
        }
        if (!this.endPoint || !value) {
            // Pass no options so that the defaultOpts of docker-modem will be used if the endpoint wasn't created
            // or the user went from configured setting to empty settign
            this.endPoint = new Docker();
        }
    }

    public getContainerDescriptors(opts?: {}): Thenable<Docker.ContainerDesc[]> {
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

    public getEngineType(): Thenable<DockerEngineType> {
        if (process.platform === 'win32') {
            return new Promise((resolve, reject) => {
                this.endPoint.info((error, info) => {
                    if (error) {
                        return reject(error);
                    }

                    return resolve(info.OSType === "windows" ? DockerEngineType.Windows : DockerEngineType.Linux);
                });
            });
        }

        // On Linux or macOS, this can only ever be linux,
        // so short-circuit the Docker call entirely.
        return Promise.resolve(DockerEngineType.Linux);
    }

    public getEngineInfo(): Thenable<any> {
        return new Promise((resolve, reject) => {
            this.endPoint.info((error, info) => {
                if (error) {
                    return reject(error);
                }
                return resolve(info);
            });
        });
    }

    public getExposedPorts(imageId: string): Thenable<string[]> {
        return new Promise((resolve, reject) => {
            this.getImage(imageId).inspect((error, { Config: { ExposedPorts = {} } }) => {
                const ports = Object.keys(ExposedPorts);
                resolve(ports);
            });
        });
    }

    public getImage(id: string): Docker.Image {
        return this.endPoint.getImage(id);
    }
}

export const docker = new DockerClient();
