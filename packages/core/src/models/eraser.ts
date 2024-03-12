import { getStroke } from 'perfect-freehand'
import { debounce } from 'perfect-debounce'
import type { Operation, Point } from '../types'
import { BaseModel } from './base'

export interface EraserPathFragment {
  x1: number
  x2: number
  y1: number
  y2: number
  segment: number
  element: any
}

export class EraserModel extends BaseModel<SVGRectElement> {
  svgPointPrevious?: DOMPoint
  svgPointCurrent?: DOMPoint

  pathSubFactor = 20
  pathFragments: EraserPathFragment[] = []

  private _erased: SVGElement[] = []

  private points: Point[] = []
  private pathEl?: SVGPathElement | null
  private svgEl?: SVGSVGElement | null
  private debounced?: any | null
  private eraserSize = 3

  onSelected(el: SVGSVGElement | null): void {
    this.svgEl = el

    const calculatePathFragments = (children: any, element?: any): void => {
      if (children && children.length) {
        for (let i = 0; i < children.length; i++) {
          const ele = children[i] as any
          if (ele.getTotalLength) {
            const pathLength = ele.getTotalLength()

            for (let j = 0; j < this.pathSubFactor; j++) {
              const pos1 = ele.getPointAtLength(pathLength * j / this.pathSubFactor)
              const pos2 = ele.getPointAtLength(pathLength * (j + 1) / this.pathSubFactor)
              this.pathFragments.push({
                x1: pos1.x,
                x2: pos2.x,
                y1: pos1.y,
                y2: pos2.y,
                segment: j,
                element: element || ele,
              })
            }
          }
          else {
            if (ele.children?.length) {
              calculatePathFragments(ele.children, ele)
            }
            else {
              const box = ele.getBBox()
              this.pathFragments.push({
                x1: box.x,
                x2: box.x + box.width,
                y1: box.y,
                y2: box.y + box.height,
                segment: 0,
                element: element || ele,
              })
            }
          }
        }
      }
    }

    if (el)
      calculatePathFragments(el.children)

    this.pathFragments.forEach((item) => {
      const transform = item.element.style.transform
      if (!transform)
        return
      try {
        const posiStr = transform.replace(/translate\(([-\d]+)px, ([-\d]+)px\)/, '[$1, $2]')
        const [dx, dy] = JSON.parse(posiStr)
        item.x1 += dx
        item.x2 += dx
        item.y1 += dy
        item.y2 += dy
      }
      catch (error) {

      }
    })
  }

  onUnselected(): void {
    this.pathFragments = []
  }

  override onStart(point: Point) {
    this.svgPointPrevious = this.svgElement!.createSVGPoint()
    this.svgPointPrevious.x = point.x
    this.svgPointPrevious.y = point.y

    this.debounced = debounce(async (points: Point[]) => {
      this.points = []
      this.pathEl?.setAttribute('d', this.getSvgPathData(points, true))
    }, 100)

    this.points = [point]
    this.pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    this.pathEl.setAttribute('fill', 'hsl(0, 0%, 0%, 10%)')
    this.pathEl.setAttribute('opacity', '0.8')
    this.pathEl.setAttribute('d', this.getSvgPathData(this.points))

    if (this.svgEl)
      this.svgEl.appendChild(this.pathEl)

    return undefined
  }

  override onMove(point: Point) {
    if (this.points[this.points.length - 1] !== point)
      this.points.push(point)

    this.pathEl?.setAttribute('d', this.getSvgPathData(this.points))

    this.debounced && this.debounced([point])

    this.svgPointCurrent = this.svgElement!.createSVGPoint()
    this.svgPointCurrent.x = point.x
    this.svgPointCurrent.y = point.y
    const erased = this.checkAndEraseElement()
    this.svgPointPrevious = this.svgPointCurrent
    return erased
  }

  override onEnd(): Operation {
    if (this.svgEl && this.pathEl)
      this.svgEl.removeChild(this.pathEl)

    this.points = []
    this.pathEl = null

    this.svgPointPrevious = undefined
    this.svgPointCurrent = undefined
    const erased = this._erased
    this._erased = []
    return {
      undo: () => erased.forEach(v => this.drauu._restoreNode(v)),
      redo: () => erased.forEach(v => this.drauu._removeNode(v)),
    }
  }

  private checkAndEraseElement() {
    if (this.pathFragments.length) {
      for (let i = 0; i < this.pathFragments.length; i++) {
        const segment = this.pathFragments[i]
        const line = {
          x1: this.svgPointPrevious!.x,
          x2: this.svgPointCurrent!.x,
          y1: this.svgPointPrevious!.y,
          y2: this.svgPointCurrent!.y,
        }
        if (this.lineLineIntersect(segment, line)) {
          this.drauu._removeNode(segment.element)
          this._erased.push(segment.element)
        }
      }
    }

    if (this._erased.length)
      this.pathFragments = this.pathFragments.filter(v => !this._erased.includes(v.element))
    return this._erased.length > 0
  }

  private lineLineIntersect(line1: any, line2: any): boolean {
    const x1 = line1.x1
    const x2 = line1.x2
    const x3 = line2.x1
    const x4 = line2.x2
    const y1 = line1.y1
    const y2 = line1.y2
    const y3 = line2.y1
    const y4 = line2.y2
    const pt_denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    const pt_x_num = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)
    const pt_y_num = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)
    const btwn = (a: number, b1: number, b2: number): boolean => {
      if ((a >= b1) && (a <= b2))
        return true
      return (a >= b2) && (a <= b1)
    }
    if (pt_denom === 0) {
      return false
    }
    else {
      const pt = {
        x: pt_x_num / pt_denom,
        y: pt_y_num / pt_denom,
      }
      return btwn(pt.x, x1, x2) && btwn(pt.y, y1, y2) && btwn(pt.x, x3, x4) && btwn(pt.y, y3, y4)
    }
  }

  private getSvgPathData(points: Point[], isStopping: boolean = false) {
    if (isStopping)
      return this.getLastPointPath(points)

    if (points.length > 10)
      points = points.slice(points.length - 10)

    const stroke = getStroke(points, {
      size: this.eraserSize * 2,
      start: { taper: true, easing: (t: number) => t },
      last: isStopping,
      simulatePressure: false,
      streamline: 0.32,
      thinning: 0,
    })

    let d: string

    if (stroke.length < 4)
      return this.getLastPointPath(points)
    else
      d = this.getSvgPathFromStroke(stroke)

    return d
  }

  private getLastPointPath(points: Point[]): string {
    if (points.length < 1)
      return ''
    const r = this.eraserSize
    const { x, y } = points[points.length - 1]
    return `M ${x - r},${y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`
  }

  private getSvgPathFromStroke(points: number[][], closed = true) {
    const average = (a: number, b: number) => (a + b) / 2

    const len = points.length

    if (len < 4)
      return ``

    let a = points[0]
    let b = points[1]
    const c = points[2]

    let result = `M${a[0].toFixed(4)},${a[1].toFixed(4)} Q${b[0].toFixed(4)},${b[1].toFixed(
      4,
    )} ${average(b[0], c[0]).toFixed(4)},${average(b[1], c[1]).toFixed(4)} T`

    for (let i = 2, max = len - 1; i < max; i++) {
      a = points[i]
      b = points[i + 1]
      result += `${average(a[0], b[0]).toFixed(4)},${average(a[1], b[1]).toFixed(4)} `
    }

    if (closed)
      result += 'Z'

    return result
  }
}
