import Selecto from 'selecto'
import Moveable from 'moveable'

import { BaseModel } from './base'

export class SelectionModel extends BaseModel<any> {
  private selecto?: Selecto | null
  private moveable?: Moveable | null

  private moveableTargets: (SVGElement | HTMLElement)[] = []

  private moveUndoFn: (() => void) = () => void 0
  private moveRedoFn: (() => void) = () => void 0

  private destroyMoveable() {
    if (this.moveable) {
      this.updateMoveableTargets([])
      this.moveable.destroy()
      this.moveable = null
    }
  }

  private destroySelecto() {
    if (this.selecto) {
      this.selecto.destroy()
      this.selecto = null
    }
  }

  private destroy() {
    this.destroyMoveable()
    this.destroySelecto()
  }

  private updateMoveableTargets(nextTargets: (SVGElement | HTMLElement)[]) {
    this.moveableTargets = nextTargets
    this.moveable!.target = this.moveableTargets
  };

  private initMoveable(el: HTMLElement) {
    this.destroyMoveable()
    this.moveable = new Moveable(el, {
      target: this.moveableTargets,
      draggable: true,
      origin: false,
      svgOrigin: '50% 50%',
      padding: { left: 3, top: 3, right: 3, bottom: 3 },
      props: {
        editable: true,
      },
    })

    this.moveable.on('drag', (e) => {
      e.target.style.transform = e.transform
    })

    this.moveable.on('click', (e) => {
      this.selecto?.clickTarget(e.inputEvent, e.inputTarget)

      if (e.inputTarget.nodeName === 'text') {
        const oldText = e.inputTarget.textContent || ''
        // eslint-disable-next-line no-alert
        const text = window.prompt('请输入', oldText)
        e.inputTarget.textContent = text || oldText || '点击输入'
      }
    })

    this.moveable.on('clickGroup', (e) => {
      this.selecto?.clickTarget(e.inputEvent, e.inputTarget)
    })

    this.moveable.on('renderStart', (e) => {
      const target = e.target
      const transform = target.style.transform
      this.moveUndoFn = () => {
        target.style.transform = transform
      }
    })

    this.moveable.on('render', (e) => {
      e.target.style.cssText += e.cssText
    })

    this.moveable.on('renderEnd', (e) => {
      const target = e.target as SVGElement
      const transform = target.style.transform
      this.moveRedoFn = () => {
        target.style.transform = transform
      }
      //
      this.drauu.selectionCommit({
        undo: this.moveUndoFn,
        redo: this.moveRedoFn,
      }, [target])
    })

    this.moveable.on('renderGroupStart', (e) => {
      const targets = e.targets
      const transforms = targets.map(target => target.style.transform)
      this.moveUndoFn = () => {
        targets.forEach((target, i) => {
          target.style.transform = transforms[i]
        })
      }
    })

    this.moveable.on('renderGroup', (e) => {
      e.events.forEach((ev) => {
        ev.target.style.cssText += ev.cssText
      })
    })

    this.moveable.on('renderGroupEnd', (e) => {
      const targets = e.targets as SVGElement[]
      const transforms = targets.map(target => target.style.transform)
      this.moveRedoFn = () => {
        targets.forEach((target, i) => {
          target.style.transform = transforms[i]
        })
      }
      //
      this.drauu.selectionCommit({
        undo: this.moveUndoFn,
        redo: this.moveRedoFn,
      }, targets)
    })
  }

  private initSelecto(el: HTMLElement) {
    this.destroySelecto()
    this.selecto = new Selecto({
      container: el,
      rootContainer: el,
      selectableTargets: ['[data-drauu_index]'],
      selectByClick: true,
      selectFromInside: true,
      continueSelect: false,
      toggleContinueSelect: 'shift',
      hitRate: 10,
      ratio: 0,
    })

    this.selecto.on('dragStart', (e) => {
      const target = e.inputEvent.target
      if (
        this.moveable?.isMoveableElement(target)
        || this.moveable?.isInside(e.clientX, e.clientY)
        || this.moveableTargets.some(t => t === target || t.contains(target))
      ) {
        e.stop()
        this.moveable?.dragStart(e.inputEvent)
      }
    })

    this.selecto.on('selectEnd', (e) => {
      if (e.isDragStartEnd) {
        e.inputEvent.preventDefault()
        this.moveable?.waitToChangeTarget().then(() => {
          this.moveable?.dragStart(e.inputEvent)
        })
      }
      this.updateMoveableTargets(e.selected)
    })
  }

  onSelected(el: SVGSVGElement | null): void {
    const parentEl = el?.parentElement
    if (!parentEl)
      return

    this.initMoveable(parentEl)
    this.initSelecto(parentEl)
  }

  onUnselected() {
    this.destroy()
  }
}
