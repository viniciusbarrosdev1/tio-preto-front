import { Eye, EyeOff, ImagePlus, Pencil, Plus, Scissors, ShoppingBag, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import {
  Appear,
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Gallery,
  Input,
  Modal,
  MoneyInput,
  Segmented,
  Select,
  Textarea,
  cx,
  useToast,
} from '@/components/ui'
import { api } from '@/lib/api'
import { centsFromMask, centsToMask, durationLabel, priceLabel } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, GROUP_LABEL, type ItemKind, type MenuItem, type ServiceGroup } from '@/lib/types'

type Draft = {
  id?: string
  kind: ItemKind
  group: ServiceGroup
  name: string
  description: string
  price: string
  priceType: 'fixed' | 'from'
  duration: string
  photoUrls: string[]
}

const empty = (kind: ItemKind): Draft => ({
  kind,
  group: 'cabelo',
  name: '',
  description: '',
  price: '',
  priceType: 'fixed',
  duration: '30',
  photoUrls: [],
})

const toDraft = (m: MenuItem): Draft => ({
  id: m.id,
  kind: m.kind,
  group: m.group ?? 'outro',
  name: m.name,
  description: m.description ?? '',
  price: centsToMask(m.priceCents),
  priceType: m.priceType,
  duration: String(m.durationMinutes || 30),
  photoUrls: m.photoUrls ?? [],
})

/** Reduz a foto antes de guardar: o protótipo salva tudo no localStorage. */
const readFile = (f: File) =>
  new Promise<string>((res) => {
    const img = new Image()
    const url = URL.createObjectURL(f)
    img.onload = () => {
      const max = 600
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      res(c.toDataURL('image/jpeg', 0.78))
    }
    img.src = url
  })

