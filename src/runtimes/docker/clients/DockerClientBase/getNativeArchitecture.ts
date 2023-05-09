import * as os from 'os';


export function getNativeArchitecture(): 'amd64' | '386' | 'arm64' | 'arm' {
    switch (os.arch()) {
        case 'arm':
            return 'arm';
        case 'arm64':
            return 'arm64';
        case 'ia32':
            return '386';
        case 'x64':
        default:
            return 'amd64';
    }
}
