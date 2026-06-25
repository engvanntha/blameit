"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const git_1 = require("./git");
function activate(context) {
    const controller = new BlameDecorationController();
    context.subscriptions.push(controller);
    controller.refreshVisibleEditors();
}
class BlameDecorationController {
    decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            color: new vscode.ThemeColor("editorCodeLens.foreground"),
            margin: "0 0 0 1rem",
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    disposables = [];
    latestBlameByEditor = new Map();
    pendingRefreshes = new Map();
    requestVersions = new Map();
    constructor() {
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.scheduleRefresh(editor, 0);
            }
        }), vscode.window.onDidChangeVisibleTextEditors((editors) => {
            editors.forEach((editor) => this.scheduleRefresh(editor, 0));
        }), vscode.window.onDidChangeTextEditorSelection((event) => {
            this.renderCachedDecorations(event.textEditor);
        }), vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
            this.scheduleRefresh(event.textEditor, 120);
        }), vscode.workspace.onDidSaveTextDocument((document) => {
            this.refreshEditorsForDocument(document, 0);
        }), vscode.workspace.onDidChangeTextDocument((event) => {
            this.refreshEditorsForDocument(event.document, 250);
        }), this.decorationType);
    }
    refreshVisibleEditors() {
        vscode.window.visibleTextEditors.forEach((editor) => this.scheduleRefresh(editor, 0));
    }
    dispose() {
        this.pendingRefreshes.forEach((timer) => clearTimeout(timer));
        this.latestBlameByEditor.clear();
        this.pendingRefreshes.clear();
        this.requestVersions.clear();
        this.disposables.forEach((disposable) => disposable.dispose());
    }
    refreshEditorsForDocument(document, delay) {
        vscode.window.visibleTextEditors
            .filter((editor) => editor.document === document)
            .forEach((editor) => this.scheduleRefresh(editor, delay));
    }
    scheduleRefresh(editor, delay) {
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
    async refreshEditor(editor) {
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
        }
        catch {
            if (this.requestVersions.get(key) === nextVersion) {
                this.latestBlameByEditor.delete(key);
                editor.setDecorations(this.decorationType, []);
            }
        }
    }
    async collectVisibleBlame(editor) {
        const blameLines = await Promise.all(editor.visibleRanges.map((range) => (0, git_1.blame)(editor.document.uri.fsPath, range.start.line + 1, range.end.line + 1)));
        return blameLines.flat();
    }
    renderCachedDecorations(editor) {
        const blameLines = this.latestBlameByEditor.get(this.editorKey(editor));
        if (!blameLines) {
            return;
        }
        this.renderDecorations(editor, blameLines);
    }
    renderDecorations(editor, blameLines) {
        editor.setDecorations(this.decorationType, this.toDecorationOptions(editor, blameLines));
    }
    toDecorationOptions(editor, blameLines) {
        const document = editor.document;
        const activeLine = editor.selection.active.line + 1;
        const uniqueLines = new Map();
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
    formatAuthor(author) {
        const normalized = author === "Not Committed Yet" ? "Uncommitted" : author;
        return normalized;
    }
    formatHover(line) {
        const parts = [`Last modified by ${this.formatAuthor(line.author)}`];
        if (line.summary) {
            parts.push(line.summary);
        }
        if (line.commit) {
            parts.push(`commit ${line.commit}`);
        }
        return parts.join("\n\n");
    }
    formatLineText(line, isActiveLine) {
        const author = this.formatAuthor(line.author);
        if (isActiveLine && line.summary) {
            return `· ${author} — ${line.summary}`;
        }
        return `· ${author}`;
    }
    shouldDecorate(editor) {
        const { document } = editor;
        return document.uri.scheme === "file" && document.lineCount > 0;
    }
    editorKey(editor) {
        return editor.document.uri.toString();
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map