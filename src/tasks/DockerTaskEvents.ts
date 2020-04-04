export interface DockerTaskEvent {
    name: string,
    success: boolean,
    error?: string
}

export class DockerTaskEndEventHandler {
    private handlers: { (data?: DockerTaskEvent): void; }[] = [];

    public on(handler: { (data?: DockerTaskEvent): void }) : void {
        this.handlers.push(handler);
    }

    public off(handler: { (data?: DockerTaskEvent): void }) : void {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    public trigger(data?: DockerTaskEvent) {
        this.handlers.slice(0).forEach(h => h(data));
    }
}

export const dockerTaskEndEventHandler = new DockerTaskEndEventHandler();
