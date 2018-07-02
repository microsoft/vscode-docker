/*Custom asyncpool
 * To limit the number of asynchonous calls being done, this is helpful to limit 
 * Connection requests and avoid throttling.
 */
export class asyncPool {
    private runnableQueue: Function[];
    private workers: Promise<void>[];
    private asyncLim : number;

    constructor(asyncLim: number) {
        this.asyncLim = asyncLim;
        this.runnableQueue = [];
        this.workers = [];
    }

    public async scheduleRun() {
        for (let i = 0; i < this.asyncLim; i++) {
            this.workers.push(this.worker());
        }
        await Promise.all(this.workers);
    }

    private async worker() {
        while (this.runnableQueue.length > 0) {
            let func = this.runnableQueue.pop();
            await func();
        }
    }

    public addTask(func: Function) {
        this.runnableQueue.push(func);
    }
}
