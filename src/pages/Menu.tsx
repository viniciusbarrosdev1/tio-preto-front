import { CalendarClock, Clock, MapPin, Megaphone, MessageCircle, Scissors, ShoppingBag } from 'lucide-react'
import { motion } from 'motion/react'
import { activeNotice } from '@/lib/api'
import { Appear, Gallery, LinkBtn, SectionTitle, Wordmark } from '@/components/ui'
import { durationLabel, moneyShort, waLink } from '@/lib/format'
import { useAppState } from '@/lib/store'
import type { MenuItem } from '@/lib/types'

const Instagram = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
)

function Row({ item, i }: { item: MenuItem; i: number }) {
  const Icon = item.kind === 'produto' ? ShoppingBag : Scissors
  return (
    <Appear i={i} className="flex items-center gap-4 py-4">
      {item.photoUrls.length > 0 ? (
        <Gallery photos={item.photoUrls} alt={item.name} className="h-18 w-18" />
      ) : (
        <div aria-hidden className="flex h-18 w-18 shrink-0 items-center justify-center rounded-xl border border-line bg-coal text-gold/40">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-2xl font-bold uppercase leading-tight">{item.name}</h3>
        {item.description && <p className="mt-0.5 text-sm leading-snug text-mute">{item.description}</p>}
        {item.kind === 'servico' && item.durationMinutes > 0 && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-mute">
            <Clock className="h-3.5 w-3.5" aria-hidden /> {durationLabel(item.durationMinutes)}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right font-display text-2xl font-bold leading-tight text-gold">
        {item.priceType === 'from' && (
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gold-dim">a partir de</div>
        )}
        {moneyShort(item.priceCents)}
      </div>
    </Appear>
  )
}

export default function Menu() {
  const { menu, settings } = useAppState()
  const visible = menu.filter((m) => m.visible)
  const servicos = visible.filter((m) => m.kind === 'servico')
  const produtos = visible.filter((m) => m.kind === 'produto')
  const notice = activeNotice(settings)

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-32">
      <header className="relative overflow-hidden border-b border-line px-5 pb-8 pt-10">
        <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-gold/20" />
        <div aria-hidden className="absolute -right-4 -top-4 h-44 w-44 rounded-full border border-gold/10" />
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Wordmark />
        </motion.div>
        <p className="mt-6 max-w-[17rem] text-base text-sand/80">
          Cabelo, barba e sobrancelha em {settings.city}.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-coal/70 px-3 py-1.5 text-xs text-mute">
          <CalendarClock className="h-3.5 w-3.5 text-gold" aria-hidden />
          Agenda aberta para as próximas {settings.horizonWeeks} semanas
        </p>
      </header>

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mt-5 flex gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm text-sand"
        >
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
          <div>
            <p className="font-display font-bold uppercase tracking-wide text-gold">Aviso de hoje</p>
            <p className="mt-0.5">{notice}</p>
          </div>
        </motion.div>
      )}

      <main className="px-5 pt-8">
        <SectionTitle>Serviços e valores</SectionTitle>
        {servicos.length === 0 ? (
          <p className="mt-4 text-mute">Cardápio em atualização. Volte em instantes.</p>
        ) : (
          <div className="divide-y divide-line">
            {servicos.map((it, i) => (
              <Row key={it.id} item={it} i={i} />
            ))}
          </div>
        )}

        {produtos.length > 0 && (
          <div className="mt-10">
            <SectionTitle>Produtos</SectionTitle>
            <div className="divide-y divide-line">
              {produtos.map((it, i) => (
                <Row key={it.id} item={it} i={i} />
              ))}
            </div>
          </div>
        )}

        <section className="mt-10 grid grid-cols-3 gap-3">
          <LinkBtn href={waLink(settings.whatsapp)} target="_blank" rel="noreferrer" className="!min-h-20 flex-col !gap-1 !px-2 !text-sm">
            <MessageCircle className="h-6 w-6" aria-hidden /> WhatsApp
          </LinkBtn>
          <LinkBtn href={settings.instagramUrl} target="_blank" rel="noreferrer" className="!min-h-20 flex-col !gap-1 !px-2 !text-sm">
            <Instagram className="h-6 w-6" aria-hidden /> Instagram
          </LinkBtn>
          <LinkBtn href={settings.mapsUrl} target="_blank" rel="noreferrer" className="!min-h-20 flex-col !gap-1 !px-2 !text-sm">
            <MapPin className="h-6 w-6" aria-hidden /> Como chegar
          </LinkBtn>
        </section>

        <footer className="mt-10 text-xs text-mute">
          <p className="font-display text-sm uppercase tracking-widest text-sand/70">{settings.businessName}</p>
          <p className="mt-1">{settings.city}</p>
        </footer>
      </main>

      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 px-5 pt-3 safe-bottom backdrop-blur">
        <div className="mx-auto max-w-md">
          <LinkBtn variant="gold" href="#/agendar" className="w-full">
            <CalendarClock className="h-5 w-5" aria-hidden /> Agendar horário
          </LinkBtn>
        </div>
      </div>
    </div>
  )
}
