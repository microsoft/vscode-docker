/*Custom asyncpool
 * To limit the number of asynchonous calls being done, this is helpful to limit 
 * Connection requests and avoid throttling.
 */
export class asyncPool {
    private runnableQueue: Function[];
    private workers: Promise<void>[];
    private asyncLimit : number;

    constructor(asyncLimit: number) {
        this.asyncLimit = asyncLimit;
        this.runnableQueue = [];
        this.workers = [];
    }

    /*Runs all functions in runnableQueue by launching asyncLimit worker instances
      each of which calls an async task extracted from runnableQueue. This will 
      wait for all scheduled tasks to be completed.*/
      
    public async scheduleRun() {
        for (let i = 0; i < this.asyncLimit; i++) {
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
