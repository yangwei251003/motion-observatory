import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check, ChevronLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { asset, products, quantity, subtotal, type Basket, type ProductId } from './catalog'
import { Layer } from './Layer'
import { Tick } from './ProductDetails'
import { easeInOut, noMotion, play, settle } from './motion'

const digits = Array.from({ length: 30 }, (_, slot) => slot % 10)
const glyphHeight = 1.15

function Digit({ value, direction }: { value: number; direction: number }) {
  const track = useRef<HTMLSpanElement>(null)
  const previous = useRef(0)
  useLayoutEffect(() => {
    const reel = track.current!
    const initial = previous.current
    const shift = direction < 0 ? -((initial - value + 10) % 10) : (value - initial + 10) % 10
    const resting = `translateY(-${(10 + value) * glyphHeight}em)`
    const animation = shift && !noMotion() ? play(reel, [
      { transform: `translateY(-${(10 + initial) * glyphHeight}em)` },
      { transform: `translateY(-${(10 + initial + shift) * glyphHeight}em)` },
    ], 360 + Math.abs(shift) * 22, easeInOut) : undefined
    reel.style.transform = resting
    previous.current = value
    return () => animation?.cancel()
  }, [value, direction])
  return <span className="roll-digit"><span ref={track} className="digit-reel">{digits.map((digit, index) => <span key={index}>{digit}</span>)}</span></span>
}

export function Odometer({ value, currency = false }: { value: number; currency?: boolean }) {
  const prev = useRef(value)
  const direction = Math.sign(value - prev.current)
  useLayoutEffect(() => { prev.current = value }, [value])
  const slots = String(value).split('')
  return <span className="odometer" aria-label={(currency ? '¥' : '') + value}>
    <span aria-hidden="true">{currency && '¥'}{slots.map((digit, index) => <Digit key={slots.length - index} direction={direction} value={Number(digit)}/>)}</span>
  </span>
}

export function Thumb({ id }: { id: ProductId }) {
  const product = products[id]
  return product.variant ? <img className="product-thumb" src={asset(product.variant)} alt="" width={76} height={51}/> :
    <span className={'product-thumb accessory-thumb ' + id} style={{ '--swatch': product.tone } as React.CSSProperties} aria-hidden="true">
      {id === 'caps' && <span><i/><i/><i/><i/><i/><i/></span>}
    </span>
}

export function BagButton({ basket, onClick, id }: { basket: Basket; onClick: () => void; id: string }) {
  return <button type="button" className="bag-button" id={id} onClick={event => { event.currentTarget.focus(); onClick() }} aria-label={'购物袋，' + quantity(basket) + ' 件'}>
    <ShoppingBag size={20}/> <span className="bag-word">购物袋</span><span className="bag-count"><Odometer value={quantity(basket)}/></span>
  </button>
}

export type Notice = { id: ProductId; key: number }
export function AddedToast({ notice, onOpen }: { notice: Notice; onOpen: () => void }) {
  const product = products[notice.id]
  return <aside className="added-toast" role="status" aria-label="已加入购物袋">
    <Thumb id={notice.id}/><div><strong><Tick size={17}/> 已加入购物袋</strong><small>{product.name} · ¥{product.price}</small></div>
    <button type="button" onClick={onOpen}>查看</button><span className="toast-clock" aria-hidden="true"/>
  </aside>
}

function productKeys(basket: Basket) { return Object.keys(basket) as ProductId[] }

