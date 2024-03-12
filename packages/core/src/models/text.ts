import type { Point } from '../types'

import { BaseModel } from './base'

export class TextModel extends BaseModel<SVGTextElement> {
  override onStart(point: Point) {
    this.el = this.createElement('text')

    this.attr('x', point.x)
    this.attr('y', point.y)

    this.attr('stroke-width', 0)
    this.attr('fill', this.brush.color)

    this.el.textContent = '点击输入'

    return this.el
  }

  override onEnd() {
    const path = this.el
    this.el = null

    if (!path)
      return false
    return true
  }
}
