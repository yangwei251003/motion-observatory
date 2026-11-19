import { useState } from 'react'
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, MousePointer2, Search, X } from 'lucide-react'
import { chapters, effects, reference } from './catalog'
import { Layer } from './Layer'

export function IndexPanel({ close, select, quiet, setQuiet, selected }: {
  close: () => void; select: (id: number) => void; quiet: boolean; setQuiet: (value: boolean) => void; selected?: number
}) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const available = effects.filter(item => [item.title, item.english, String(item.id)].some(text => text.toLowerCase().includes(term)))
  return <Layer open kind="index" label="26 项动效索引" onClose={close}>
    <header className="index-heading"><p className="eyebrow"><MousePointer2 size={15}/> 动效观察室</p><h2>动效索引<span>.</span></h2><p>选一项，页面会到对应的操作位置。</p></header>
    <div className="index-tools"><label><Search size={17}/><input data-stock-cursor placeholder="搜名称或编号" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <button type="button" className="quiet-toggle" aria-pressed={quiet} onClick={() => setQuiet(!quiet)}>{quiet ? '已减少动画' : '减少动画'}</button>
    </div>
    <div className="index-grid">
      {chapters.map(group => {
        const items = available.filter(item => item.id >= group.first && item.id <= group.last)
        return items.length > 0 && <section key={group.title}>
          <h3>{group.title}</h3>
          {items.map(effect => <button type="button" data-effect={effect.id} key={effect.id} aria-current={effect.id === selected ? true : undefined}
            onClick={() => select(effect.id)}>
            <span>{String(effect.id).padStart(2, '0')}</span><span><b>{effect.title}</b><small>{effect.english}</small></span><ArrowUpRight size={15}/>
          </button>)}
        </section>
      })}
      {available.length === 0 && <p>没有找到对应的动效。</p>}
    </div>
    <footer className="index-footer"><a href={reference} target="_blank" rel="noreferrer">原视频 · 泊舟的AI思考 <ExternalLink size={14}/></a></footer>
  </Layer>
}

export function EffectCue({ id, index, select, close }: { id: number; index: () => void; select: (id: number) => void; close: () => void }) {
  const effect = effects[id - 1]
  const [copied, setCopied] = useState(false)
  async function copy() {
    const value = effect.title + '（' + effect.english + '）。' + effect.brief
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      const input = document.createElement('textarea')
      input.className = 'cue-copy-field'
      input.value = value
      input.setAttribute('readonly', '')
      input.setAttribute('aria-label', '动效描述')
      const socket = document.querySelector('.effect-cue')
      socket?.querySelector('.cue-copy-field')?.remove()
      socket?.append(input)
      input.focus()
      input.select()
    }
  }
  return <aside className="effect-cue" data-cue={id} aria-label="动效说明">
    <div><button type="button" className="cue-index" onClick={index} aria-label="打开动效索引">{String(id).padStart(2, '0')} / 26</button>
      <span className="cue-nav"><button type="button" aria-label="上一项动效" disabled={id === 1} className="cue-close" onClick={() => select(id - 1)}><ChevronLeft size={17}/></button>
        <button type="button" aria-label="下一项动效" disabled={id === effects.length} className="cue-close" onClick={() => select(id + 1)}><ChevronRight size={17}/></button>
        <button type="button" className="cue-close" aria-label="关闭提示" onClick={close}><X size={16}/></button></span></div>
    <h2>{effect.title}</h2><p>{effect.instruction}</p>
    <footer><a href={reference} target="_blank" rel="noreferrer" title="打开原视频">原片 {effect.time} <ExternalLink size={12}/></a>
      <button className="text-link" type="button" onClick={() => void copy()}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? '已复制' : '复制描述'}</button></footer>
  </aside>
}
