import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, ChevronDown, ExternalLink, Layers3, Maximize2, Microchip, Radio } from 'lucide-react'
import { asset, features, questions, reference, variants, type Variant } from './catalog'
import { Layer } from './Layer'
import { Magnetic, LiveKeyboard, PointerCanvas, Spotlight } from './PointerEffects'
import { Tick } from './ProductDetails'
import { noMotion, play, point } from './motion'

export function Header({ bag, index }: { bag: ReactNode; index: () => void }) {
  const [menu, setMenu] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const mouseOpened = useRef(false)
  const time = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!menu) return
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !area.current?.contains(event.target)) setMenu(false) }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenu(false)
        trigger.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [menu])
  useEffect(() => () => window.clearTimeout(time.current), [])
  return <header className="topbar site-top">
    <a className="brand" href="#home" aria-label="KEYFORM 首页">KEYFORM<span>K75</span></a>
    <nav className="primary-nav" aria-label="商品导航">
      <a className="nav-item nav-hover" href="#home" id="nav-keyboard" data-cursor="button">键盘</a>
      <div className="caps-menu" ref={area}
        onPointerEnter={event => {
          if (event.pointerType !== 'mouse') return
          window.clearTimeout(time.current)
          mouseOpened.current = true
          setMenu(true)
        }}
        onPointerLeave={event => {
          if (event.pointerType !== 'mouse') return
          mouseOpened.current = false
          time.current = window.setTimeout(() => setMenu(false), 135)
        }}
        onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !mouseOpened.current) setMenu(false) }}>
        <button type="button" className="nav-item nav-hover" id="caps-trigger" ref={trigger} aria-expanded={menu} aria-controls="caps-pop"
          onClick={event => {
            if (mouseOpened.current && event.detail) { mouseOpened.current = false; setMenu(true) }
            else setMenu(value => !value)
          }} onKeyDown={event => {
            if (event.key !== 'ArrowDown') return
            event.preventDefault()
            setMenu(true)
            requestAnimationFrame(() => area.current?.querySelector<HTMLElement>('.caps-pop a')?.focus())
          }}>键帽 <ChevronDown size={13}/></button>
        <div id="caps-pop" className="caps-pop" data-open={menu} inert={!menu}>
          <b>键帽配色</b>
          {variants.map((variant, index) => <a key={variant.id} href={'#edition-' + variant.id} onClick={() => setMenu(false)}
            style={{ '--item': index } as React.CSSProperties}>
            <span className="menu-swatches" aria-hidden="true"><i style={{ background: variant.key }}/><i style={{ background: variant.darkKey }}/><i style={{ background: variant.accent }}/></span>
            <span>{variant.title}<small>{variant.english}</small></span><ArrowUpRight size={14}/>
          </a>)}
        </div>
      </div>
      <a className="nav-item nav-hover" href="#support" data-cursor="button">支持</a>
    </nav>
    <div className="top-actions"><button className="catalog-link" type="button" onClick={index}><span aria-hidden="true">✳</span> <span>动效索引</span></button>{bag}</div>
  </header>
}

function TravelTip() {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const show = pinned || hovered
  return <span className="term-tip" onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }}
    onPointerLeave={() => setHovered(false)}>
    <button type="button" id="travel-tip" aria-describedby="tip-travel" aria-expanded={show} onFocus={event => {
      if (event.currentTarget.matches(':focus-visible')) setHovered(true)
    }} onBlur={() => { setPinned(false); setHovered(false) }}
      onClick={() => setPinned(value => !value)}
      onKeyDown={event => {
        if (event.key !== 'Escape') return
        setPinned(false)
        setHovered(false)
      }}>mm 键程</button>
    <span className="tooltip" role="tooltip" id="tip-travel" data-open={show}><b>键程</b>键帽从静止位置按到底所经过的距离。</span>
  </span>
}

