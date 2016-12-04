import vscode = require('vscode');
import { diagnosticCollection } from '../dockerExtension';
import * as fs from 'fs';
import * as path from 'path';

var DockerFileValidator = require('dockerfile_lint');
let configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');

function createErrDiagnostic(e, doc: vscode.TextDocument): vscode.Diagnostic {
    var r: vscode.Range;
    var lineNum = -1;
    var msg = e.message;

    if (e.line) {
        lineNum = e.line;
    }

    if (lineNum === -1) {
        r = new vscode.Range(0, 0, 0, 0);
    } else {
        r = doc.lineAt(lineNum - 1).range
    }

    if (e.lineContent) {
        msg = msg + ': ' + e.lineContent;
    }

    return new vscode.Diagnostic(r, msg, vscode.DiagnosticSeverity.Error);

}

export function scheduleValidate(document: vscode.TextDocument) {
    let urisToValidate: { [uri: string]: boolean; } = {};
    let timeoutToken: NodeJS.Timer = null;

    // should we even try validation? if not, get out!
    configOptions = vscode.workspace.getConfiguration('docker');
    if (!(configOptions.get('enableLinting', false)) || document.languageId !== 'dockerfile') {
        return ;
    }

    // schedule valiation so we're not invoking this on every keypress
    urisToValidate[document.uri.toString()] = true;

    if (timeoutToken !== null) {
        clearTimeout(timeoutToken);
    }

    timeoutToken = setTimeout(() => {
        timeoutToken = null;
        vscode.workspace.textDocuments.forEach((document) => {
            if (urisToValidate[document.uri.toString()]) {
                doValidate(document);
            }
        });

        urisToValidate = {};
    }, 200);

    return;
}

function doValidate(document: vscode.TextDocument) {
    let diagnostics: vscode.Diagnostic[] = [];

    configOptions = vscode.workspace.getConfiguration('docker');
    let linterRuleFile = configOptions.get('linterRuleFile', '');

    // validate file exists

    if (linterRuleFile.length !== 0) {
        // fully qualified path to file?
        if (!fs.existsSync(path.normalize(linterRuleFile))) {
            // if not, check to see if it is in the root of the workspace
            if (!fs.existsSync(path.normalize(vscode.workspace.rootPath + '/' + linterRuleFile))) {
                // we can't find the rules file, default to '' which will use the default 
                linterRuleFile = '';
            } else {
                linterRuleFile = path.normalize(vscode.workspace.rootPath + '/' + linterRuleFile);
            }
        } else {
            linterRuleFile = path.normalize(linterRuleFile);
        }
    }

    try {

        let validator = new DockerFileValidator(linterRuleFile);
        let result = validator.validate(document.getText());

        if (result.error.count > 0) {
            for (let i = 0; i < result.error.count; i++) {
                diagnostics.push(createErrDiagnostic(result.error.data[i], document));
            }
        }

        if (result.warn.count > 0) {
            for (let i = 0; i < result.warn.count; i++) {
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0), result.warn.data[i].message + ': ' + result.warn.data[i].description, vscode.DiagnosticSeverity.Warning));
            }
        }

        if (result.info.count > 0) {
            for (let i = 0; i < result.info.count; i++) {
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0), result.info.data[i].message + ': ' + result.info.data[i].description, vscode.DiagnosticSeverity.Information));
            }
        }

        diagnosticCollection.set(document.uri, diagnostics);

    } catch (err) {
        console.log(err);
    }

}
