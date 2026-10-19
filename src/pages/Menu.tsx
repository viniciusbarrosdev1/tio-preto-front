import { CalendarClock, MapPin, MessageCircle, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Wordmark, LinkBtn } from '@/components/ui'
import { priceLabel, waLink } from '@/lib/format'
import { useAppState } from '@/lib/store'

const Instagram = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
)

export default function Menu() {
  const { menu, settings } = useAppState()
  const items = menu.filter((m) => m.visible)

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="relative overflow-hidden border-b border-line px-5 pb-8 pt-10">
        <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-gold/20" />
        <div aria-hidden className="absolute -right-4 -top-4 h-44 w-44 rounded-full border border-gold/10" />
        <Wordmark />
        <p className="mt-6 max-w-[16rem] text-base text-sand/80">
          Cabelo, barba e sobrancelha em {settings.city}. Veja os valores e peça seu horário.
        </p>
      </header>

      {settings.notice && (
        <div className="mx-5 mt-5 flex gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-sand">
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
          <p>{settings.notice}</p>
        </div>
      )}

      <main className="px-5 pt-8">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-gold">Serviços e valores</h2>
        {items.length === 0 ? (
          <p className="mt-6 text-mute">Cardápio em atualização. Volte em instantes.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-4 py-5">
                {it.photoUrl && (
                  <img src={it.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-2xl font-bold uppercase leading-tight">{it.name}</h3>
                  {it.description && <p className="mt-1 text-sm text-mute">{it.description}</p>}
                </div>
                <div className="shrink-0 text-right font-display text-2xl font-bold leading-tight text-gold">
                  {it.priceType === 'from' && (
                    <div className="text-xs font-semibold uppercase tracking-widest text-gold-dim">a partir de</div>
                  )}
                  <span className="sr-only">{priceLabel(it.priceCents, it.priceType)}</span>
                  <span aria-hidden>
                    {(it.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: it.priceCents % 100 ? 2 : 0 })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-8 grid grid-cols-3 gap-3">
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

        <footer className="mt-10 flex items-center justify-between text-xs text-mute">
          <span>{settings.businessName}</span>
          <Link to="/admin" className="underline-offset-2 hover:text-gold hover:underline">Área do dono</Link>
        </footer>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <LinkBtn variant="gold" href="#/agendar" className="w-full">
            <CalendarClock className="h-5 w-5" aria-hidden /> Pedir horário
          </LinkBtn>
        </div>
      </div>
    </div>
  )
}
