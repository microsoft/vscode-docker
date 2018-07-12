import * as glob from 'glob';
import { resolve } from 'path';
const { promisify } = require('util');

export async function globAsync(pattern: string, options: glob.IOptions): Promise<string[]> {
    return await new Promise<string[]>((resolve, reject) => {
        glob(pattern, options, (err, matches: string[]) => {
            if (err) {
                reject();
            } else {
                resolve(matches);
            }
        });
    });
}
