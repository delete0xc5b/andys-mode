# Andy's Mode for Obsidian

Bring the digital gardening and stacked working notes experience of [Andy Matuschak's notes](https://notes.andymatuschak.org) directly into Obsidian.

This plugin transforms your workspace layout to mimic a flowing, card-based stack of working notes, allowing you to trace thoughts across multiple open panes seamlessly.

## Features

*   **Stacked Working Notes Layout:** Organizes your main markdown views into clean, card-like structural layers.
*   **Smart Cross-Pane Link Highlighting:** Automatically detects active notes across your visible stack and highlights matching internal links regardless of their position.
*   **Optimized Flow:** Designed to work hand-in-hand with fast previews and clean layouts for frictionless writing and reading.

## Installation

### Manual Installation
1. Download the latest release files (`main.js`, `styles.css`, `manifest.json`) from release files.
2. Create a folder named `andys-mode` (or your preferred plugin ID) inside your vault's plugin directory: `YourVault/.obsidian/plugins/`.
3. Move the downloaded files into that folder.
4. Open Obsidian, go to **Settings > Community plugins**, and enable **Andy's Mode**.git

## Development & Building

If you want to contribute or build the plugin from source:

1. Clone this repository into your Obsidian plugins folder (`.obsidian/plugins/`).
2. Install Node.js, then run `npm install` to install dependencies.
3. Run `npm run dev` to start compilation in watch mode.
4. Reload Obsidian to load your local changes.