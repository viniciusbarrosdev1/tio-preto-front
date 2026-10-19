import { Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Btn, Card, Field, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { priceLabel } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, type MenuItem } from '@/lib/types'

type Draft = { id?: string; name: string; description: string; price: string; priceType: 'fixed' | 'from'; duration: string; photoUrl: string | null }
const empty: Draft = { name: '', description: '', price: '', priceType: 'fixed', duration: '60', photoUrl: null }

const toDraft = (m: MenuItem): Draft => ({
  id: m.id, name: m.name, description: m.description ?? '', price: (m.priceCents / 100).toFixed(2).replace('.', ','),
  priceType: m.priceType, duration: String(m.durationMinutes), photoUrl: m.photoUrl ?? null,
})

const readFile = (f: File) =>
  new Promise<string>((res) => {
    const img = new Image()
    const url = URL.createObjectURL(f)
    img.onload = () => {
      const max = 400
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      res(c.toDataURL('image/jpeg', 0.8))
    }
    img.src = url
  })

export default function Cardapio() {
  const { menu } = useAppState()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [err, setErr] = useState('')

  function save() {
    if (!draft) return
    const cents = Math.round(parseFloat(draft.price.replace(/\./g, '').replace(',', '.')) * 100)
    try {
      api.saveItem({
        id: draft.id,
        name: draft.name,
        description: draft.description,
        priceCents: cents,
        priceType: draft.priceType,
        durationMinutes: Math.max(15, parseInt(draft.duration, 10) || 60),
        visible: draft.id ? menu.find((m) => m.id === draft.id)?.visible ?? true : true,
        photoUrl: draft.photoUrl,
      })
      toast('Item salvo.')
      setDraft(null)
      setErr('')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase">Cardápio</h1>
        <Btn size="sm" onClick={() => { setDraft(empty); setErr('') }}><Plus className="h-4 w-4" aria-hidden /> Novo item</Btn>
      </div>
      <div className="space-y-3">
        {menu.map((m) => (
          <Card key={m.id} className={`flex items-center gap-3 ${m.visible ? '' : 'opacity-60'}`}>
            {m.photoUrl && <img src={m.photoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-bold uppercase">{m.name}</p>
              <p className="text-sm text-gold">{priceLabel(m.priceCents, m.priceType)} <span className="text-mute">· {m.durationMinutes} min</span></p>
              {!m.visible && <Badge>Oculto</Badge>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Btn size="sm" variant="quiet" aria-label={m.visible ? 'Ocultar' : 'Mostrar'} onClick={() => api.toggleItem(m.id)}>
                {m.visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Btn>
              <Btn size="sm" variant="quiet" aria-label="Editar" onClick={() => { setDraft(toDraft(m)); setErr('') }}><Pencil className="h-5 w-5" /></Btn>
              <Btn size="sm" variant="quiet" aria-label="Remover" onClick={() => { if (confirm(`Remover "${m.name}"?`)) { api.deleteItem(m.id); toast('Item removido.') } }}><Trash2 className="h-5 w-5" /></Btn>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Editar item' : 'Novo item'}>
        {draft && (
          <div className="space-y-4">
            <Field label="Nome"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Descrição (opcional)"><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$)"><Input inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="50,00" /></Field>
              <Field label="Tipo">
                <Select value={draft.priceType} onChange={(e) => setDraft({ ...draft, priceType: e.target.value as 'fixed' | 'from' })}>
                  <option value="fixed">Valor fixo</option>
                  <option value="from">A partir de</option>
                </Select>
              </Field>
            </div>
            <Field label="Duração (minutos)" hint="Usada para calcular os horários da agenda.">
              <Input inputMode="numeric" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} />
            </Field>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-mute">Foto (opcional)</span>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line px-3.5 text-mute hover:border-gold">
                <ImagePlus className="h-5 w-5" aria-hidden />
                {draft.photoUrl ? 'Trocar foto' : 'Escolher foto'}
                <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setDraft({ ...draft, photoUrl: await readFile(f) }) }} />
              </label>
              {draft.photoUrl && <img src={draft.photoUrl} alt="Prévia" className="mt-3 h-24 rounded-lg object-cover" />}
            </div>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
            <Btn className="w-full" onClick={save}>Salvar</Btn>
          </div>
        )}
      </Modal>
    </div>
  )
}
