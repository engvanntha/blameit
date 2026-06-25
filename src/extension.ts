import * as vscode from "vscode";
import { blame, BlameLine } from "./git";

export function activate(context: vscode.ExtensionContext): void {
    const controller = new BlameDecorationController();
    context.subscriptions.push(controller);
    controller.refreshVisibleEditors();
}

class BlameDecorationController implements vscode.Disposable {
    private readonly decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            color: new vscode.ThemeColor("editorCodeLens.foreground"),
            margin: "0 0 0 1rem",
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    private readonly disposables: vscode.Disposable[] = [];
    private readonly latestBlameByEditor = new Map<string, BlameLine[]>();
    private readonly pendingRefreshes = new Map<string, NodeJS.Timeout>();
    private readonly requestVersions = new Map<string, number>();

    constructor() {
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) {
                    this.scheduleRefresh(editor, 0);
                }
            }),
            vscode.window.onDidChangeVisibleTextEditors((editors) => {
                editors.forEach((editor) => this.scheduleRefresh(editor, 0));
            }),
            vscode.window.onDidChangeTextEditorSelection((event) => {
                this.renderCachedDecorations(event.textEditor);
            }),
            vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
                this.scheduleRefresh(event.textEditor, 120);
            }),
            vscode.workspace.onDidSaveTextDocument((document) => {
                this.refreshEditorsForDocument(document, 0);
            }),
            vscode.workspace.onDidChangeTextDocument((event) => {
                this.refreshEditorsForDocument(event.document, 250);
            }),
            this.decorationType,
        );
    }

    public refreshVisibleEditors(): void {
        vscode.window.visibleTextEditors.forEach((editor) => this.scheduleRefresh(editor, 0));
    }

    public dispose(): void {
        this.pendingRefreshes.forEach((timer) => clearTimeout(timer));
        this.latestBlameByEditor.clear();
        this.pendingRefreshes.clear();
        this.requestVersions.clear();
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    private refreshEditorsForDocument(document: vscode.TextDocument, delay: number): void {
        vscode.window.visibleTextEditors
            .filter((editor) => editor.document === document)
            .forEach((editor) => this.scheduleRefresh(editor, delay));
    }

    private scheduleRefresh(editor: vscode.TextEditor, delay: number): void {
        if (!this.shouldDecorate(editor)) {
            editor.setDecorations(this.decorationType, []);
            return;
        }

        const key = this.editorKey(editor);
        const existing = this.pendingRefreshes.get(key);
        if (existing) {
            clearTimeout(existing);
        }

        const timer = setTimeout(() => {
            this.pendingRefreshes.delete(key);
            void this.refreshEditor(editor);
        }, delay);

        this.pendingRefreshes.set(key, timer);
    }

    private async refreshEditor(editor: vscode.TextEditor): Promise<void> {
        if (!this.shouldDecorate(editor)) {
            editor.setDecorations(this.decorationType, []);
            return;
        }

        const key = this.editorKey(editor);
        const nextVersion = (this.requestVersions.get(key) ?? 0) + 1;
        this.requestVersions.set(key, nextVersion);

        try {
            const blameLines = await this.collectVisibleBlame(editor);
            if (this.requestVersions.get(key) !== nextVersion) {
                return;
            }

            this.latestBlameByEditor.set(key, blameLines);
            this.renderDecorations(editor, blameLines);
        } catch {
            if (this.requestVersions.get(key) === nextVersion) {
                this.latestBlameByEditor.delete(key);
                editor.setDecorations(this.decorationType, []);
            }
        }
    }

    private async collectVisibleBlame(editor: vscode.TextEditor): Promise<BlameLine[]> {
        const blameLines = await Promise.all(
            editor.visibleRanges.map((range) =>
                blame(editor.document.uri.fsPath, range.start.line + 1, range.end.line + 1),
            ),
        );

        return blameLines.flat();
    }

    private renderCachedDecorations(editor: vscode.TextEditor): void {
        const blameLines = this.latestBlameByEditor.get(this.editorKey(editor));
        if (!blameLines) {
            return;
        }

        this.renderDecorations(editor, blameLines);
    }

    private renderDecorations(editor: vscode.TextEditor, blameLines: BlameLine[]): void {
        editor.setDecorations(
            this.decorationType,
            this.toDecorationOptions(editor, blameLines),
        );
    }

    private toDecorationOptions(
        editor: vscode.TextEditor,
        blameLines: BlameLine[],
    ): vscode.DecorationOptions[] {
        const document = editor.document;
        const activeLine = editor.selection.active.line + 1;
        const uniqueLines = new Map<number, BlameLine>();

        for (const line of blameLines) {
            uniqueLines.set(line.lineNumber, line);
        }

        return Array.from(uniqueLines.values()).map((line) => {
            const textLine = document.lineAt(line.lineNumber - 1);
            return {
                range: textLine.range,
                renderOptions: {
                    after: {
                        contentText: this.formatLineText(line, line.lineNumber === activeLine),
                    },
                },
                hoverMessage: this.formatHover(line),
            };
        });
    }

    private formatAuthor(author: string): string {
        const normalized = author === "Not Committed Yet" ? "Uncommitted" : author;
        return normalized;
    }

    private formatHover(line: BlameLine): string {
        const parts = [`Last modified by ${this.formatAuthor(line.author)}`];

        if (line.summary) {
            parts.push(line.summary);
        }

        if (line.commit) {
            parts.push(`commit ${line.commit}`);
        }

        return parts.join("\n\n");
    }

    private formatLineText(line: BlameLine, isActiveLine: boolean): string {
        const author = this.formatAuthor(line.author);
        if (isActiveLine && line.summary) {
            return `· ${author} — ${line.summary}`;
        }

        return `· ${author}`;
    }

    private shouldDecorate(editor: vscode.TextEditor): boolean {
        const { document } = editor;
        return document.uri.scheme === "file" && document.lineCount > 0;
    }

    private editorKey(editor: vscode.TextEditor): string {
        return editor.document.uri.toString();
    }
}

export function deactivate(): void {}
