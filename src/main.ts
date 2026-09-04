import './style.scss'
import { app, Plugin, CodeblockPostProcessor } from '@typora-community-plugin/core'
import { PreviewFloatingView, openPreviewFloatingWindow } from './floating-view'


export default class extends Plugin {
  onload(): void {
    this.register(
      app.viewManager.registerView(PreviewFloatingView.type, (leaf) => new PreviewFloatingView(leaf)))

    this.registerMarkdownPostProcessor(
      new PreviewButtonProcessor())
  }
}

const LANGS = ['mermaid']

interface PostProcessorContextLike {
  containerEl: HTMLElement
}

class PreviewButtonProcessor extends CodeblockPostProcessor {
  override lang: string[] = [...LANGS]

  constructor() {
    super()
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

type MarkdownRendererWithRegister = {
  register(processor: CodeblockPostProcessor): () => void
}
