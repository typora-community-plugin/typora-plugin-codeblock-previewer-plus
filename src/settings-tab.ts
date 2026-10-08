import { Notice, PluginSettings, SettingTab, SettingItem } from '@typora-community-plugin/core'
import type CodeblockPreviewerPlus from './main'
import type { PluginSettingsData, PreviewMode } from './main'

export class SettingsTab extends SettingTab {

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
          if (!isNaN(value) && value > 0 && value <= 100) {
            settings.set('floatingWidth', value)
          } else {
            Notice.warning(t.widthRangeError)
            input.value = String(settings.get('floatingWidth'))
          }
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
          if (!isNaN(value) && value > 0 && value <= 100) {
            settings.set('floatingHeight', value)
          } else {
            Notice.warning(t.heightRangeError)
            input.value = String(settings.get('floatingHeight'))
          }
        }
      })
    })

    this.addSettingTitle(t.zoomScale)

    this.addSetting((setting: SettingItem) => {
      setting.addName(t.minScaleName)
      setting.addDescription(t.minScaleDescription)
      setting.addText((input: HTMLInputElement) => {
        input.value = String(settings.get('minScale'))
        input.onchange = () => {
          const value = parseFloat(input.value)
          if (!isNaN(value) && value > 0 && value <= settings.get('maxScale')) {
            settings.set('minScale', value)
          } else {
            Notice.warning(t.minScaleRangeError)
            input.value = String(settings.get('minScale'))
          }
        }
      })
    })

    this.addSetting((setting: SettingItem) => {
      setting.addName(t.maxScaleName)
      setting.addDescription(t.maxScaleDescription)
      setting.addText((input: HTMLInputElement) => {
        input.value = String(settings.get('maxScale'))
        input.onchange = () => {
          const value = parseFloat(input.value)
          if (!isNaN(value) && value > 0 && value >= settings.get('minScale')) {
            settings.set('maxScale', value)
          } else {
            Notice.warning(t.maxScaleRangeError)
            input.value = String(settings.get('maxScale'))
          }
        }
      })
    })
  }
}
