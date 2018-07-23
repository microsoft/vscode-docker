import vscode = require('vscode');
import TelemetryReporter from 'vscode-extension-telemetry';

export let reporter: TelemetryReporter;

export class Reporter extends vscode.Disposable {

    constructor(ctx: vscode.ExtensionContext) {

        super(() => reporter.dispose());

        let packageInfo = getPackageInfo(ctx);
        reporter = packageInfo && new TelemetryReporter(packageInfo.name, packageInfo.version, packageInfo.aiKey);

    }
}

interface IPackageInfo {
    name: string;
    version: string;
    aiKey: string;
}

function getPackageInfo(context: vscode.ExtensionContext): IPackageInfo {
    // tslint:disable-next-line:non-literal-require
    let extensionPackage = require(context.asAbsolutePath('./package.json'));
    if (extensionPackage) {
        return {
            name: extensionPackage.name,
            version: extensionPackage.version,
            aiKey: extensionPackage.aiKey
        };
    }
    return;
}
