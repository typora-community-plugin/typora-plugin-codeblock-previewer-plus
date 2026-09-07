import { app, html, WorkspaceLeaf, WorkspaceView } from '@typora-community-plugin/core'

export interface PreviewFloatingViewState {
  html: string
  width?: number
  height?: number
  i18n?: {
    zoomOut: string
    zoomIn: string
    resetZoom: string
  }
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
          <button type="button" class="cbp-btn cbp-float__zoom-out"><i class="fa fa-minus"></i></button>
          <span class="cbp-float__scale">100%</span>
          <button type="button" class="cbp-btn cbp-float__zoom-in"><i class="fa fa-plus"></i></button>
          <button type="button" class="cbp-btn cbp-float__reset"><i class="fa fa-expand"></i></button>
        </div>
      </div>
    </div>`

  private scale = 1
  private panX = 0
  private panY = 0
  /** Offset of the SVG inside the content element (untransformed, at scale 1). */
  private naturalW = 0
  private naturalH = 0
  private svgOffsetX = 0
  private svgOffsetY = 0

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
  }

  /** @override */
  onload(): void {
    document.body.append(this.containerEl)

    const contentEl = this.containerEl.querySelector('.cbp-float__content') as HTMLElement
    const state = (this.leaf.state ?? {}) as PreviewFloatingViewState
    const width = state.width
    if (width && width > 0 && width <= 100) {
      this.containerEl.style.width = `${width}vw`
      this.containerEl.style.left = `calc(50% - ${width / 2}vw)`
    }
    const height = state.height
    if (height && height > 0 && height <= 100) {
      this.containerEl.style.height = `${height}vh`
      this.containerEl.style.top = `calc(50% - ${height / 2}vh)`
    }
    contentEl.innerHTML = state.html ?? ''

    const i18n = state.i18n
    if (i18n) {
      ;(this.containerEl.querySelector('.cbp-float__zoom-out') as HTMLElement).title = i18n.zoomOut
      ;(this.containerEl.querySelector('.cbp-float__zoom-in') as HTMLElement).title = i18n.zoomIn
      ;(this.containerEl.querySelector('.cbp-float__reset') as HTMLElement).title = i18n.resetZoom
    }

    requestAnimationFrame(() => this.fitContent())

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
      this.fitContent()
    })
  }

  /** @override */
  onunload(): void {
    this.containerEl.remove()
  }

  /** Measure the SVG at scale 1, then fit and center it inside the body. */
  private fitContent(): void {
    const bodyEl = this.containerEl.querySelector('.cbp-float__body') as HTMLElement
    const contentEl = this.containerEl.querySelector('.cbp-float__content') as HTMLElement
    if (!bodyEl || !contentEl) return

    // Reset the transform so the SVG is measured at its natural size.
    contentEl.style.transform = 'none'
    void contentEl.offsetWidth

    const contentRect = contentEl.getBoundingClientRect()
    const svg = contentEl.querySelector('svg') as SVGSVGElement | null
    const svgRect = svg ? svg.getBoundingClientRect() : null

    if (svgRect && svgRect.width > 0 && svgRect.height > 0) {
      this.naturalW = svgRect.width
      this.naturalH = svgRect.height
      // Offset of the SVG inside the untransformed content element.
      this.svgOffsetX = svgRect.left - contentRect.left
      this.svgOffsetY = svgRect.top - contentRect.top
    } else {
      this.naturalW = Math.max(contentEl.offsetWidth, 1)
      this.naturalH = Math.max(contentEl.offsetHeight, 1)
      this.svgOffsetX = 0
      this.svgOffsetY = 0
    }

    const pad = 8
    const availW = Math.max(bodyEl.clientWidth - pad * 2, 1)
    const availH = Math.max(bodyEl.clientHeight - pad * 2, 1)
    this.scale = clampScale(Math.min(availW / this.naturalW, availH / this.naturalH))

    // With transform-origin top left, a content point p lands at
    // origin + scale * (p + pan). Put the SVG's center on the body's center.
    const centerX = this.svgOffsetX + this.naturalW / 2
    const centerY = this.svgOffsetY + this.naturalH / 2
    this.panX = availW / (2 * this.scale) - centerX
    this.panY = availH / (2 * this.scale) - centerY
    this.applyTransform()
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
export function openPreviewFloatingWindow(
  htmlContent: string,
  width?: number,
  height?: number,
  i18n?: PreviewFloatingViewState['i18n'],
): void {
  const leaf = app.workspace.createLeaf({
    type: PreviewFloatingView.type,
    state: {
      path: `typ://${PreviewFloatingView.type}/${++ID}/Previewer`,
      theme: 'window',
      resizable: true,
      draggable: true,
      onClose: () => leaf.detach(),
      html: htmlContent,
      width,
      height,
      i18n,
    },
  })
  app.commands.run('core.workspace.floating-split:open-leaf', [leaf])
}
