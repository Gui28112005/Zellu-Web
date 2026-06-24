import { BookOpen, CheckCircle2, CreditCard, FileText, Lock, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageTransition } from '@/components/layout/PageTransition'

const ebooks = [
  {
    title: 'Carro Sempre Novo',
    subtitle: 'Cuidados simples para conservar melhor seu veículo no dia a dia.',
    tag: 'Conservação',
    size: '1,1 MB',
    accent: '#4f8df7',
  },
  {
    title: 'Dona da Oficina',
    subtitle: 'Um guia prático para entender manutenção sem depender de achismo.',
    tag: 'Manutenção',
    size: '5,3 MB',
    accent: '#f59e0b',
  },
  {
    title: 'Independência na Estrada',
    subtitle: 'Mais confiança para lidar com imprevistos e decisões no caminho.',
    tag: 'Estrada',
    size: '2,5 MB',
    accent: '#22c55e',
  },
  {
    title: 'Manual Tático de Sobrevivência Automotiva',
    subtitle: 'Checklist esperto para não ser pego de surpresa com o carro.',
    tag: 'Checklist',
    size: '4,8 MB',
    accent: '#8b5cf6',
  },
]

export default function BibliotecaScreen() {
  function handleBuy() {
    toast('Pagamento dos e-books ainda precisa ser conectado ao Mercado Pago.')
  }

  return (
    <PageTransition className="min-h-full bg-[#070c14] text-[#f0f4ff]">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-10">
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#1e2d44] bg-[#131e33] p-6 shadow-xl shadow-black/20">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#4f8df7]/20 blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-[#60a5fa]/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-[#4f8df7]/30 bg-[#4f8df7]/15">
              <BookOpen size={28} className="text-[#60a5fa]" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#70a7ff]">
              Zellu Biblioteca
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Pacote com 4 e-books automotivos
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#aeb8ca]">
              Conteúdos rápidos e práticos para manutenção, conservação e segurança. Um kit direto ao ponto pra cuidar melhor do veículo sem cair no papo torto da oficina.
            </p>

            <div className="mt-6 overflow-hidden rounded-3xl border border-[#4f8df7]/25 bg-gradient-to-br from-[#1a2a46] to-[#111b30] p-5 shadow-lg shadow-black/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#70a7ff]">Pacote completo</p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-4xl font-semibold tracking-tight text-white">R$ 19,90</span>
                    <span className="text-sm text-[#aeb8ca]">pagamento único</span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-sm text-[#d7e4f7]">
                    <CheckCircle2 size={16} className="text-green-400" />
                    Libera os 4 e-books da biblioteca
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBuy}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] px-5 text-sm font-bold text-white shadow-lg shadow-[#4f8df7]/25 active:scale-[0.98] sm:w-auto sm:min-w-[180px]"
                >
                  <CreditCard size={18} />
                  Comprar pacote
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {ebooks.map((ebook) => (
            <article
              key={ebook.title}
              className="group relative flex min-h-[230px] flex-col overflow-hidden rounded-3xl border border-[#1e2d44] bg-[#131e33] p-5"
            >
              <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-[#aeb8ca]">
                <Lock size={16} />
              </div>

              <div className="mb-4 flex items-start justify-between gap-3 pr-10">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${ebook.accent}22` }}
                >
                  <FileText size={24} style={{ color: ebook.accent }} />
                </div>
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: `${ebook.accent}18`, color: ebook.accent }}
                >
                  {ebook.tag}
                </span>
              </div>

              <h2 className="text-lg font-semibold leading-tight text-white">{ebook.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#aeb8ca]">{ebook.subtitle}</p>

              <div className="mt-5 flex items-center justify-between border-t border-[#1e2d44] pt-4">
                <span className="flex items-center gap-1.5 text-xs text-[#8892a4]">
                  <Sparkles size={13} />
                  PDF · {ebook.size}
                </span>
                <span className="rounded-full border border-[#1e2d44] bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#aeb8ca]">
                  Incluso no pacote
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
