/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';
import * as tar from 'tar';

/**
 * Write tarball data containing a single file to this stream, and
 * it will unpack it.
 * @param destination The destination stream to unpack to
 * @returns A stream to write tarball data into
 */
export function tarUnpackStream(destination: NodeJS.WritableStream): NodeJS.WritableStream {
    let entryCounter = 0;
    return new tar.Parse({
        filter: () => {
            return entryCounter < 1;
        },
        onentry: (entry: tar.ReadEntryClass) => {
            entryCounter++;
            entry.pipe(destination);
        }
    });
}

/**
 * Given a single file as a buffer, returns a stream of tarball
 * data containing that file.
 * @param source The source file as a buffer.
 * @param sourceFileName The name of the source file (will be written
 * into the tarball)
 * @param atime Optional date when the file was last accessed
 * @param mtime Optional date when the file was last modified
 * @param ctime Optional date when the file was created
 * @param mode Optional unix file mode specifier
 * @param gid Optional unix group id specifier
 * @param uid Optional unix user id specifier
 * @returns A stream to read tarball data from
 */
export function tarPackStream(source: Buffer, sourceFileName: string, atime: Date = new Date(), mtime: Date = new Date(), ctime: Date = new Date(), mode?: number, gid?: number, uid?: number): NodeJS.ReadableStream {
    const tarPack = new tar.Pack({ portable: true });
    const readEntry = new tar.ReadEntry({
        path: sourceFileName,
        type: 'File',
        size: source.length,
        atime,
        mtime,
        ctime,
        mode,
        gid,
        uid,
    });

    const sourceStream = stream.Readable.from(source);
    sourceStream.pipe(readEntry);
    tarPack.add(readEntry);
    tarPack.end();

    return tarPack;
}
