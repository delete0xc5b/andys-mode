import { Plugin, App, PluginSettingTab, Setting, WorkspaceLeaf, TFile } from 'obsidian';

interface CustomSlidingPanesSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: CustomSlidingPanesSettings = {
    mySetting: 'default'
}

export default class CustomSlidingPanes extends Plugin {
    settings!: CustomSlidingPanesSettings;
    private originalOpenLinkText!: Function;

    async onload() {
        console.log('Loading Custom Sliding Panes plugin (Anti-Duplicate Version)');

        await this.loadSettings();
        this.addSettingTab(new CustomSlidingPanesSettingTab(this.app, this));

        // Store Obsidian's native link-opening function to restore it later
        this.originalOpenLinkText = this.app.workspace.openLinkText.bind(this.app.workspace);

        // Override Obsidian's internal link router
        this.app.workspace.openLinkText = async (linktext: string, sourcePath: string, newLeaf?: any, options?: any) => {
            try {
                const activeLeaf = this.app.workspace.getMostRecentLeaf();
                let openedInExisting = false;

                if (activeLeaf) {
                    // 1. Get a perfect left-to-right array of all notes in the center workspace
                    const allMainLeaves = this.app.workspace.getLeavesOfType('markdown').filter(leaf => 
                        leaf.getRoot() === this.app.workspace.rootSplit
                    );

                    const activeIndex = allMainLeaves.findIndex(l => l === activeLeaf);

                    if (activeIndex !== -1) {
                        // 2. Figure out exactly which file the user is trying to open
                        const targetFile = this.app.metadataCache.getFirstLinkpathDest(linktext, sourcePath);
                        const targetPath = targetFile ? targetFile.path : linktext;

                        // 3. DUPLICATE PREVENTION: Check the immediate next tab
                        const nextLeaf = allMainLeaves[activeIndex + 1];
                        const nextLeafFile = nextLeaf ? (nextLeaf.view as any).file : null;

                        let pruneStartIndex = activeIndex + 1; // Default: close everything to the right

                        // If the next tab is ALREADY the note we want, just focus it!
                        if (nextLeaf && nextLeafFile && nextLeafFile.path === targetPath) {
                            this.app.workspace.setActiveLeaf(nextLeaf, { focus: true });
                            openedInExisting = true;
                            
                            // Adjust pruning to spare this tab, but close anything after it
                            pruneStartIndex = activeIndex + 2; 
                        }

                        // 4. THE PRUNING ENGINE: Close all irrelevant branches
                        const leavesToClose = allMainLeaves.slice(pruneStartIndex);
                        leavesToClose.forEach(leaf => {
                            leaf.detach();
                        });
                    }
                }

                // 5. Open the link (if we didn't just focus an existing one)
                if (!openedInExisting) {
                    const forceNew = (newLeaf === false || newLeaf === undefined) ? true : newLeaf;
                    await this.originalOpenLinkText(linktext, sourcePath, forceNew, options);
                }

            } catch (err) {
                console.error("Pruning Engine Error:", err);
                // Fail-safe: if our custom logic crashes, just open the link normally
                await this.originalOpenLinkText(linktext, sourcePath, newLeaf, options);
            }
        };
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log('Unloading Custom Sliding Panes plugin');
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