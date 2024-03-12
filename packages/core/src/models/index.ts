import type { Drauu } from '../drauu'
import type { DrawingMode } from '../types'

import { StylusModel } from './stylus'
import { EllipseModel } from './ellipse'
import { LineModel } from './line'
import { RectModel } from './rect'
import { DrawModel } from './draw'
import { EraserModel } from './eraser'
import { SelectionModel } from './selection'
import { TextModel } from './text'

export function createModels(drauu: Drauu): Record<DrawingMode, DrawModel | StylusModel | LineModel | RectModel | EllipseModel | EraserModel | SelectionModel | TextModel> {
  return {
    draw: new DrawModel(drauu),
    stylus: new StylusModel(drauu),
    line: new LineModel(drauu),
    rectangle: new RectModel(drauu),
    ellipse: new EllipseModel(drauu),
    eraseLine: new EraserModel(drauu),
    selection: new SelectionModel(drauu),
    text: new TextModel(drauu),
  }
}

export { StylusModel, EllipseModel, LineModel, RectModel, DrawModel, EraserModel, SelectionModel, TextModel }
