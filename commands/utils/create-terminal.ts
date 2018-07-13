import * as vscode from "vscode";

export function createTerminal(name: string): vscode.Terminal {
  let terminalOptions: vscode.TerminalOptions = {};
  terminalOptions.name = name;
  terminalOptions.env = {
    DOCKER_HOST: vscode.workspace.getConfiguration("docker").get("host", "")
  };
  return vscode.window.createTerminal(terminalOptions);
}
