import * as vscode from "vscode";

export function createTerminal(name: string): vscode.Terminal {
  let terminalOptions: vscode.TerminalOptions = {};
  terminalOptions.name = name;
  const value: string = vscode.workspace.getConfiguration("docker").get("host", "");
  if (value) {
    terminalOptions.env = {
      DOCKER_HOST: value
    };
  }
  return vscode.window.createTerminal(terminalOptions);
}
