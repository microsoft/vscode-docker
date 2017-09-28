declare module Docker {
	interface Modem {
		demuxStream(stream: NodeJS.ReadWriteStream, stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream): void;
	}

	interface DockerOptions {
		socketPath: string;
	}

	interface HostConfig {
		Binds: string[];
	}

	interface CreateContainerOptions {
		Image: string;
		Volumes: { [path: string]: any; };
		ExposedPorts?: any;
		HostConfig: HostConfig;
	}

	interface StartOptions {
		hijack?: boolean;
		stdin?: boolean;
	}

	interface EngineInfo {
		OSType: string;
	}

	interface ExecInspectData {
		ExitCode: number;
	}

	class Exec {
		start(options: StartOptions, cb: (err: Error, stream: NodeJS.ReadWriteStream)=>void): void;
		inspect(cb: (err: Error, data: ExecInspectData)=>void): void;
	}

	interface ExecOptions {
		AttachStdin?: boolean;
		AttachStdout?: boolean;
		AttachStderr?: boolean;
		Tty?: boolean;
		Cmd?: string[];
	}

	class Container {
		attach(options: any, cb: (err: Error, stream: any)=>void): void;
		attach(cb: (err: Error, stream: any)=>void): void;
		attach(): Promise<any>;
		exec(options: ExecOptions, cb: (err: Error, exec: Exec)=>void): void;
		exec(cb: (err: Error, exec: Exec)=>void): void;
		exec(): Promise<Exec>;
		inspect(options: any, cb: (err: Error, data: any)=>void): void;
		inspect(options: any): any;
		inspect(cb: (err: Error, data: any)=>void): void;
		inspect(): any;
		logs(options: any, cb: (err: Error, data: any)=>void): void;
		logs(cb: (err: Error, data: any)=>void): void;
		logs(): Promise<any>;
		pause(options: any, cb: (err: Error, data: any)=>void): void;
		pause(cb: (err: Error, data: any)=>void): void;
		pause(): Promise<Container>;
		remove(options: any, cb: (err: Error, data: any)=>void): void;
		remove(cb: (err: Error, data: any)=>void): void;
		remove(): Promise<any>;
		restart(options: any, cb: (err: Error, data: any)=>void): void;
		restart(cb: (err: Error, data: any)=>void): void;
		restart(): Promise<Container>;
		start(options: any, cb: (err: Error, data: any)=>void): void;
		start(cb: (err: Error, data: any)=>void): void;
		start(): Promise<Container>;
		stats(options: any, cb: (err: Error, data: any)=>void): void;
		stats(cb: (err: Error, data: any)=>void): void;
		stats(): Promise<any>;
		stop(options: any, cb: (err: Error, data: any)=>void): void;
		stop(cb: (err: Error, data: any)=>void): void;
		stop(): Promise<Container>;
		top(options: any, cb: (err: Error, data: any)=>void): void;
		top(cb: (err: Error, data: any)=>void): void;
		top(): Promise<any>;
		unpause(options: any, cb: (err: Error, data: any)=>void): void;
		unpause(cb: (err: Error, data: any)=>void): void;
		unpause(): Promise<Container>;
	}

	class Image {
		inspect(cb: (err: Error, data: any) => void): void;
		name: string;
		remove(options: any, cb: (err: Error, data: any)=>void): void;
		tag(options: any, cb: (err: Error, data: any)=>void): void;
	}

	interface ImageDesc {
		Created: Date;
		Id: string;
		ParentId: string;
		RepoTags: string[];
		Size: number;
		VirtualSize: number;
	}

	interface ContainerDesc {
		Id: string;
		Image: string;
		Names: string[];
		State: string;
		Status: string;
	}
}

declare class Docker {
	modem: Docker.Modem;
	constructor(options?: Docker.DockerOptions);

	info(cb: (err: Error, data: Docker.EngineInfo) => void): void;

	listImages(options: {}, cb: (err:Error , images: Docker.ImageDesc[])=>void): void;
	getImage(id:string): Docker.Image;
	
	createContainer(options: Docker.CreateContainerOptions, cb: (err: Error, container: Docker.Container)=>void): void;
	listContainers(options: {}, cb: (err:Error , containers: Docker.ContainerDesc[])=>void): void;
	getContainer(id: string): Docker.Container;
}

declare module "dockerode" {
    export = Docker;
}