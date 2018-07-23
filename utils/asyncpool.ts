/*Custom asyncpool
 * Author: Esteban Rey L
 * To limit the number of asynchonous calls being done, this is helpful to limit
 * Connection requests and avoid throttling.
 */
export class AsyncPool {
    private runnableQueue: Function[];
    private workers: Promise<void>[];
    private asyncLimit: number;

    constructor(asyncLimit: number) {
        this.asyncLimit = asyncLimit;
        this.runnableQueue = [];
        this.workers = [];
    }

    /*Runs all functions in runnableQueue by launching asyncLimit worker instances
      each of which calls an async task extracted from runnableQueue. This will
      wait for all scheduled tasks to be completed.*/
    public async runAll(): Promise<void> {
        for (let i = 0; i < this.asyncLimit; i++) {
            this.workers.push(this.worker());
        }
        try {
            await Promise.all(this.workers);
        } catch (error) {
            throw error;
        }
    }

    /*Takes in an async Thunk to be executed by the asyncpool*/
    public addTask(func: Function): void {
        this.runnableQueue.push(func);
    }

    /*Executes each passed in async function blocking while each function is run.
      Moves on to the next available thunk on completion of the previous thunk.*/
    private async worker(): Promise<void> {
        while (this.runnableQueue.length > 0) {
            let func = this.runnableQueue.pop();
            //Avoids possible race condition
            if (func) {
                await func();
            }
        }
    }

}
