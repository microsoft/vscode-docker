// tslint:disable-next-line: no-any
export function cloneObject<T = any>(obj: T): T {
    return <T>JSON.parse(JSON.stringify(obj));
}