export function Hero({ choose }: { choose: (variant: Variant, source?: Element) => void }) {
  return <section id="home" className="hero">
    <div className="hero-field" id="paper-field" tabIndex={-1}>
      <PointerCanvas kind="dots"/>
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-rule"/> K75 / 紧凑机械键盘</p>
          <h1 tabIndex={-1}>每一键，<br/>恰到好处<span>.</span></h1>
          <p className="hero-intro">少占一点桌面，多留一点手感。<br/>带旋钮的 75% 铝壳机械键盘。</p>
          <div className="hero-actions">
            <Magnetic onClick={() => choose(variants[0])}/>
            <a className="rolling-link" href="#specs" id="view-specs">
              <span><span>查看参数</span><span aria-hidden="true">查看参数</span></span><ArrowRight size={16}/>
            </a>
          </div>
        </div>
        <div className="hero-art">
          <span className="render-word" aria-hidden="true">75</span>
          <LiveKeyboard variant={variants[0]}/>
          <span className="hero-edition"><i/> 陶橘 / APRICOT</span>
        </div>
      </div>
    </div>
    <div id="specs" className="spec-strip">
      <div><strong>75<span>%</span></strong><small>紧凑布局</small></div>
      <div><strong>3.6</strong><TravelTip/></div>
      <div><strong>3</strong><small>种连接</small></div>
      <div><strong>铝</strong><small>一体外壳</small></div>
    </div>
  </section>
}

export function FeatureCards({ open }: { open: (index: number) => void }) {
  const icons = [Layers3, Microchip, Radio]
  function setHover(event: React.PointerEvent<HTMLButtonElement>, entering: boolean) {
    const card = event.currentTarget
    const { x, y } = point(event, card)
    if (event.pointerType === 'mouse') {
      card.style.setProperty('--reveal-x', x + 'px')
      card.style.setProperty('--reveal-y', y + 'px')
      card.dataset.inside = String(entering)
    }
    if (!entering) {
      card.style.setProperty('--tilt-x', '0deg')
      card.style.setProperty('--tilt-y', '0deg')
    }
  }
  function tilt(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse' || noMotion()) return
    const { x, y, width, height } = point(event, event.currentTarget)
    const style = event.currentTarget.style
    style.setProperty('--light-x', x + 'px')
    style.setProperty('--light-y', y + 'px')
    style.setProperty('--tilt-x', (.5 - y / height) * 23 + 'deg')
    style.setProperty('--tilt-y', (x / width - .5) * 25 + 'deg')
  }
  return <section className="feature-section" id="features">
    <div className="section-wrap">
      <p className="eyebrow">结构与手感</p>
      <div className="section-heading"><h2>日常用得上的细节<span>.</span></h2></div>
      <div className="feature-cards" id="feature-cards" tabIndex={-1}>
        {features.map((feature, index) => {
          const Icon = icons[index]
          return <div className="feature-perspective" key={feature.title}>
            <button type="button" data-cursor="feature" className="feature-card"
              onPointerEnter={event => setHover(event, true)} onPointerLeave={event => setHover(event, false)} onPointerMove={tilt} onClick={event => {
                event.currentTarget.focus()
                open(index)
              }}>
              <span className="feature-panel">
                <span className="feature-color"/><span className="feature-shine"/>
                <span className="feature-ordinal">{String(index + 1).padStart(2, '0')}</span>
                <span className="feature-icon"><Icon strokeWidth={1.6} size={31}/></span>
                <strong>{feature.title}</strong><span className="feature-description">{feature.intro}</span>
                <span className="feature-more">了解细节 <ArrowRight size={15}/></span>
              </span>
            </button>
          </div>
        })}
      </div>
    </div>
  </section>
}

export function Editions({ choose }: { choose: (variant: Variant, source: Element) => void }) {
  return <section className="editions dark-section" id="editions">
    <div className="section-wrap">
      <p className="eyebrow">三种配色</p>
      <div className="section-heading"><h2>选你的 K75<span>.</span></h2><p>点卡片打开详情和四个视角。</p></div>
      <div className="edition-cards" id="edition-cards" tabIndex={-1}>
        {variants.map(variant => <Spotlight key={variant.id}>
          <button type="button" className="edition-card" id={'edition-' + variant.id} data-edition={variant.id}
            style={{ '--card-paper': variant.paper, '--card-accent': variant.accent } as React.CSSProperties}
            onClick={event => { event.currentTarget.focus(); choose(variant, event.currentTarget) }}>
            <span className="edition-heading" data-shared-name>{variant.title}<span>{variant.english}</span></span>
            <img src={asset(variant.id)} width={1020} height={680} alt={variant.title + ' K75 机械键盘'} data-shared-image loading="lazy"/>
            <span className="edition-bottom"><strong>¥{variant.price}</strong><span><Maximize2 size={15}/> 查看详情</span></span>
          </button>
        </Spotlight>)}
      </div>
    </div>
  </section>
}

