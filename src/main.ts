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
        console.log('Loading Custom Sliding Panes plugin (Shadowless MOC Bar Version)');

        await this.loadSettings();
        this.addSettingTab(new CustomSlidingPanesSettingTab(this.app, this));

        this.originalOpenLinkText = this.app.workspace.openLinkText.bind(this.app.workspace);

        this.app.workspace.openLinkText = async (linktext: string, sourcePath: string, newLeaf?: any, options?: any) => {
            try {
                const activeLeaf = this.app.workspace.getMostRecentLeaf();
                let openedInExisting = false;

                if (activeLeaf) {
                    const allMainLeaves = this.app.workspace.getLeavesOfType('markdown').filter(leaf => 
                        leaf.getRoot() === this.app.workspace.rootSplit
                    );

                    const activeIndex = allMainLeaves.findIndex(l => l === activeLeaf);

                    if (activeIndex !== -1) {
                        const targetFile = this.app.metadataCache.getFirstLinkpathDest(linktext, sourcePath);
                        const targetPath = targetFile ? targetFile.path : linktext;

                        const nextLeaf = allMainLeaves[activeIndex + 1];
                        const nextLeafFile = nextLeaf ? (nextLeaf.view as any).file : null;

                        let pruneStartIndex = activeIndex + 1; 

                        if (nextLeaf && nextLeafFile && nextLeafFile.path === targetPath) {
                            this.app.workspace.setActiveLeaf(nextLeaf, { focus: true });
                            openedInExisting = true;
                            pruneStartIndex = activeIndex + 2; 
                        }

                        const leavesToClose = allMainLeaves.slice(pruneStartIndex);
                        leavesToClose.forEach(leaf => {
                            leaf.detach();
                        });
                    }
                }

                if (!openedInExisting) {
                    const forceNew = (newLeaf === false || newLeaf === undefined) ? true : newLeaf;
                    await this.originalOpenLinkText(linktext, sourcePath, forceNew, options);
                }

            } catch (err) {
                console.error("Pruning Engine Error:", err);
                await this.originalOpenLinkText(linktext, sourcePath, newLeaf, options);
            }
        };

        this.app.workspace.onLayoutReady(() => {
            this.injectMocBar();
        });

        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.injectMocBar();
            })
        );
    }

    private injectMocBar() {
        const targetContainer = document.querySelector('.workspace-split.mod-root .workspace-tab-header-container');
        if (!targetContainer || targetContainer.querySelector('.custom-moc-bar')) return;

        const mocBar = document.createElement('div');
        mocBar.className = 'custom-moc-bar';

        // To add your own custom index on top
        const mocs = [
            { name: 'MOC1', path: 'MOC1' },
            { name: 'MOC2', path: 'MOC2' },
            { name: 'MOC3', path: 'MOC3' },
        ];

        mocs.forEach(moc => {
            const btn = document.createElement('button');
            btn.className = 'custom-moc-btn';
            btn.textContent = moc.name;

            btn.onclick = async () => {
                await this.originalOpenLinkText(moc.path, '', false);

                const activeLeaf = this.app.workspace.getMostRecentLeaf();
                const allMainLeaves = this.app.workspace.getLeavesOfType('markdown').filter(leaf => 
                    leaf.getRoot() === this.app.workspace.rootSplit
                );

                allMainLeaves.forEach(leaf => {
                    if (leaf !== activeLeaf) {
                        leaf.detach();
                    }
                });
            };

            mocBar.appendChild(btn);
        });

        const addButton = targetContainer.querySelector('.workspace-tab-header-add-button');
        if (addButton) {
            addButton.insertAdjacentElement('afterend', mocBar);
        } else {
            targetContainer.prepend(mocBar);
        }
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