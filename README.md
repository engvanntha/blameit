# BlameIt

Display Git blame information inline for every visible line of code in Visual Studio Code.

## Overview

BlameIt is a lightweight Visual Studio Code extension that renders Git blame details directly inside the editor for every visible line. Instead of showing blame information only for the current cursor line, BlameIt gives you a broader view of code ownership across the part of the file you are actually reading.

This helps you:

- Identify who last modified each visible line.
- Review ownership patterns while reading code.
- Navigate unfamiliar files with less context switching.
- Avoid opening Git history or hovering line by line.

## Current Features

- Displays the Git author beside every visible line.
- Shows the commit summary for the active cursor line.
- Refreshes while scrolling, switching files, editing, and saving.
- Only requests blame for visible ranges.
- Uses inline decorations via the VS Code Decoration API.
- Works with file-backed documents inside Git repositories.
- Shows commit details in hover text.

## How It Works

1. Detect the visible line ranges in the active editor.
2. Run `git blame --line-porcelain` only for those line ranges.
3. Parse the author, commit hash, and summary from Git output.
4. Render the author at the end of every visible line.
5. Expand the active cursor line to show `author + commit summary`.
6. Refresh decorations when the viewport, selection, or document content changes.

## Example

```ts
function login(user) {          Alice
    validate(user);             Alice
    authenticate(user);         Bob
    return true;                Charlie
}
```

Active line example:

```ts
authenticate(user);             Bob — Fix login race condition
```

## Status

Implemented:

- Visible-line Git blame rendering.
- Active editor and visible range detection.
- Refresh on scrolling, editing, saving, and file switching.
- Cursor-line commit summary rendering.
- Extension host test runner setup.

In progress / next:

- Relative commit time.
- Short or configurable author display.
- Commit hash tooltip polish.
- Smarter caching to reduce repeated Git calls.
- Optional display settings.

## Requirements

- Visual Studio Code `^1.105.0`
- A file opened from a local Git repository
- Git available on your system path

## Development

Install dependencies:

```bash
npm install
```

Build once:

```bash
npm run compile
```

Build continuously while editing:

```bash
npm run watch
```

Run lint:

```bash
npm run lint
```

Run extension host tests:

```bash
npm test
```

Launch the extension in a VS Code Extension Development Host:

1. Open the `blameit` project in VS Code.
2. Press `F5`.
3. In the new Extension Development Host window, open any Git-backed project.
4. Open a tracked file and scroll through it to see inline blame details.

## Tech Stack

- TypeScript
- VS Code Extension API
- Git CLI
- Node.js

## Goal

Create the fastest and cleanest way to visualize code ownership directly inside the editor by showing Git blame information for every visible line, with deeper commit context on the active line.
