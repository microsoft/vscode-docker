import * as Docker from 'dockerode';

export enum DockerEngineType {
    Linux,
    Windows
}

class DockerClient {
    private endPoint: Docker;

    constructor() {
        // Pass no options so that the defaultOpts of docker-modem will be used
        this.endPoint = new Docker();
    }

    public getContainerDescriptors(opts?: {}): Thenable<Docker.ContainerDesc[]> {
        return new Promise((resolve, reject) => {
            if (!opts) {
                let opts = {}
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
                let opts = {}
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
        };

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
                const ports = Object.keys(ExposedPorts).map((port) => port.split("/")[0]);
                resolve(ports);
            });
        });
    }

    public getImage(id: string): Docker.Image {
        return this.endPoint.getImage(id);
    }
}

export const docker = new DockerClient();