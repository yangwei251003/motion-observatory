import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { BookOpen, MousePointer2 } from 'lucide-react'
import { effects, quantity, variants, type Basket, type ProductId, type Variant, type VariantId } from './catalog'
import { BagButton, BasketDrawer, AddedToast, Checkout, Curtain, type Notice } from './Commerce'
import { IndexPanel, EffectCue } from './IndexPanel'
import { CustomCursor } from './PointerEffects'
import { flightOrigin, ProductDetails, type FlightOrigin } from './ProductDetails'
import { Afterglow, Editions, FeatureCards, Header, Hero, InfoDialog, Support } from './Showroom'
import { noMotion } from './motion'
import './styles/base.css'
import './styles/showroom.css'
import './styles/overlays.css'

const routeCheckout = () => location.hash === '#checkout'
const getEffect = () => {
  const match = /^#effect-(\d+)$/.exec(location.hash)
  const value = Number(match?.[1])
  return value >= 1 && value <= effects.length ? value : undefined
}
const readQuiet = () => {
  try { return localStorage.getItem('keyform.reduce') === 'on' } catch { return false }
}

type Detail = { variant: Variant; origin: FlightOrigin | null }
type Route = 'shop' | 'checkout'
type Info = number | 'switches'

function App() {
  const [screen, setScreen] = useState<Route>(routeCheckout() ? 'checkout' : 'shop')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [basket, setBasket] = useState<Basket>({})
  const [drawer, setDrawer] = useState(false)
  const [index, setIndex] = useState(false)
  const [info, setInfo] = useState<Info | null>(null)
  const [active, setActive] = useState<number>()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [curtain, setCurtain] = useState<Route | null>(null)
  const [favorites, setFavorites] = useState<Partial<Record<VariantId, boolean>>>({})
  const [quiet, setQuiet] = useState(readQuiet)
  const running = useRef(false)
  const visit = useRef(0)
  const noticeId = useRef(0)
  const returnLocation = useRef('#home')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    document.documentElement.dataset.motion = quiet ? 'off' : 'full'
    try { localStorage.setItem('keyform.reduce', quiet ? 'on' : 'off') } catch {}
  }, [quiet])

  useEffect(() => {
    if (!index && !detail && info === null && !drawer && !curtain) return
    const original = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = original }
  }, [index, Boolean(detail), info, drawer, curtain])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function goTo(id: string, focus = true) {
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ block: id === 'feature-cards' || id === 'edition-cards' || id === 'afterglow' ? 'center' : 'nearest', behavior: 'instant' })
    if (id === 'home' || id === 'nav-keyboard' || id === 'caps-trigger' || id === 'paper-field') {
      if (screen === 'shop') window.scrollTo(0, 0)
    }
    if (focus) target.focus({ preventScroll: true })
    if (!noMotion() && id !== 'hero-product' && id !== 'paper-field' && id !== 'afterglow') {
      const before = target.classList.contains('target-ping')
      if (!before) {
        target.classList.add('target-ping')
        window.setTimeout(() => target.classList.remove('target-ping'), 1650)
      }
    }
  }

  function seedBasket() {
    setBasket(current => quantity(current) ? current : { eclipse: 1, caps: 1, rest: 1 })
  }
  function select(id: number, writeHash = true) {
    const effect = effects[id - 1]
    if (!effect) return
    const cell = ++visit.current
    setIndex(false)
    setInfo(null)
    setDrawer(false)
    setActive(id)
    setNotice(null)
    setScreen('shop')
    setDetail(id >= 13 && id <= 19 ? { variant: variants[2], origin: null } : null)
    if (id === 20 || id === 21 || id === 26) seedBasket()
    if (id === 21 || id === 26) setDrawer(true)
    if (writeHash) history.replaceState(null, '', '#effect-' + id)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (cell !== visit.current) return
      if (id === 20) window.scrollTo(0, 0)
      goTo(effect.target, id > 11)
    }))
  }

  useEffect(() => {
    const startId = getEffect()
    if (startId) select(startId, false)
    const read = () => {
      if (running.current) return
      const id = getEffect()
      if (id) select(id, false)
      else {
        setActive(undefined)
        setDrawer(false)
        setIndex(false)
        setDetail(null)
        setNotice(null)
        setInfo(null)
        setScreen(routeCheckout() ? 'checkout' : 'shop')
        const section = location.hash.slice(1)
        requestAnimationFrame(() => {
          if (section && section !== 'checkout') document.getElementById(section)?.scrollIntoView()
          else window.scrollTo(0, 0)
        })
      }
    }
    window.addEventListener('popstate', read)
    window.addEventListener('hashchange', read)
    return () => {
      window.removeEventListener('popstate', read)
      window.removeEventListener('hashchange', read)
    }
  }, [])

  function choose(variant: Variant, source?: Element) {
    setDetail({ variant, origin: source ? flightOrigin(source) : null })
  }
  function change(id: ProductId, delta: number | 'remove') {
    setBasket(current => {
      const count = delta === 'remove' ? 0 : Math.max(0, Math.min(12, (current[id] ?? 0) + delta))
      if ((current[id] ?? 0) === count) return current
      const next = { ...current }
      if (count) next[id] = count
      else delete next[id]
      return next
    })
  }
  function add(id: ProductId) {
    change(id, 1)
    window.clearTimeout(timer.current)
    setNotice({ id, key: ++noticeId.current })
    timer.current = window.setTimeout(() => setNotice(null), 4480)
  }
  function openDrawer() {
    setNotice(null)
    setDrawer(true)
  }
  function openIndex() {
    setNotice(null)
    setIndex(true)
  }
  function dismissCue() {
    setActive(undefined)
    if (getEffect()) history.replaceState(null, '', screen === 'shop' ? '#editions' : '#checkout')
  }
  function closeDetail() {
    setDetail(null)
    setNotice(null)
    if (active && active >= 13 && active <= 19) dismissCue()
  }
  function swap(destination: Route) {
    setDrawer(false)
    setDetail(null)
    setIndex(false)
    setNotice(null)
    setInfo(null)
    setScreen(destination)
    setActive(undefined)
    history.pushState(null, '', destination === 'checkout' ? '#checkout' : returnLocation.current)
    window.scrollTo(0, 0)
  }
  function finish(destination: Route) {
    setCurtain(null)
    requestAnimationFrame(() => {
      running.current = false
      const target = destination === 'checkout' ? document.getElementById('checkout-title') : document.querySelector<HTMLElement>('#home h1')
      target?.focus({ preventScroll: true })
    })
  }
  function navigate(destination: Route) {
    if (running.current) return
    if (destination === 'checkout' && !quantity(basket)) return
    if (destination === 'checkout') returnLocation.current = '#home'
    running.current = true
    if (noMotion()) {
      swap(destination)
      finish(destination)
    } else setCurtain(destination)
  }

  const cue = active ? <EffectCue key={active} id={active} index={openIndex} select={id => select(id)} close={dismissCue}/> : null
  const toast = notice ? <AddedToast key={notice.key} notice={notice} onOpen={openDrawer}/> : null
  const blocking = Boolean(detail) || drawer || index || info !== null || curtain !== null

  return <>
    <a className="skip-link" href={screen === 'shop' ? '#main-content' : '#checkout-title'} onClick={event => {
      event.preventDefault()
      goTo(screen === 'shop' ? 'main-content' : 'checkout-title')
    }}>跳到主要内容</a>
    {screen === 'shop' ? <>
      <Header bag={<BagButton basket={basket} id="shop-bag" onClick={openDrawer}/>} index={openIndex}/>
      <main id="main-content" tabIndex={-1}>
        <Hero choose={choose}/>
        <FeatureCards open={setInfo}/>
        <Afterglow choose={() => choose(variants[2])}/>
        <Editions choose={choose}/>
        <Support compare={() => setInfo('switches')}/>
      </main>
    </> : <Checkout basket={basket} onBack={() => navigate('shop')} onOpenBag={openDrawer} onOrder={() => setBasket({})}/>}
    <div className="demo-dock"><button type="button" aria-label="打开动效索引" onClick={openIndex}><MousePointer2 size={16}/> <span>动效观察室</span><b>26</b></button></div>
    {!blocking && cue}
    {!detail && !drawer && toast}
    {detail && <ProductDetails key={detail.variant.id + (detail.origin ? '-card' : '-direct')} variant={detail.variant} origin={detail.origin} onClose={closeDetail}
      bag={<><BagButton basket={basket} id="detail-bag" onClick={openDrawer}/>{!drawer && toast}</>}
      onAdd={() => add(detail.variant.id)} full={(basket[detail.variant.id] ?? 0) >= 12} saved={Boolean(favorites[detail.variant.id])}
      setSaved={() => setFavorites(current => ({ ...current, [detail.variant.id]: !current[detail.variant.id] }))}
      cue={!index && !drawer && !curtain ? cue ?? <button className="detail-index" type="button" onClick={openIndex}><BookOpen size={16}/> 动效索引</button> : null}/>}
    {drawer && <BasketDrawer basket={basket} onChange={change} onClose={() => setDrawer(false)} onCheckout={() => navigate('checkout')}
      onBrowse={() => { setDrawer(false); if (screen === 'checkout') navigate('shop'); else requestAnimationFrame(() => goTo('edition-cards')) }}
      cue={!index && !curtain && active !== undefined && active >= 20 ? cue : null}/>}
    {info !== null && <InfoDialog info={info} onClose={() => setInfo(null)} cue={active === 24 ? cue : null}/>}
    {index && <IndexPanel close={() => setIndex(false)} select={select} quiet={quiet} setQuiet={setQuiet} selected={active}/>}
    {curtain && <Curtain swap={() => flushSync(() => swap(curtain))} done={() => finish(curtain)}/>}
    <CustomCursor asleep={quiet || index || drawer || info !== null || curtain !== null}/>
  </>
}

createRoot(document.getElementById('root')!).render(<App/>)
