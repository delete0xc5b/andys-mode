import { Plugin, App, PluginSettingTab, Setting } from 'obsidian';

interface CustomSlidingPanesSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: CustomSlidingPanesSettings = {
    mySetting: 'default'
};

export default class CustomSlidingPanes extends Plugin {
    settings!: CustomSlidingPanesSettings;
    private originalOpenLinkText!: Function;

    async onload() {
        console.log('Loading Custom Sliding Panes plugin');

        await this.loadSettings();
        this.addSettingTab(new CustomSlidingPanesSettingTab(this.app, this));

        // Intercept openLinkText to handle leaf pruning and opening
        this.originalOpenLinkText = this.app.workspace.openLinkText.bind(this.app.workspace);

        this.app.workspace.openLinkText = async (linktext: string, sourcePath: string, newLeaf?: any, options?: any) => {
            try {
                const allMainLeaves = this.app.workspace.getLeavesOfType('markdown').filter(leaf => 
                    leaf.getRoot() === this.app.workspace.rootSplit
                );

                const targetFile = this.app.metadataCache.getFirstLinkpathDest(linktext, sourcePath);

                // 1. Check if the target note is already open ANYWHERE in the stack
                if (targetFile) {
                    const targetPath = targetFile.path;
                    const existingLeaf = allMainLeaves.find(leaf => {
                        const view = leaf.view as any;
                        return view?.file?.path === targetPath;
                    });

                    if (existingLeaf) {
                        // The note is already open! Focus it directly.
                        this.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                        
                        // Safely parse header/block references (e.g., "Note#Header")
                        const hashIndex = linktext.indexOf('#');
                        const subpath = hashIndex !== -1 ? linktext.substring(hashIndex) : undefined;
                        
                        // Merge subpath into ephemeral state so it scrolls to the header
                        const eState = options?.eState || {};
                        if (subpath) {
                            eState.subpath = subpath;
                        }
                        
                        // Directly instruct the existing leaf to open the file and state.
                        // This bypasses originalOpenLinkText entirely so it CANNOT spawn a new pane!
                        await existingLeaf.openFile(targetFile, { active: true, eState });
                        return; // Stop here so we don't prune or spawn anything new
                    }
                }

                // 2. If it's NOT already open, we prune the panes to the right and open a new one
                const activeLeaf = this.app.workspace.getMostRecentLeaf();

                if (activeLeaf) {
                    const activeIndex = allMainLeaves.findIndex(l => l === activeLeaf);

                    if (activeIndex !== -1) {
                        // Detach all leaves to the right of the current one
                        const leavesToClose = allMainLeaves.slice(activeIndex + 1);
                        leavesToClose.forEach(leaf => {
                            leaf.detach();
                        });
                    }
                }

                // 3. Open the newly clicked link as a new leaf (pushed to the right)
                const forceNew = (newLeaf === false || newLeaf === undefined) ? true : newLeaf;
                await this.originalOpenLinkText(linktext, sourcePath, forceNew, options);

            } catch (err) {
                console.error("Pruning Engine Error:", err);
                await this.originalOpenLinkText(linktext, sourcePath, newLeaf, options);
            } finally {
                // Update link highlights after opening/pruning leaves
                setTimeout(() => this.updateLinkHighlights(), 50);
            }
        };

        // Register events to update highlights dynamically as notes load or change
        this.registerEvent(this.app.workspace.on('layout-change', () => this.updateLinkHighlights()));
        this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.updateLinkHighlights()));
        this.registerEvent(this.app.metadataCache.on('changed', () => this.updateLinkHighlights()));
    }

    public updateLinkHighlights() {
        const allMainLeaves = this.app.workspace.getLeavesOfType('markdown').filter(leaf => 
            leaf.getRoot() === this.app.workspace.rootSplit
        );

        // 1. Gather a list (Set) of every file currently open in the stacked panes
        const openFilePaths = new Set<string>();
        allMainLeaves.forEach(leaf => {
            const view = leaf.view as any;
            if (view?.file?.path) {
                openFilePaths.add(view.file.path);
            }
        });

        // 2. Clear all existing highlights across all leaves first
        allMainLeaves.forEach(leaf => {
            const container = (leaf.view as any).containerEl as HTMLElement;
            if (!container) return;
            const highlighted = container.querySelectorAll('.is-stacked-parent-link');
            highlighted.forEach(el => el.classList.remove('is-stacked-parent-link'));
        });

        // 3. Loop through all leaves and highlight links pointing to ANY open file
        allMainLeaves.forEach(leaf => {
            const currentView = leaf.view as any;
            if (!currentView?.file) return;

            const sourceFilePath = currentView.file.path;
            const container = currentView.containerEl as HTMLElement;
            if (!container) return;

            const linkElements = container.querySelectorAll<HTMLElement>(
                'a.internal-link, .cm-hmd-internal-link, .cm-link, [data-href]'
            );

            linkElements.forEach(el => {
                const rawLink = el.getAttribute('data-href') || el.dataset.href || el.textContent || '';
                if (!rawLink.trim()) return;

                const destFile = this.app.metadataCache.getFirstLinkpathDest(rawLink.trim(), sourceFilePath);

                // If the link resolves to a file that is in our 'openFilePaths' Set, highlight it
                if (destFile && openFilePaths.has(destFile.path)) {
                    el.classList.add('is-stacked-parent-link');
                }
            });
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        this.saveData(this.settings);
    }

    onunload() {
        console.log('Unloading Custom Sliding Panes plugin');
        
        // Restore original openLinkText
        if (this.originalOpenLinkText) {
            this.app.workspace.openLinkText = this.originalOpenLinkText as any;
        }
    }
}

class CustomSlidingPanesSettingTab extends PluginSettingTab {
    plugin: CustomSlidingPanes;

    constructor(app: App, plugin: CustomSlidingPanes) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Custom Sliding Panes Settings' });

        new Setting(containerEl)
            .setName('Placeholder Config')
            .setDesc('Available for custom toggles.')
            .addText(text => text
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}