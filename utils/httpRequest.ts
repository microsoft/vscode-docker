import * as https from 'https';

// tslint:disable-next-line:promise-function-async // Grandfathered in
export async function httpsRequest(opts: https.RequestOptions | string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let req = https.request(opts, (res) => {
            let data = '';
            res.on('data', (d: string) => {
                data += d;
            })
            res.on('end', () => {
                resolve(data);
            })
        });
        req.end();
        req.on('error', reject);
    });
}

export async function httpsRequestBinary(opts: https.RequestOptions | string): Promise<Buffer> {
    let buffer = Buffer.alloc(0);
    return new Promise<Buffer>((resolve, reject) => {
        let req = https.request(opts, (res) => {
            res.on('data', (d: Buffer) => {
                buffer = Buffer.concat([buffer, d]);
            });
            res.on('end', () => {
                resolve(buffer);
            })
        });
        req.end();
        req.on('error', reject);
    });
}
