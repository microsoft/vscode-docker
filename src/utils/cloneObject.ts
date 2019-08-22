// tslint:disable-next-line: no-any
export function cloneObject<T = any>(obj: T): T {
    if (obj === undefined) {
        return undefined;
    }

    return <T>JSON.parse(JSON.stringify(obj));
}
