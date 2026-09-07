import './style.scss'
import { app, Plugin, CodeblockPostProcessor, PluginSettings, SettingTab, SettingItem } from '@typora-community-plugin/core'
import { PreviewFloatingView, openPreviewFloatingWindow } from './floating-view'


interface PluginSettingsData {
  langs: string[]
  floatingWidth: number
  floatingHeight: number
}

const DEFAULT_SETTINGS: Partial<PluginSettingsData> = {
  langs: ['flow', 'mermaid', 'sequence'],
  floatingWidth: 45,
  floatingHeight: 60,
}

export default class CodeblockPreviewerPlus extends Plugin<Partial<PluginSettingsData>> {
  onload(): void {
    this.register(
      app.viewManager.registerView(PreviewFloatingView.type, (leaf) => new PreviewFloatingView(leaf)))

    const settings = new PluginSettings(this.app, this.manifest, { version: 1 })
    settings.setDefault(DEFAULT_SETTINGS)
    this.registerSettings(settings)

    this.registerSettingTab(new SettingsTab(this))

    this.registerMarkdownPostProcessor(new PreviewButtonProcessor(() => ({
      langs: (this.settings?.get('langs') as string[]) || DEFAULT_SETTINGS.langs!,
      floatingWidth: (this.settings?.get('floatingWidth') as number) ?? DEFAULT_SETTINGS.floatingWidth!,
      floatingHeight: (this.settings?.get('floatingHeight') as number) ?? DEFAULT_SETTINGS.floatingHeight!,
    })))
  }
}

interface PostProcessorContextLike {
  containerEl: HTMLElement
}

class PreviewButtonProcessor extends CodeblockPostProcessor {
  constructor(private getData: () => { langs: string[]; floatingWidth: number; floatingHeight: number }) {
    super()
    this.lang = [...this.getData().langs]
    this.button = {
      text: '<i class="fa fa-external-link"></i>',
      title: 'Open preview in floating window',
      onclick: (event) => {
        const codeblock = event.target.closest('pre') as HTMLElement | null
        if (!codeblock) return
        const panel = codeblock.querySelector('.md-diagram-panel-preview')
        if (panel) openPreviewFloatingWindow(panel.innerHTML, this.getData().floatingWidth, this.getData().floatingHeight)
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

    this.addSettingTitle('Floating Preview Window')

    this.addSetting((setting: SettingItem) => {
      setting.addName('FLOATING_WIDTH')
      setting.addDescription('Initial width (in % of viewport width) of the floating preview window (default 45)')
      setting.addText((input: HTMLInputElement) => {
        input.value = String(settings.get('floatingWidth'))
        input.onchange = () => {
          const value = parseFloat(input.value)
          if (!isNaN(value) && value > 0 && value <= 100) settings.set('floatingWidth', value)
        }
      })
    })

    this.addSetting((setting: SettingItem) => {
      setting.addName('FLOATING_HEIGHT')
      setting.addDescription('Initial height (in % of viewport height) of the floating preview window (default 60)')
      setting.addText((input: HTMLInputElement) => {
        input.value = String(settings.get('floatingHeight'))
        input.onchange = () => {
          const value = parseFloat(input.value)
          if (!isNaN(value) && value > 0 && value <= 100) settings.set('floatingHeight', value)
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
