import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
	console.log('Congratulations, your extension "blameit" is now active!');

	const disposable = vscode.commands.registerCommand("blameit.helloWorld", () => {
		vscode.window.showInformationMessage("Hello World from BlameIt!");
	});

	context.subscriptions.push(disposable);
}

function updateVisible(editor: vscode.TextEditor) {
    const range = editor.visibleRanges[0];

    console.log(
        `Visible: ${range.start.line} - ${range.end.line}`
    );
}

vscode.window.onDidChangeTextEditorVisibleRanges(e => {
    updateVisible(e.textEditor);
});

export function deactivate(): void {}
