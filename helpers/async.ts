import * as glob from 'glob';

// tslint:disable-next-line:no-var-requires
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
