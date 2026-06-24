import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Gauge,
  MapPin,
  Package,
  Pencil,
  Tag,
  Trash2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PageTransition } from '@/components/layout/PageTransition'
import ReminderFormSheet from '@/components/reminders/ReminderFormSheet'
import { useStore } from '@/lib/store'
import { deleteLembrete } from '@/lib/db'
import { formatCurrency, formatDate, getTipoColor, getTipoLabel, isLembreteVencido } from '@/lib/utils'

interface DetailItemProps {
  icon: React.ReactNode
  label: string
  value: string
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-[#263650] py-3 last:border-b-0">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#60a5fa]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#8892a4]">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[#f0f4ff]">{value || 'Não informado'}</p>
      </div>
    </div>
  )
}

export default function ReminderDetailScreen() {
  const { id: vehicleId, reminderId } = useParams<{ id: string; reminderId: string }>()
  const navigate = useNavigate()
  const lembrete = useStore((state) => state.lembretes.find((item) => item.id === reminderId && item.veiculoId === vehicleId))
  const veiculo = useStore((state) => state.veiculos.find((item) => item.id === vehicleId))
  const user = useStore((s) => s.user)
  const removeLembreteLocal = useStore((s) => s.removeLembreteLocal)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  async function handleDelete() {
    if (!user || !lembrete) return
    if (!window.confirm('Apagar este aviso?')) return

    setDeleting(true)
    try {
      await deleteLembrete(user.uid, lembrete.id)
      removeLembreteLocal(lembrete.id)
      toast.success('Aviso apagado.')
      navigate(-1)
    } catch {
      toast.error('Erro ao apagar aviso.')
      setDeleting(false)
    }
  }

  if (!lembrete) {
    return (
      <PageTransition className="flex min-h-full items-center justify-center bg-[#070c14] px-6 text-center">
        <div>
          <Bell size={32} className="mx-auto text-[#8892a4]" />
          <p className="mt-3 font-semibold text-[#f0f4ff]">Aviso não encontrado</p>
          <button onClick={() => navigate(-1)} className="mt-3 text-sm text-[#60a5fa]">
            Voltar
          </button>
        </div>
      </PageTransition>
    )
  }

  const color = getTipoColor(lembrete.tipo)
  const expired = !lembrete.concluido && isLembreteVencido(lembrete)
  const status = lembrete.concluido ? 'Concluído' : expired ? 'Vencido' : 'Pendente'
  const statusColor = lembrete.concluido ? '#4ade80' : expired ? '#f87171' : '#60a5fa'

  return (
    <PageTransition className="min-h-full bg-[#070c14] text-[#f0f4ff]">
      <div className="mx-auto w-full max-w-xl px-4 pb-8 pt-5">
        <section className="relative overflow-hidden rounded-3xl border border-[#263650] bg-[#101a2c] p-6 text-center">
          <div
            className="absolute inset-0 opacity-10"
            style={{ background: `radial-gradient(circle at top, ${color}, transparent 65%)` }}
          />
          <div className="relative">
            <span
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}22`, color }}
            >
              <Bell size={29} />
            </span>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest" style={{ color }}>
              {getTipoLabel(lembrete.tipo)}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{lembrete.titulo}</h1>
            {veiculo && <p className="mt-1 text-sm text-[#8892a4]">{veiculo.nome}</p>}
            <span
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style={{ color: statusColor, backgroundColor: `${statusColor}18` }}
            >
              <CheckCircle2 size={14} />
              {status}
            </span>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-[#263650] bg-[#101a2c] px-5">
          <DetailItem icon={<Tag size={18} />} label="Categoria" value={getTipoLabel(lembrete.tipo)} />
          <DetailItem icon={<Package size={18} />} label="Peça / Serviço" value={lembrete.peca} />
          <DetailItem icon={<CalendarDays size={18} />} label="Data" value={lembrete.dataLimite ? formatDate(lembrete.dataLimite) : ''} />
          <DetailItem icon={<Clock size={18} />} label="Horário" value={lembrete.horaAviso} />
          <DetailItem icon={<Gauge size={18} />} label="KM limite" value={lembrete.kmLimite ? `${lembrete.kmLimite} km` : ''} />
          <DetailItem icon={<DollarSign size={18} />} label="Valor" value={lembrete.valor > 0 ? formatCurrency(lembrete.valor) : ''} />
          <DetailItem icon={<MapPin size={18} />} label="Estabelecimento" value={lembrete.estabelecimentoNome} />
        </section>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/30 bg-[#4f8df7]/15 py-3.5 text-sm font-semibold text-[#60a5fa] transition-colors hover:bg-[#4f8df7]/20 active:scale-[0.98]"
          >
            <Pencil size={16} />
            Editar aviso
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-50 active:scale-[0.98]"
          >
            <Trash2 size={16} />
            {deleting ? 'Apagando…' : 'Apagar aviso'}
          </button>
        </div>
      </div>

      <ReminderFormSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        veiculoId={vehicleId ?? lembrete.veiculoId}
        lembrete={lembrete}
      />
    </PageTransition>
  )
}