export function Afterglow({ choose }: { choose: () => void }) {
  return <section id="afterglow" className="afterglow" tabIndex={-1}>
    <PointerCanvas kind="trail"/>
    <div className="afterglow-inner">
      <div><p className="eyebrow">K75 / ECLIPSE</p><h2>夜影<span>.</span></h2><p>划过暗色区域，光会沿着指针走过的路径拖出尾迹。</p>
        <button type="button" className="text-link" onClick={choose}>查看夜影详情 <ArrowUpRight size={16}/></button></div>
      <img src={asset('eclipse')} width={1020} height={680} alt="夜影 K75，带荧光黄旋钮与方向键" loading="lazy"/>
    </div>
    <span className="trail-caption" aria-hidden="true">CURSOR TRAIL / 移动鼠标</span>
  </section>
}

function Accordion({ compare }: { compare: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  return <section className="support-grid section-wrap" id="support">
    <div><p className="eyebrow">常见问题</p><h2>选之前，<br/><em>问清楚。</em></h2><button type="button" className="text-link" id="switch-compare" onClick={event => { event.currentTarget.focus(); compare() }}>比较轴体 <ArrowUpRight size={16}/></button></div>
    <div className="faq" id="faq" tabIndex={-1}>
      {questions.map(([question, answer], index) => <section key={question} className="faq-item" data-expanded={expanded === index}>
        <h3><button type="button" aria-controls={'answer-' + index} aria-expanded={expanded === index}
          onClick={() => setExpanded(expanded === index ? null : index)}>{question}<span className="faq-mark" aria-hidden="true"><i/><i/></span></button></h3>
        <div className="faq-answer" id={'answer-' + index} inert={expanded !== index}><div><p>{answer}</p></div></div>
      </section>)}
    </div>
  </section>
}

type Note = { title: string; type: string; text: string; initial: string }
const initialNotes: Note[] = [
  { title: '先看布局', type: '导览笔记 / 布局', text: '右侧仍保留方向键，上方也还有功能键。对比俯视图更容易看清布局。', initial: '布' },
  { title: '颜色随光线变化', type: '导览笔记 / 配色', text: '同一种配色在浅色与暗色背景下的观感不同，可以切换三个版本对照。', initial: '色' },
  { title: '录音与实际环境', type: '导览笔记 / 手感', text: '用试听按钮观察形变，同时听示例声的起落。真实声响还受桌面和轴体影响。', initial: '音' },
]
function ReviewCard({ note }: { note: Note }) {
  return <article className="note-card"><span className="note-mark" aria-hidden="true">✦</span><h3>{note.title}</h3><p>{note.text}</p><small><i>{note.initial}</i> {note.type}</small></article>
}
function Reviews() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'loaded' | 'failed'>('idle')
  const [notes, setNotes] = useState<Note[]>([])
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function load() {
    if (phase === 'loading') return
    const controller = new AbortController()
    request.current = controller
    setNotes([])
    setPhase('loading')
    try {
      const [response] = await Promise.all([
        fetch(import.meta.env.BASE_URL + 'notes.json', { signal: controller.signal }),
        new Promise(resolve => setTimeout(resolve, noMotion() ? 120 : 1550)),
      ])
      if (!response.ok) throw new Error('Preview notes could not load')
      const records: unknown = await response.json()
      if (!Array.isArray(records) || !records.length) throw new Error('Missing preview notes')
      if (!controller.signal.aborted) {
        setNotes(records as Note[])
        setPhase('loaded')
      }
    } catch {
      if (!controller.signal.aborted) setPhase('failed')
    }
  }
  return <section className="review-section section-wrap">
    <div className="section-heading"><div><p className="eyebrow">体验笔记</p><h2>值得仔细看一眼<span>.</span></h2></div>
      <button type="button" className="pill outline" id="load-reviews" disabled={phase === 'loading'} onClick={() => void load()}>
        {phase === 'loading' ? '加载中…' : phase === 'loaded' ? '再看一次加载' : phase === 'failed' ? '重试加载' : '加载更多'}</button>
    </div>
    <div className="note-grid" aria-busy={phase === 'loading'}>
      {initialNotes.map(note => <ReviewCard key={note.title} note={note}/>)}
      {phase === 'loading' && Array.from({ length: 3 }, (_, index) => <article key={index} aria-hidden="true" className="note-card skeleton-card"><i/><i/><i/><i/></article>)}
      {notes.map(note => <ReviewCard key={note.title} note={note}/>)}
    </div>
    {phase === 'failed' && <p role="status">笔记暂时未能加载。</p>}
    {phase === 'loaded' && <span className="sr-only" role="status">已加载三条体验笔记。</span>}
  </section>
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'error' | 'done'>('idle')
  const field = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const shaking = useRef<Animation | null>(null)
  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    shaking.current?.cancel()
    if (!valid) {
      setStatus('error')
      input.current!.focus()
      if (!noMotion()) shaking.current = play(field.current!,
        [0, -12, 10, -7, 5, -3, 0].map(offset => ({ transform: `translateX(${offset}px)` })), 425, 'linear')
      return
    }
    setStatus('done')
  }
  return <footer className="shop-footer">
    <div className="section-wrap footer-inner">
      <form noValidate id="newsletter" tabIndex={-1} onSubmit={subscribe}>
        <p className="eyebrow">订阅演示</p><h2>下一款配色，<br/>一起看看。</h2>
        <div ref={field} className="newsletter-field" data-validation={status}>
          <input ref={input} type="email" inputMode="email" aria-label="邮箱地址" aria-invalid={status === 'error'} aria-describedby="subscribe-result"
            value={email} placeholder="demo@example.com" onChange={event => { setEmail(event.target.value); if (status === 'done') setStatus('idle') }}/>
          <button type="submit" className="pill lime" disabled={status === 'done'}>{status === 'done' ? <><Tick/> 已订阅</> : '订阅'}</button>
        </div>
        <p role={status === 'error' ? 'alert' : 'status'} id="subscribe-result" data-validation={status}>{status === 'error' ? '邮箱格式不完整，请检查地址。' :
          status === 'done' ? '已完成示例订阅。' : '可填写示例邮箱体验反馈。'}</p>
      </form>
      <div className="footer-links"><a href="#home">回到顶部</a><a href={reference} target="_blank" rel="noreferrer">参考原视频 <ExternalLink size={14}/></a></div>
      <div className="footer-brand" aria-hidden="true">KEYFORM<span>75</span></div>
      <p className="legal">动效观察室 · 原创键盘概念演示</p>
    </div>
  </footer>
}

