# BlameIt

Display Git blame information inline for every visible line of code in Visual Studio Code.

## Overview

BlameIt is a lightweight Visual Studio Code extension that renders the Git author for every visible line directly in the editor. Instead of showing blame information only for the current cursor line, BlameIt gives you a broader view of code ownership across the part of the file you are actually reading.

This helps you:

- Identify who last modified each visible line.
- Review ownership patterns while reading code.
- Navigate unfamiliar files with less context switching.
- Avoid opening Git history or hovering line by line.

## Current Features

- Displays the Git author beside every visible line.
- Refreshes while scrolling, switching files, editing, and saving.
- Only requests blame for visible ranges.
- Uses inline decorations via the VS Code Decoration API.
- Works with file-backed documents inside Git repositories.

## How It Works

1. Detect the visible line ranges in the active editor.
2. Run `git blame --line-porcelain` only for those line ranges.
3. Parse the author metadata from Git output.
4. Render each author inline at the end of its line.
5. Refresh decorations when the visible viewport changes.

## Example

```ts
function login(user) {          Alice
    validate(user);             Alice
    authenticate(user);         Bob
    return true;                Charlie
}
```

## Planned Features

- Commit message summary.
- Relative commit time.
- Commit hash tooltip.
- Author avatars.
- Color-coded authors.
- Configurable display format.
- Smarter caching and batching.

## Development

```bash
npm install
npm run compile
```

Use `F5` in VS Code to launch the extension development host.
