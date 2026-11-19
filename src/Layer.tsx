import { useLayoutEffect, useRef, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { X } from 'lucide-react'
import { noMotion, play, settle } from './motion'

export type LayerKind = 'modal' | 'drawer' | 'detail' | 'index' | 'curtain'

export function Layer({ open, kind, label, element, onClose, children }: {
  open: boolean; kind: LayerKind; label: string; element?: RefObject<HTMLDialogElement | null>; onClose?: () => void; children: ReactNode
}) {
  const fallback = useRef<HTMLDialogElement>(null)
  const ref = element ?? fallback
  const closing = useRef(false)
  useLayoutEffect(() => {
    const dialog = ref.current!
    if (!open) return
    const opener = document.activeElement
    closing.current = false
    dialog.showModal()
    const focus = dialog.querySelector<HTMLElement>('[data-focus]')
    focus?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      delete dialog.dataset.exit
      if (opener instanceof HTMLElement && opener.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true })
    }
  }, [open, ref])

  async function dismiss() {
    if (!onClose || closing.current) return
    const dialog = ref.current!
    if (!dialog.open) return
    closing.current = true
    if (kind !== 'detail' && !noMotion()) {
      dialog.dataset.exit = 'true'
      const transform = kind === 'drawer' ? 'translateX(105%)' : 'translateY(10px) scale(.965)'
      await settle(play(dialog, [{ transform: 'none', opacity: 1 }, { transform, opacity: kind === 'drawer' ? 1 : 0 }], 245, undefined, 'forwards'))
    }
    onClose()
  }

  function click(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget || kind === 'detail' || kind === 'curtain') return
    const box = event.currentTarget.getBoundingClientRect()
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) void dismiss()
  }

  return <dialog aria-label={label} ref={ref} className={'layer layer-' + kind}
    onCancel={event => { event.preventDefault(); void dismiss() }} onClick={click}>
    {kind !== 'detail' && kind !== 'curtain' &&
      <button type="button" className="icon-button layer-close" aria-label="关闭" data-focus onClick={() => void dismiss()}><X size={20}/></button>}
    {open && children}
  </dialog>
}
