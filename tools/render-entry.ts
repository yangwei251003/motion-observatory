import { variants, type Angle, type VariantId } from '../src/catalog'
import { createKeyboardRenderer } from '../src/keyboard'

Object.assign(window, {
  renderProduct(variantId: VariantId, view: Angle, width: number, height: number) {
    const canvas = document.querySelector('canvas')!
    const variant = variants.find(item => item.id === variantId)!
    const keyboard = createKeyboardRenderer(canvas, variant, view)
    try {
      keyboard.resize(width, height)
      keyboard.draw()
      return canvas.toDataURL('image/webp', .92).split(',')[1]
    } finally {
      keyboard.dispose()
      canvas.replaceWith(document.createElement('canvas'))
    }
  },
})
