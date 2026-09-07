import './style.scss'
import { app, Plugin, CodeblockPostProcessor, PluginSettings, SettingTab, SettingItem, I18n, path } from '@typora-community-plugin/core'
import * as Locale from './locales/lang.en.json'
import { PreviewFloatingView, openPreviewFloatingWindow, PreviewFullscreenView, openPreviewFullscreenWindow } from './floating-view'

export type PreviewMode = 'floating-window' | 'fullscreen'


interface PluginSettingsData {
  langs: string[]
  floatingWidth: number
  floatingHeight: number
  previewMode: PreviewMode
}

const DEFAULT_SETTINGS: Partial<PluginSettingsData> = {
  langs: ['flow', 'mermaid', 'sequence'],
  floatingWidth: 45,
  floatingHeight: 60,
  previewMode: 'floating-window',
}

export default class CodeblockPreviewerPlus extends Plugin<Partial<PluginSettingsData>> {
  i18n!: I18n<typeof Locale>

  onload(): void {
    this.i18n = new I18n<typeof Locale>({
      localePath: path.join(this.manifest.dir!, 'locales'),
    })

    this.register(
      app.viewManager.registerView(PreviewFloatingView.type, (leaf) => new PreviewFloatingView(leaf)))

    this.register(
      app.viewManager.registerView(PreviewFullscreenView.type, (leaf) => new PreviewFullscreenView(leaf)))

    const settings = new PluginSettings<PluginSettingsData>(this.app, this.manifest, { version: 1 })
    settings.setDefault(DEFAULT_SETTINGS)
    this.registerSettings(settings)

    this.registerSettingTab(new SettingsTab(this))

    const processor = new PreviewButtonProcessor(settings, this.i18n)

    this.registerMarkdownPostProcessor(processor)

    this.register(
      settings.addChangeListener('langs', (_key, value) => {
        processor.lang = [...(value as string[])]
      }))
  }
}

interface PostProcessorContextLike {
  containerEl: HTMLElement
}

class PreviewButtonProcessor extends CodeblockPostProcessor {

  constructor(
    settings: PluginSettings<PluginSettingsData>,
    i18n: I18n<typeof Locale>,
  ) {
    super()
    this.lang = [...settings.get('langs')]
    this.button = {
      text: '<i class="fa fa-external-link"></i>',
      title: i18n.t.previewButtonTitle,
      onclick: (event) => {
        const codeblock = event.target.closest('pre') as HTMLElement | null
        if (!codeblock) return
        const panel = codeblock.querySelector('.md-diagram-panel-preview')
        if (!panel) return
        const mode = settings.get('previewMode')
        if (mode === 'fullscreen') {
          openPreviewFullscreenWindow(panel.innerHTML, { closeHint: i18n.t.fullscreenCloseHint })
        } else {
          openPreviewFloatingWindow(panel.innerHTML, settings.get('floatingWidth'), settings.get('floatingHeight'), i18n.t)
        }
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

    this.addSettingTitle(t.previewMode)

    this.addSetting((setting: SettingItem) => {
      setting.addName(t.previewModeName)
      setting.addDescription(t.previewModeDescription)
      setting.addSelect({
        options: [t.modeFloatingWindow, t.modeFullscreen],
        selected: settings.get('previewMode') === 'fullscreen' ? t.modeFullscreen : t.modeFloatingWindow,
        onchange: (event) => {
          const mode: PreviewMode = event.target.value === t.modeFullscreen ? 'fullscreen' : 'floating-window'
          settings.set('previewMode', mode)
        },
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
  }
}