export default function Cardapio() {
  const { menu, settings } = useAppState()
  const toast = useToast()
  const [kind, setKind] = useState<ItemKind>('servico')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [err, setErr] = useState('')

  const list = menu.filter((m) => m.kind === kind)

  /** Quanto o serviço ocupa sozinho, já no tamanho do horário. */
  const aloneMinutes = (d: number) =>
    Math.min(
      settings.maxServiceMinutes,
      Math.ceil(Math.max(settings.slotMinutes, d) / settings.slotMinutes) * settings.slotMinutes,
    )

  function save() {
    if (!draft) return
    try {
      api.saveItem({
        id: draft.id,
        kind: draft.kind,
        group: draft.kind === 'servico' ? draft.group : undefined,
        name: draft.name,
        description: draft.description,
        priceCents: centsFromMask(draft.price),
        priceType: draft.priceType,
        durationMinutes: draft.kind === 'produto' ? 0 : Math.max(5, parseInt(draft.duration, 10) || 30),
        visible: draft.id ? (menu.find((m) => m.id === draft.id)?.visible ?? true) : true,
        photoUrls: draft.photoUrls,
      })
      toast(draft.id ? 'Item atualizado.' : 'Item criado.')
      setDraft(null)
      setErr('')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Erro ao salvar.')
    }
  }

  const addPhotos = async (files: FileList) => {
    const urls = await Promise.all([...files].slice(0, 6).map(readFile))
    setDraft((d) => (d ? { ...d, photoUrls: [...d.photoUrls, ...urls].slice(0, 8) } : d))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase">Cardápio</h1>
        <Btn
          size="sm"
          onClick={() => {
            setDraft(empty(kind))
            setErr('')
          }}
        >
          <Plus className="h-4 w-4" aria-hidden /> Novo
        </Btn>
      </div>

      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'servico', label: 'Serviços' },
          { value: 'produto', label: 'Produtos' },
        ]}
      />

      <p className="text-sm text-mute">
        {kind === 'servico'
          ? `Serviço ocupa horário. Atendimento no máximo ${durationLabel(settings.maxServiceMinutes)}, em blocos de ${settings.slotMinutes} min.`
          : 'Produto é só venda no cardápio: não ocupa horário na agenda.'}
      </p>

      <div className="space-y-3">
        {list.length === 0 && <EmptyState>Nada cadastrado aqui ainda.</EmptyState>}
        {list.map((m, i) => (
          <Appear key={m.id} i={i}>
            <Card className={cx('flex items-center gap-3', !m.visible && 'opacity-60')}>
              {m.photoUrls.length > 0 ? (
                <Gallery photos={m.photoUrls} alt={m.name} className="h-14 w-14" />
              ) : (
                <div aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-coal text-gold/40">
                  {m.kind === 'produto' ? <ShoppingBag className="h-5 w-5" /> : <Scissors className="h-5 w-5" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-bold uppercase leading-tight">{m.name}</p>
                <p className="text-sm text-gold">
                  {priceLabel(m.priceCents, m.priceType)}
                  {m.kind === 'servico' && <span className="text-mute"> · {durationLabel(m.durationMinutes)}</span>}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {m.kind === 'servico' && m.group && <Badge>{GROUP_LABEL[m.group]}</Badge>}
                  {m.kind === 'servico' && m.durationMinutes < settings.slotMinutes && <Badge tone="gold">encaixe</Badge>}
                  {!m.visible && <Badge tone="danger">Oculto</Badge>}
                  {m.photoUrls.length > 1 && <Badge>{m.photoUrls.length} fotos</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Btn size="sm" variant="quiet" aria-label={m.visible ? 'Ocultar' : 'Mostrar'} onClick={() => api.toggleItem(m.id)}>
                  {m.visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </Btn>
                <Btn
                  size="sm"
                  variant="quiet"
                  aria-label="Editar"
                  onClick={() => {
                    setDraft(toDraft(m))
                    setErr('')
                  }}
                >
                  <Pencil className="h-5 w-5" />
                </Btn>
                <Btn
                  size="sm"
                  variant="quiet"
                  aria-label="Remover"
                  onClick={() => {
                    if (confirm(`Remover "${m.name}"?`)) {
                      api.deleteItem(m.id)
                      toast('Item removido.')
                    }
                  }}
                >
                  <Trash2 className="h-5 w-5" />
                </Btn>
              </div>
            </Card>
          </Appear>
        ))}
      </div>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Editar item' : draft?.kind === 'produto' ? 'Novo produto' : 'Novo serviço'}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Nome">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Cabelo" />
            </Field>
            <Field label="Descrição (opcional)">
              <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço">
                <MoneyInput value={draft.price} onValue={(price) => setDraft({ ...draft, price })} />
              </Field>
              <Field label="Tipo de preço">
                <Select value={draft.priceType} onChange={(e) => setDraft({ ...draft, priceType: e.target.value as 'fixed' | 'from' })}>
                  <option value="fixed">Valor fixo</option>
                  <option value="from">A partir de</option>
                </Select>
              </Field>
            </div>
            {draft.kind === 'servico' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo de serviço" hint="O cliente escolhe só um de cada tipo.">
                  <Select value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value as ServiceGroup })}>
                    {(Object.keys(GROUP_LABEL) as ServiceGroup[]).map((g) => (
                      <option key={g} value={g}>
                        {GROUP_LABEL[g]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Duração (min)"
                  hint={
                    parseInt(draft.duration, 10) < settings.slotMinutes
                      ? 'Menor que um horário: encaixa junto de outro serviço.'
                      : 'Soma no total do atendimento.'
                  }
                >
                  <Input
                    inputMode="numeric"
                    value={draft.duration}
                    onChange={(e) => setDraft({ ...draft, duration: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  />
                </Field>
              </div>
            )}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-mute">Fotos (o cliente toca para ver a próxima)</span>
              <div className="flex flex-wrap gap-2">
                {draft.photoUrls.map((u, i) => (
                  <div key={u.slice(-24) + i} className="relative">
                    <img src={u} alt="" className="h-20 w-20 rounded-xl border border-line object-cover" />
                    <button
                      type="button"
                      aria-label="Remover foto"
                      onClick={() => setDraft({ ...draft, photoUrls: draft.photoUrls.filter((_, j) => j !== i) })}
                      className="absolute -right-1.5 -top-1.5 cursor-pointer rounded-full border border-line bg-coal p-1 text-mute hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-mute hover:border-gold hover:text-gold">
                  <ImagePlus className="h-5 w-5" aria-hidden />
                  Adicionar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={async (e) => {
                      if (e.target.files?.length) await addPhotos(e.target.files)
                    }}
                  />
                </label>
              </div>
            </div>
            {draft.kind === 'servico' && draft.duration && (
              <p className="text-xs text-mute">
                Sozinho, esse serviço ocupa {durationLabel(aloneMinutes(parseInt(draft.duration, 10) || 0))} na agenda.
              </p>
            )}
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
            <Btn className="w-full" onClick={save}>
              Salvar
            </Btn>
          </div>
        )}
      </Modal>
    </div>
  )
}