export function Support({ compare }: { compare: () => void }) {
  return <div className="support dark-section"><Accordion compare={compare}/><Reviews/><Newsletter/></div>
}

export function InfoDialog({ info, onClose, cue }: { info: 'switches' | number; onClose: () => void; cue: ReactNode }) {
  const title = info === 'switches' ? '三种轴体怎么选' : features[info].title
  return <Layer open kind="modal" label={title} onClose={onClose}>
    <div className="info-body"><p className="eyebrow">{info === 'switches' ? '轴体对比' : '结构细节'}</p><h2>{title}<span>.</span></h2>
      {info === 'switches' ? <><table><thead><tr><th scope="col">手感项</th><th scope="col">红轴</th><th scope="col">茶轴</th><th scope="col">白轴</th></tr></thead>
        <tbody><tr><th scope="row">反馈</th><td>线性</td><td>轻段落</td><td>清晰段落</td></tr><tr><th scope="row">声响</th><td>较轻</td><td>适中</td><td>较清脆</td></tr><tr><th scope="row">适合</th><td>连续输入</td><td>日常通用</td><td>重视反馈</td></tr></tbody></table>
        <p>手感是示例描述，可在详情中试听按键声。</p></> : <p>{features[info].detail}</p>}
      {cue}
    </div>
  </Layer>
}
