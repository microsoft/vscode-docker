import * as Docker from 'dockerode';


class DockerClient {

    private endPoint:Docker;

    constructor() {
        this.endPoint = new Docker({ socketPath: '/var/run/docker.sock' });
    }

    public getContainerDescriptors(): Thenable<Docker.ContainerDesc[]>{
        return new Promise((resolve, reject) => {
            this.endPoint.listContainers((err, containers) => {
                if (err) {
                    return reject(err); 
                }
                return resolve(containers);
            });
        });
    };

    public getImageDescriptors(): Thenable<Docker.ImageDesc[]>{
        return new Promise((resolve, reject) => {
            this.endPoint.listImages((err, images) => {
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
}

export const docker = new DockerClient();