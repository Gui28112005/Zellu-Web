import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import { BottomSheet, Button, Input } from '@/components/ui'
import { useStore } from '@/lib/store'
import { addLembrete, updateLembrete } from '@/lib/db'
import type { Lembrete, TipoManutencao } from '@/lib/types'
import { getTipoColor, getTipoLabel, todayStr } from '@/lib/utils'

// â”€â”€â”€ Tipo config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TIPO_LIST: { tipo: TipoManutencao; emoji: string }[] = [
  { tipo: 'OLEO',          emoji: '🛢️' },
  { tipo: 'FREIO',         emoji: '🔧' },
  { tipo: 'PNEU',          emoji: '🔄' },
  { tipo: 'BATERIA',       emoji: '🔋' },
  { tipo: 'TRANSMISSAO',   emoji: '⚙️' },
  { tipo: 'LAVAGEM',       emoji: '🚿' },
  { tipo: 'REVISAO',       emoji: '🔍' },
  { tipo: 'MECANICA',      emoji: '🔨' },
  { tipo: 'FUNILARIA',     emoji: '🎨' },
  { tipo: 'LICENCIAMENTO', emoji: '📄' },
  { tipo: 'IPVA',          emoji: '💰' },
  { tipo: 'SEGURO',        emoji: '🛡️' },
  { tipo: 'ABASTECIMENTO', emoji: '⛽' },
  { tipo: 'CORRENTE',      emoji: '⛓️' },
  { tipo: 'LUBRIFICACAO',  emoji: '🛢️' },
  { tipo: 'PEDIVELA',      emoji: '🔩' },
  { tipo: 'ACESSORIOS',    emoji: '🔌' },
  { tipo: 'CONFORTO',      emoji: '💺' },
  { tipo: 'VIDROS',        emoji: '🪟' },
  { tipo: 'OUTROS',        emoji: '📝' },
]

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = Math.floor(index / 4)
  const minute = String((index % 4) * 15).padStart(2, '0')
  return `${String(hour).padStart(2, '0')}:${minute}`
})

// â”€â”€â”€ Date helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** "dd/MM/yyyy" â†’ "yyyy-MM-dd" for <input type="date"> */
function toInputDate(dmy: string): string {
  if (!dmy) return ''
  const [dd, mm, yyyy] = dmy.split('/')
  if (!dd || !mm || !yyyy) return ''
  return `${yyyy}-${mm}-${dd}`
}

/** "yyyy-MM-dd" â†’ "dd/MM/yyyy" */
function fromInputDate(iso: string): string {
  if (!iso) return ''
  const [yyyy, mm, dd] = iso.split('-')
  if (!dd || !mm || !yyyy) return ''
  return `${dd}/${mm}/${yyyy}`
}

