
import * as cp from 'child_process';

export function execAzCLI(command: string): Promise<string> {

    return new Promise((resolve, reject) => {
        cp.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(stdout);
        });
    });
}