import './style.scss'
import { app, Plugin, CodeblockPostProcessor, PluginSettings, SettingTab, SettingItem } from '@typora-community-plugin/core'
import { PreviewFloatingView, openPreviewFloatingWindow } from './floating-view'


interface PluginSettingsData {
  langs: string[]
}

const DEFAULT_SETTINGS: Partial<PluginSettingsData> = {
  langs: ['flow', 'mermaid', 'sequence']
}

export default class CodeblockPreviewerPlus extends Plugin<Partial<PluginSettingsData>> {
  onload(): void {
    this.register(
      app.viewManager.registerView(PreviewFloatingView.type, (leaf) => new PreviewFloatingView(leaf)))

    const settings = new PluginSettings(this.app, this.manifest, { version: 1 })
    settings.setDefault(DEFAULT_SETTINGS)
    this.registerSettings(settings)

    this.registerSettingTab(new SettingsTab(this))

    this.registerMarkdownPostProcessor(
      new PreviewButtonProcessor(() => (this.settings?.get('langs') as string[]) || DEFAULT_SETTINGS.langs!))
  }
}

interface PostProcessorContextLike {
  containerEl: HTMLElement
}

class PreviewButtonProcessor extends CodeblockPostProcessor {
  constructor(private getLangs: () => string[]) {
    super()
    this.lang = [...this.getLangs()]
    this.button = {
      text: '<i class="fa fa-external-link"></i>',
      title: 'Open preview in floating window',
      className: 'cbp-float-btn',
      onclick: (event) => {
        const codeblock = event.target.closest('pre') as HTMLElement | null
        if (!codeblock) return
        const panel = codeblock.querySelector('.md-diagram-panel-preview')
        if (panel) openPreviewFloatingWindow(panel.innerHTML)
      },
    }
  }

  override process(el: HTMLElement, context: PostProcessorContextLike): void {
    super.process(el, context as unknown as Parameters<CodeblockPostProcessor['process']>[1])
  }
}

class SettingsTab extends SettingTab {

  get name(): string {
    return 'Codeblock Previewer Plus'
  }

  constructor(private plugin: CodeblockPreviewerPlus) {
    super()
  }

  onshow(): void {
    this.render()
  }

  render(): void {
    const settings = this.plugin.settings as PluginSettings<PluginSettingsData>

    this.addSettingTitle('Supported Languages')

    this.addSetting((setting: SettingItem) => {
      setting.addName('LANGS')
      setting.addDescription('Comma-separated list of codeblock languages to enable preview button for (e.g. flow,mermaid,sequence)')
      setting.addText((input: HTMLInputElement) => {
        input.value = settings.get('langs').join(',')
        input.onchange = () => {
          const langs = input.value.split(',').map(s => s.trim()).filter(Boolean)
          settings.set('langs', langs)
        }
      })
    })

    this.addSetting((setting: SettingItem) => {
      setting.addButton((button: HTMLButtonElement) => {
        button.textContent = 'Apply & Reload'
        button.onclick = () => {
          location.reload()
        }
      })
    })
  }
}
