import './style.scss'
import { app, Plugin, CodeblockPostProcessor, PluginSettings, I18n, path } from '@typora-community-plugin/core'
import * as Locale from './locales/lang.en.json'
import { PreviewFloatingView, openPreviewFloatingWindow } from './floating-view/windows'
import { PreviewFullscreenView, openPreviewFullscreenWindow } from './floating-view/fullscreen'
import { SettingsTab } from './settings-tab'

export type PreviewMode = 'floating-window' | 'fullscreen'


export interface PluginSettingsData {
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
