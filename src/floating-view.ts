import { app, html, WorkspaceLeaf, WorkspaceView } from '@typora-community-plugin/core'

export interface PreviewFloatingViewState {
  html: string
}

const STEP = 0.1

const MIN_SCALE = 0.1
const MAX_SCALE = 5

function clampScale(scale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))
}

export class PreviewFloatingView extends WorkspaceView {
  static type = 'codeblock-previewer-plus.floating-preview'

  containerEl: HTMLElement = html`
    <div class="cbp-float">
      <div class="cbp-float__body">
        <div class="cbp-float__content"></div>
        <div class="cbp-float__toolbar">
          <button type="button" class="cbp-btn cbp-float__zoom-out" title="Zoom out"><i class="fa fa-minus"></i></button>
          <span class="cbp-float__scale">100%</span>
          <button type="button" class="cbp-btn cbp-float__zoom-in" title="Zoom in"><i class="fa fa-plus"></i></button>
          <button type="button" class="cbp-btn cbp-float__reset" title="Reset zoom"><i class="fa fa-expand"></i></button>
        </div>
      </div>
    </div>`

  private scale = 1
  private panX = 0
  private panY = 0

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
  }

  /** @override */
  onload(): void {
    document.body.append(this.containerEl)

    const contentEl = this.containerEl.querySelector('.cbp-float__content') as HTMLElement
    const state = (this.leaf.state ?? {}) as PreviewFloatingViewState
    contentEl.innerHTML = state.html ?? ''

    this.scale = 1
    this.panX = 0
    this.panY = 0
    this.applyTransform()

    this.registerDomEvent(this.containerEl.querySelector('.cbp-float__body')!, 'mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.cbp-btn')) return
      const toolbar = e.target as HTMLElement | null
      if (toolbar?.closest('.cbp-float__toolbar')) return
      this.startPan(e)
    })
    this.registerDomEvent(
      this.containerEl.querySelector('.cbp-float__body')!,
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault()
        this.setZoom(this.scale + (e.deltaY < 0 ? STEP : -STEP))
      },
      { passive: false }
    )
    this.registerDomEvent(this.containerEl.querySelector('.cbp-float__zoom-in')!, 'click', () => this.setZoom(this.scale + STEP))
    this.registerDomEvent(this.containerEl.querySelector('.cbp-float__zoom-out')!, 'click', () => this.setZoom(this.scale - STEP))
    this.registerDomEvent(this.containerEl.querySelector('.cbp-float__reset')!, 'click', () => {
      this.panX = 0
      this.panY = 0
      this.setZoom(1)
    })
  }

  /** @override */
  onunload(): void {
    this.containerEl.remove()
  }

  private setZoom(scale: number): void {
    this.scale = clampScale(scale)
    this.applyTransform()
  }

  private applyTransform(): void {
    const contentEl = this.containerEl.querySelector('.cbp-float__content') as HTMLElement
    contentEl.style.transform = `scale(${this.scale}) translate(${this.panX}px, ${this.panY}px)`
    const label = this.containerEl.querySelector('.cbp-float__scale') as HTMLElement
    if (label) label.textContent = `${Math.round(this.scale * 100)}%`
  }

  private startPan(e: MouseEvent): void {
    const contentEl = this.containerEl.querySelector('.cbp-float__content') as HTMLElement
    const startX = e.clientX
    const startY = e.clientY
    const startPanX = this.panX
    const startPanY = this.panY

    let rafId: number | undefined

    const onMove = (ev: MouseEvent) => {
      this.panX = startPanX + (ev.clientX - startX) / this.scale
      this.panY = startPanY + (ev.clientY - startY) / this.scale
      if (rafId === undefined) {
        rafId = requestAnimationFrame(() => {
          contentEl.style.transform = `scale(${this.scale}) translate(${this.panX}px, ${this.panY}px)`
          rafId = undefined
        })
      }
    }
    const onUp = () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
}

let ID = 0

/**
 * Open a floating preview window with the given rendered content.
 */
export function openPreviewFloatingWindow(htmlContent: string): void {
  const leaf = app.workspace.createLeaf({
    type: PreviewFloatingView.type,
    state: {
      path: `typ://${PreviewFloatingView.type}/${++ID}/Previewer`,
      theme: 'window',
      resizable: true,
      draggable: true,
      onClose: () => leaf.detach(),
      html: htmlContent,
    },
  })
  app.commands.run('core.workspace.floating-split:open-leaf', [leaf])
}
