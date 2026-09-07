import './style.scss'
import { app, Plugin, CodeblockPostProcessor, PluginSettings, SettingTab, SettingItem, I18n, path } from '@typora-community-plugin/core'
import * as Locale from './locales/lang.en.json'
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
  i18n!: I18n<typeof Locale>

  onload(): void {
    this.i18n = new I18n<typeof Locale>({
      localePath: path.join(this.manifest.dir!, 'locales'),
    })

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
    }), this.i18n))
  }
}

interface PostProcessorContextLike {
  containerEl: HTMLElement
}

class PreviewButtonProcessor extends CodeblockPostProcessor {
  constructor(
    private getData: () => { langs: string[]; floatingWidth: number; floatingHeight: number },
    i18n: I18n<typeof Locale>,
  ) {
    super()
    this.lang = [...this.getData().langs]
    this.button = {
      text: '<i class="fa fa-external-link"></i>',
      title: i18n.t.previewButtonTitle,
      onclick: (event) => {
        const codeblock = event.target.closest('pre') as HTMLElement | null
        if (!codeblock) return
        const panel = codeblock.querySelector('.md-diagram-panel-preview')
        if (panel) openPreviewFloatingWindow(panel.innerHTML, this.getData().floatingWidth, this.getData().floatingHeight, i18n.t)
      },
    }
  }

  override process(el: HTMLElement, context: PostProcessorContextLike): void {
    super.process(el, context as unknown as Parameters<CodeblockPostProcessor['process']>[1])
  }
}

class SettingsTab extends SettingTab {
  i18n!: I18n<typeof Locale>

  get name(): string {
    return 'Codeblock Previewer Plus'
  }

  constructor(private plugin: CodeblockPreviewerPlus) {
    super()
    this.render()
  }

  render(): void {
    const { t } = this.plugin.i18n
    const settings = this.plugin.settings as PluginSettings<PluginSettingsData>

    this.addSettingTitle(t.supportedLanguages)

    this.addSetting((setting: SettingItem) => {
      setting.addName(t.langsName)
      setting.addDescription(t.langsDescription)
      setting.addText((input: HTMLInputElement) => {
        input.value = settings.get('langs').join(',')
        input.onchange = () => {
          const langs = input.value.split(',').map(s => s.trim()).filter(Boolean)
          settings.set('langs', langs)
        }
      })
    })

    this.addSettingTitle(t.floatingPreviewWindow)

    this.addSetting((setting: SettingItem) => {
      setting.addName(t.floatingWidthName)
      setting.addDescription(t.floatingWidthDescription)
      setting.addText((input: HTMLInputElement) => {
        input.value = String(settings.get('floatingWidth'))
        input.onchange = () => {
          const value = parseFloat(input.value)
          if (!isNaN(value) && value > 0 && value <= 100) settings.set('floatingWidth', value)
        }
      })
    })

    this.addSetting((setting: SettingItem) => {
      setting.addName(t.floatingHeightName)
      setting.addDescription(t.floatingHeightDescription)
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
        button.textContent = t.applyAndReload
        button.onclick = () => {
          location.reload()
        }
      })
    })
  }
}
