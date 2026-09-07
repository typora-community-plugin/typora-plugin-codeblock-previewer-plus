import { app, html, WorkspaceLeaf, WorkspaceView } from '@typora-community-plugin/core'

export interface PreviewFullscreenViewState {
  html: string
  i18n?: {
    closeHint: string
  }
}

const STEP = 0.1

const MIN_SCALE = 0.1
const MAX_SCALE = 5

function clampScale(scale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))
}

/**
 * Fullscreen preview mode.
 *
 * A black overlay covering the whole window; a centered, borderless square
 * container (background matching document.body) holds the rendered preview
 * SVG. Wheel to zoom, drag to pan, click on the mask to close. No buttons.
 */
export class PreviewFullscreenView extends WorkspaceView {
  static type = 'codeblock-previewer-plus.fullscreen-preview'

  containerEl: HTMLElement = html`
    <div class="cbp-fullscreen" title="">
      <div class="cbp-fullscreen__box">
        <div class="cbp-fullscreen__content"></div>
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

    const contentEl = this.containerEl.querySelector('.cbp-fullscreen__content') as HTMLElement
    const state = (this.leaf.state ?? {}) as PreviewFullscreenViewState
    contentEl.innerHTML = state.html ?? ''

    if (state.i18n?.closeHint) {
      this.containerEl.title = state.i18n.closeHint
    }

    // Fit the preview to the square box at 100% zoom.
    requestAnimationFrame(() => this.fitContent())

    const boxEl = this.containerEl.querySelector('.cbp-fullscreen__box') as HTMLElement

    // Track whether the current press turned into a drag (>3px). A pure click
    // on the mask (outside the square container) closes the view.
    let downX = 0
    let downY = 0
    let moved = false
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      downX = e.clientX
      downY = e.clientY
      moved = false
      this.startPan(e)
    }
    const onMouseMoveGlobal = (e: MouseEvent) => {
      if (!moved && (Math.abs(e.clientX - downX) > 3 || Math.abs(e.clientY - downY) > 3)) moved = true
    }

    this.registerDomEvent(this.containerEl, 'mousedown', onMouseDown)
    this.registerDomEvent(document, 'mousemove', onMouseMoveGlobal)
    this.registerDomEvent(
      this.containerEl,
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault()
        const factor = e.deltaY < 0 ? 1 + STEP : 1 - STEP
        this.setZoom(this.scale * factor, e.clientX, e.clientY)
      },
      { passive: false }
    )

    // Click on the mask (not on the square container, and not after a drag).
    const onClick = (e: MouseEvent) => {
      if (moved) return
      if ((e.target as HTMLElement).closest('.cbp-fullscreen__box')) return
      this.closePreview()
    }
    this.registerDomEvent(this.containerEl, 'click', onClick)

    // Escape key also closes.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closePreview()
    }
    this.registerDomEvent(document, 'keydown', onKeyDown)
  }

  /** @override */
  onunload(): void {
    this.containerEl.remove()
  }

  private closePreview(): void {
    const leaf = this.leaf
    if (!leaf?.parent) return
    setTimeout(() => leaf.detach(), 0)
  }

  /** Measure the SVG at scale 1 and fit it inside the viewport. */
  private fitContent(): void {
    const boxEl = this.containerEl.querySelector('.cbp-fullscreen__box') as HTMLElement
    const contentEl = this.containerEl.querySelector('.cbp-fullscreen__content') as HTMLElement
    if (!boxEl || !contentEl) return

    // Reset the transform so the content is measured at its natural size.
    boxEl.style.transform = 'none'
    void boxEl.offsetWidth

    const svg = contentEl.querySelector('svg') as SVGSVGElement | null
    let naturalW: number
    let naturalH: number
    if (svg) {
      const vb = svg.viewBox.baseVal
      const rect = svg.getBoundingClientRect()
      if (vb.width > 0 && vb.height > 0) {
        // Size the box to exactly match the SVG's aspect ratio.
        boxEl.style.aspectRatio = `${vb.width} / ${vb.height}`
        naturalW = vb.width
        naturalH = vb.height
      } else {
        naturalW = rect.width || boxEl.clientWidth
        naturalH = rect.height || boxEl.clientHeight
      }
    } else {
      const rect = contentEl.getBoundingClientRect()
      naturalW = rect.width || boxEl.clientWidth
      naturalH = rect.height || boxEl.clientHeight
    }

    // Fit the SVG inside the viewport, keeping a margin on all sides.
    const targetW = window.innerWidth - 64
    const targetH = window.innerHeight - 64
    if (targetW <= 0 || targetH <= 0) return

    this.scale = clampScale(Math.min(targetW / naturalW, targetH / naturalH))
    this.panX = 0
    this.panY = 0
    this.applyTransform()
  }

  private setZoom(next: number, originX?: number, originY?: number): void {
    const clamped = clampScale(next)
    if (clamped === this.scale && originX === undefined) return

    // Zoom around the mouse position when provided.
    if (originX !== undefined && originY !== undefined) {
      const boxEl = this.containerEl.querySelector('.cbp-fullscreen__box') as HTMLElement
      const rect = boxEl.getBoundingClientRect()
      // Cursor offset from the center of the scaled box (the flex anchor).
      const px = originX - (rect.left + rect.width / 2)
      const py = originY - (rect.top + rect.height / 2)
      // Keep the point under the cursor stationary.
      this.panX += ((this.scale - clamped) * px) / this.scale
      this.panY += ((this.scale - clamped) * py) / this.scale
    }
    this.scale = clamped
    this.applyTransform()
  }

  private applyTransform(): void {
    const boxEl = this.containerEl.querySelector('.cbp-fullscreen__box') as HTMLElement
    boxEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`
  }

  private startPan(e: MouseEvent): void {
    const boxEl = this.containerEl.querySelector('.cbp-fullscreen__box') as HTMLElement
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
          boxEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`
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
 * Open the fullscreen preview mode for the given rendered content.
 */
export function openPreviewFullscreenWindow(
  htmlContent: string,
  i18n?: PreviewFullscreenViewState['i18n'],
): void {
  const leaf = app.workspace.createLeaf({
    type: PreviewFullscreenView.type,
    state: {
      path: `typ://${PreviewFullscreenView.type}/${++ID}/Previewer`,
      html: htmlContent,
      i18n,
    },
  })
  app.commands.run('core.workspace.floating-split:open-leaf', [leaf])
}