export function BasketDrawer({ basket, onChange, onClose, onCheckout, onBrowse, cue }: {
  basket: Basket; onChange: (id: ProductId, delta: number | 'remove') => void; onClose: () => void;
  onCheckout: () => void; onBrowse: () => void; cue: ReactNode
}) {
  const list = useRef<HTMLDivElement>(null)
  const previous = useRef<Map<string, DOMRect> | null>(null)
  const pending = useRef<Animation[]>([])

  function change(id: ProductId, delta: number | 'remove') {
    const elements = Array.from(list.current!.querySelectorAll<HTMLElement>('[data-cart-key]'))
    previous.current = new Map(elements.map(node => [node.dataset.cartKey!, node.getBoundingClientRect()]))
    const extras = list.current!.querySelector('.cart-extras')
    if (extras) previous.current.set('extras', extras.getBoundingClientRect())
    pending.current.forEach(motion => motion.cancel())
    pending.current = []
    if (!noMotion() && (delta === 'remove' || (delta === -1 && basket[id] === 1))) {
      const row = elements.find(node => node.dataset.cartKey === id)
      if (row) {
        const ghost = row.cloneNode(true) as HTMLElement
        const rect = previous.current.get(id)!
        ghost.removeAttribute('data-cart-key')
        ghost.inert = true
        ghost.setAttribute('aria-hidden', 'true')
        ghost.classList.add('cart-ghost')
        Object.assign(ghost.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px' })
        list.current!.closest('dialog')!.append(ghost)
        void settle(play(ghost, [{ opacity: 1 }, { opacity: 0, transform: 'translateX(24px) scale(.95)' }], 270)).then(() => ghost.remove())
      }
    }
    onChange(id, delta)
  }

  useLayoutEffect(() => {
    const saved = previous.current
    if (!saved) return
    previous.current = null
    if (noMotion()) return
    for (const element of list.current!.querySelectorAll<HTMLElement>('[data-cart-key], .cart-extras, .empty-bag')) {
      const before = saved.get(element.dataset.cartKey ?? 'extras')
      const distance = before ? before.top - element.getBoundingClientRect().top : 0
      if (distance) pending.current.push(play(element, [{ transform: `translateY(${distance}px)` }, { transform: 'none' }], 420))
      else if (element.dataset.cartKey && !before) pending.current.push(play(element, [{ opacity: 0, transform: 'translateY(15px) scale(.98)' }, { opacity: 1, transform: 'none' }], 385))
    }
  }, [basket])

  const keys = productKeys(basket)
  return <Layer open kind="drawer" label="购物袋" onClose={onClose}>
    <header className="drawer-heading"><h2>购物袋</h2><span>{quantity(basket)} 件</span></header>
    <div className="drawer-contents" id="cart-list" tabIndex={-1} ref={list}>
      {keys.length ? keys.map(id => {
        const product = products[id]
        const count = basket[id]!
        return <div className="bag-row" data-cart-key={id} key={id}>
          <Thumb id={id}/><div className="bag-item-name"><b>{product.name}</b><small>¥{product.price} / 件</small></div>
          <div className="bag-item-tools"><Odometer value={product.price * count} currency/>
            <div><span className="stepper">
              <button type="button" aria-label={'减少 ' + product.name} onClick={() => change(id, -1)}><Minus size={13}/></button>
              <Odometer value={count}/>
              <button type="button" aria-label={'增加 ' + product.name} disabled={count >= 12} onClick={() => change(id, 1)}><Plus size={13}/></button>
            </span><button type="button" className="trash" aria-label={'移除 ' + product.name} onClick={() => change(id, 'remove')}><Trash2 size={15}/></button></div>
          </div>
        </div>
      }) : <div className="empty-bag"><ShoppingBag size={26}/><p>购物袋是空的。</p><button className="text-link" type="button" onClick={onBrowse}>去选键盘</button></div>}
      <section className="cart-extras"><h3>搭配配件</h3>
        <div>{(['caps', 'rest'] as const).map(id => <article key={id}>
          <Thumb id={id}/><span><b>{products[id].name}</b><small>¥{products[id].price}</small></span>
          <button type="button" aria-label={'添加 ' + products[id].name} disabled={(basket[id] ?? 0) >= 12} onClick={() => change(id, 1)}><Plus size={14}/> 加入</button>
        </article>)}</div>
      </section>
    </div>
    <footer className="drawer-footer">
      <dl><div><dt>小计</dt><dd>¥{subtotal(basket)}</dd></div><div><dt>演示运费</dt><dd>¥0</dd></div></dl>
      <div className="cart-total"><b>合计</b><strong id="cart-total"><Odometer value={subtotal(basket)} currency/></strong></div>
      <button type="button" id="checkout-start" className="pill primary" disabled={!keys.length} onClick={onCheckout}>去结算</button>
      {cue}
    </footer>
  </Layer>
}

export function Checkout({ basket, onBack, onOpenBag, onOrder }: { basket: Basket; onBack: () => void; onOpenBag: () => void; onOrder: () => void }) {
  const [shipping, setShipping] = useState('standard')
  const [payment, setPayment] = useState('preview')
  const [ordered, setOrdered] = useState(false)
  const delivery = shipping === 'express' ? 18 : 0
  const amount = subtotal(basket) + delivery
  function order(event: FormEvent) {
    event.preventDefault()
    setOrdered(true)
    onOrder()
  }
  return <div className="checkout-page">
    <header className="topbar checkout-top"><button className="text-link" type="button" onClick={onBack}><ChevronLeft size={17}/> 返回商品页</button><span className="brand">KEYFORM<span>K75</span></span><span>演示结算</span></header>
    <main className="checkout-main">
      <h1 id="checkout-title" tabIndex={-1}>结算<span>.</span></h1>
      {ordered ? <section className="receipt" role="status"><Tick size={33}/><h2>演示订单已生成</h2><p>您可以返回商品页继续体验。</p><button type="button" className="pill primary" onClick={onBack}>返回商品页</button></section> :
        !quantity(basket) ? <section className="receipt"><h2>购物袋是空的</h2><button type="button" className="pill primary" onClick={onBack}>返回选商品</button></section> :
          <form className="checkout-grid" onSubmit={order}>
            <div>
              <section><h2>收货信息</h2><p>示例收货人 · 示例地址</p></section>
              <section><h2>配送方式</h2><div className="checkout-choices">
                <label><input type="radio" name="delivery" checked={shipping === 'standard'} onChange={() => setShipping('standard')}/><span>标准配送<small>¥0</small></span></label>
                <label><input type="radio" name="delivery" checked={shipping === 'express'} onChange={() => setShipping('express')}/><span>优先配送<small>¥18</small></span></label>
              </div></section>
              <section><h2>演示支付方式</h2><div className="checkout-choices">
                <label><input type="radio" name="payment" checked={payment === 'preview'} onChange={() => setPayment('preview')}/><span>模拟在线支付</span></label>
                <label><input type="radio" name="payment" checked={payment === 'pickup'} onChange={() => setPayment('pickup')}/><span>模拟到店支付</span></label>
              </div></section>
            </div>
            <aside className="checkout-summary"><div><h2>订单摘要</h2><button type="button" onClick={onOpenBag}>编辑购物袋</button></div>
              <ul>{productKeys(basket).map(id => <li key={id}><span>{products[id].name} × {basket[id]}</span><span>¥{products[id].price * basket[id]!}</span></li>)}</ul>
              <p><span>配送</span><span>¥{delivery}</span></p>
              <p className="checkout-final"><b>合计</b><Odometer value={amount} currency/></p>
              <button type="submit" className="pill primary"><Check size={17}/> 确认演示订单</button>
            </aside>
          </form>}
    </main>
  </div>
}

const logo = Array.from('KEYFORM')
export function Curtain({ swap, done }: { swap: () => void; done: () => void }) {
  const cover = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ swap, done })
  callbacks.current = { swap, done }
  useLayoutEffect(() => {
    let cancelled = false
    const motions: Animation[] = []
    async function transition() {
      const panel = cover.current!
      const dialog = panel.closest('dialog')!
      dialog.dataset.curtainPhase = 'covering'
      const entrance = play(panel, [
        { transform: 'translateY(105%)', borderRadius: '50% 50% 0 0 / 15% 15% 0 0' },
        { transform: 'translateY(0)', borderRadius: '0' },
      ], 650, easeInOut, 'both')
      motions.push(entrance)
      Array.from(panel.querySelectorAll<HTMLElement>('.curtain-letter')).forEach((letter, index) => {
        motions.push(letter.animate([{ transform: 'translateY(112%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], {
          duration: 460, delay: 260 + index * 53, easing: 'cubic-bezier(.17,.8,.2,1)', fill: 'both',
        }))
      })
      await Promise.all(motions.map(settle))
      if (cancelled) return
      callbacks.current.swap()
      dialog.dataset.curtainPhase = 'uncovering'
      const exit = play(panel, [
        { transform: 'translateY(0)', borderRadius: '0' },
        { transform: 'translateY(-110%)', borderRadius: '0 0 50% 50% / 0 0 15% 15%' },
      ], 570, easeInOut, 'both')
      motions.push(exit)
      await settle(exit)
      if (!cancelled) callbacks.current.done()
    }
    void transition()
    return () => { cancelled = true; motions.forEach(motion => motion.cancel()) }
  }, [])
  return <Layer open kind="curtain" label="切换页面">
    <div className="curtain-cover" ref={cover}><div className="curtain-brand" aria-label="KEYFORM K75">
      {[...logo, ' ', 'K75'].map((letter, index) => <span className="curtain-letter-window" key={index}><span className="curtain-letter">{letter}</span></span>)}
    </div><p>动效观察室</p></div>
  </Layer>
}