// â”€â”€â”€ Zod schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const schema = z.object({
  titulo: z.string().optional().default(''),
  tipo: z.string().min(1, 'Selecione o tipo') as z.ZodType<TipoManutencao>,
  peca: z.string().optional(),
  dataLimite: z.string().optional(),   // stored as dd/MM/yyyy
  kmLimite: z.string().optional(),
  valor: z.string().optional(),
  horaAviso: z.string().optional(),
  estabelecimentoNome: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ReminderFormSheetProps {
  isOpen: boolean
  onClose: () => void
  veiculoId: string
  lembrete?: Lembrete
  initialTipo?: TipoManutencao
  createAsCompleted?: boolean
  onSaved?: () => void
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ReminderFormSheet({
  isOpen,
  onClose,
  veiculoId,
  lembrete,
  initialTipo = 'OUTROS',
  createAsCompleted = false,
  onSaved,
}: ReminderFormSheetProps) {
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const lembretes = useStore((s) => s.lembretes)
  const addLembreteLocal = useStore((s) => s.addLembreteLocal)
  const updateLembreteLocal = useStore((s) => s.updateLembreteLocal)

  const LIMITE_POR_PLANO: Record<string, number> = { FREE: 5, LITE: 15, FROTA: 50, EMPRESARIAL: Infinity }
  const limiteAtual = LIMITE_POR_PLANO[user?.plano ?? 'FREE'] ?? 5
  const totalAtual = lembretes.filter((l) => l.veiculoId === veiculoId).length

  const [saving, setSaving] = useState(false)
  const [tituloValue, setTituloValue] = useState('')
  const resetKeyRef = useRef('')

  const isEdit = Boolean(lembrete)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '',
      tipo: 'OUTROS',
      peca: '',
      dataLimite: todayStr(),
      kmLimite: '',
      valor: '',
      horaAviso: '08:00',
      estabelecimentoNome: '',
    },
  })

  // Populate form only when the sheet opens or switches record.
  // On mobile, frequent re-renders while the keyboard is open were resetting the form.
  useEffect(() => {
    if (!isOpen) {
      resetKeyRef.current = ''
      return
    }

    const resetKey = `${lembrete?.id ?? 'novo'}:${initialTipo}:${createAsCompleted ? 'done' : 'future'}`
    if (resetKeyRef.current === resetKey) return
    resetKeyRef.current = resetKey

    if (lembrete) {
      const nextTitulo = lembrete.titulo ?? ''
      setTituloValue(nextTitulo)
      reset({
        titulo: nextTitulo,
        tipo: lembrete.tipo,
        peca: lembrete.peca ?? '',
        dataLimite: lembrete.dataLimite ?? todayStr(),
        kmLimite: lembrete.kmLimite ? Number(lembrete.kmLimite.replace(/\D/g, '')).toLocaleString('pt-BR') : '',
        valor: lembrete.valor ? lembrete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
        horaAviso: lembrete.horaAviso ?? '08:00',
        estabelecimentoNome: lembrete.estabelecimentoNome ?? '',
      })
    } else {
      setTituloValue('')
      reset({
        titulo: '',
        tipo: initialTipo,
        peca: '',
        dataLimite: todayStr(),
        kmLimite: '',
        valor: '',
        horaAviso: '08:00',
        estabelecimentoNome: '',
      })
    }
  }, [isOpen, lembrete?.id, initialTipo, createAsCompleted, reset])

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const onSubmit = async (fd: FormData) => {
    if (!user) return

    const currentValues = getValues()
    const titulo = (tituloValue || currentValues.titulo || fd.titulo || '').trim()
    if (!titulo) {
      setError('titulo', { type: 'manual', message: 'Título obrigatório' })
      toast.error('Informe o título do aviso.')
      return
    }

    if (!lembrete && createAsCompleted && fd.tipo === 'ABASTECIMENTO') {
      toast('Abrindo cadastro de abastecimento…')
      onClose()
      navigate(`/veiculo/${veiculoId}/abastecimento?novo=1`)
      return
    }

    setSaving(true)

    try {
      const payload = {
        veiculoId,
        titulo,
        tipo: fd.tipo,
        peca: fd.peca?.trim() ?? '',
        dataLimite: fd.dataLimite ?? '',
        kmLimite: fd.kmLimite ? fd.kmLimite.replace(/\./g, '').replace(/\D/g, '') : '',
        valor: fd.valor ? parseFloat(fd.valor.replace(/\./g, '').replace(',', '.')) : 0,
        horaAviso: fd.horaAviso ?? '08:00',
        estabelecimentoNome: fd.estabelecimentoNome?.trim() ?? '',
        concluido: lembrete?.concluido ?? createAsCompleted,
        concluidoEm: lembrete?.concluidoEm ?? (createAsCompleted ? Date.now() : undefined),
      }

      if (isEdit && lembrete) {
        const updated: Lembrete = {
          ...lembrete,
          ...payload,
        }
        await updateLembrete(user.uid, updated)
        updateLembreteLocal(updated)
        toast.success('Lembrete atualizado!')
      } else {
        if (totalAtual >= limiteAtual) {
          toast.error(`Limite de ${limiteAtual} avisos atingido. Faça upgrade para adicionar mais.`)
          setSaving(false)
          return
        }
        const created = await addLembrete(user.uid, payload)
        addLembreteLocal(created)
        if (!createAsCompleted) {
          toast.success('Lembrete salvo! Vamos te avisar por notificação.')
        } else {
          toast.success('Serviço registrado no histórico!')
        }
      }

      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar lembrete.')
    } finally {
      setSaving(false)
    }
  }

  // â”€ Helper to convert hex â†’ rgba â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const hexToRgba = (hex: string, alpha: number) => {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? 'Editar registro' : createAsCompleted ? 'Novo registro' : 'Novo lembrete'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* â”€â”€ Tipo selector â”€â”€ */}
          <div>
            <p className="text-sm text-[#8892a4] mb-3 font-medium">Categoria escolhida</p>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                  style={{
                    background: hexToRgba(getTipoColor(field.value), 0.12),
                    borderColor: hexToRgba(getTipoColor(field.value), 0.35),
                  }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-base"
                    style={{ background: hexToRgba(getTipoColor(field.value), 0.22) }}
                  >
                    {TIPO_LIST.find((item) => item.tipo === field.value)?.emoji ?? '📝'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8892a4]">
                      Categoria
                    </p>
                    <p className="text-sm font-semibold text-[#f0f4ff]">{getTipoLabel(field.value)}</p>
                  </div>
                </div>
              )}
            />
            {errors.tipo && (
              <p className="text-red-400 text-xs mt-1">{errors.tipo.message}</p>
            )}
          </div>

          {/* â”€â”€ Title â”€â”€ */}
          <Input
            label="Título"
            placeholder="Ex: Troca de óleo"
            error={errors.titulo?.message}
            value={tituloValue}
            onChange={(event) => {
              const nextTitulo = event.target.value
              setTituloValue(nextTitulo)
              setValue('titulo', nextTitulo, { shouldDirty: true })
              if (nextTitulo.trim()) clearErrors('titulo')
            }}
            onBlur={() => setValue('titulo', tituloValue, { shouldValidate: true })}
          />

          {/* â”€â”€ Peca â”€â”€ */}
          <Input
            label="Peça / Serviço"
            placeholder="Ex: Filtro de óleo"
            {...register('peca')}
          />

          {/* â”€â”€ Date + KM row â”€â”€ */}
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="dataLimite"
              control={control}
              render={({ field }) => (
                <Input
                  label={createAsCompleted ? 'Data do serviço' : 'Data limite'}
                  type="date"
                  value={toInputDate(field.value ?? '')}
                  onChange={(e) => field.onChange(fromInputDate(e.target.value))}
                />
              )}
            />
            <Input
              label={createAsCompleted ? 'KM no serviço' : 'KM limite'}
              type="text"
              inputMode="numeric"
              placeholder="Ex: 55.000"
              {...register('kmLimite')}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '')
                const formatted = raw ? Number(raw).toLocaleString('pt-BR') : ''
                e.target.value = formatted
                register('kmLimite').onChange(e)
              }}
            />
          </div>

          {/* â”€â”€ Valor + Hora row â”€â”€ */}
          <div className={createAsCompleted ? '' : 'grid grid-cols-2 gap-3'}>
            <Input
              label="Valor (R$)"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              {...register('valor')}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '')
                const cents = parseInt(raw || '0', 10)
                const formatted = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                e.target.value = formatted === '0,00' && raw === '' ? '' : formatted
                register('valor').onChange(e)
              }}
            />
            {!createAsCompleted && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#8892a4]">Hora aviso</span>
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#4f8df7]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <select
                    {...register('horaAviso')}
                    className="h-[3.25rem] w-full appearance-none rounded-2xl border border-[#1e2d44] bg-[#1a2540] pl-10 pr-10 text-base font-medium text-[#f0f4ff] outline-none transition-all focus:border-[#4f8df7] focus:ring-1 focus:ring-[#4f8df7]/30"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time} className="bg-[#131e33] text-white">
                        {time}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a4]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* â”€â”€ Estabelecimento â”€â”€ */}
          <Input
            label="Estabelecimento"
            placeholder="Ex: Auto Center Silva"
            {...register('estabelecimentoNome')}
          />

          {/* â”€â”€ Submit â”€â”€ */}
          <Button
            variant="gradient"
            fullWidth
            size="lg"
            type="submit"
            loading={saving}
          >
            {isEdit ? 'Salvar alterações' : createAsCompleted ? 'Registrar serviço' : 'Criar lembrete'}
          </Button>
        </form>
      </BottomSheet>

    </>
  )
}
