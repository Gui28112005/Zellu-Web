import React, { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Loader2, ChevronDown } from 'lucide-react'
import { BottomSheet, Button, Input } from '@/components/ui'
import { VehicleIllustration } from '@/components/VehicleIllustration'
import { useStore } from '@/lib/store'
import { addVeiculo } from '@/lib/db'
import type { TipoVeiculo, Veiculo } from '@/lib/types'
import { getVeiculoLabel } from '@/lib/utils'
import { getMarcas, getModelos, getAnos, getFipeTipo } from '@/lib/fipe'
import type { FipeMarca, FipeModelo, FipeAno } from '@/lib/fipe'

// â”€â”€â”€ constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TIPOS_VEICULO: TipoVeiculo[] = [
  'CARRO', 'HATCH', 'SUV', 'MOTO', 'CAMINHONETE', 'VAN',
  'FURGAO', 'CAMINHAO', 'ONIBUS', 'BICICLETA', 'BIKE_ELETRICA',
  'VEICULO_ELETRICO', 'CARRETINHA', 'MOTORHOME', 'TRATOR',
]

const SWATCHES = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff', '#94a3b8', '#1e293b', '#f8fafc',
]

const NO_KM_TYPES: TipoVeiculo[] = ['BICICLETA', 'BIKE_ELETRICA', 'CARRETINHA']

const VEZES_BATIDO = [
  { value: '0', label: 'Nunca foi batido' },
  { value: '1', label: '1 vez' },
  { value: '2', label: '2 vezes' },
  { value: '3', label: '3 vezes' },
  { value: '4', label: '4 vezes' },
  { value: '5', label: '5 vezes' },
  { value: '6', label: '6 vezes' },
  { value: 'NAO_INFORMADO', label: 'Não informado' },
]

const TEMPO_COM_VEICULO = [
  { value: 'MENOS_6_MESES', label: 'Menos de 6 meses' },
  { value: '6_MESES_1_ANO', label: '6 meses a 1 ano' },
  { value: '1_2_ANOS', label: '1 a 2 anos' },
  { value: '2_3_ANOS', label: '2 a 3 anos' },
  { value: '3_5_ANOS', label: '3 a 5 anos' },
  { value: 'MAIS_5_ANOS', label: 'Mais de 5 anos' },
]

// â”€â”€â”€ schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const schema = z.object({
  tipoVeiculo:     z.string().min(1) as z.ZodType<TipoVeiculo>,
  nome:            z.string().optional().default(''),
  marca:           z.string().optional().default(''),
  modelo:          z.string().optional().default(''),
  ano:             z.string().optional().default(''),
  cor:             z.string().min(1, 'Selecione uma cor'),
  kmAtual:         z.string().optional().default('0'),
  semControleKm:   z.boolean().default(false),
  quemUsa:         z.enum(['EU', 'OUTRA_PESSOA']).default('EU'),
  proprietario:    z.string().optional().default(''),
  vezesBatido:     z.string().optional().default('NAO_INFORMADO'),
  tempoComVeiculo: z.string().optional().default(''),
})

type FormData = z.infer<typeof schema>

function splitFipeModelName(modelName: string): { nome: string; modelo: string } {
  const clean = modelName.replace(/\s+/g, ' ').trim()
  if (!clean) return { nome: '', modelo: '' }

  const engineMatch = clean.match(/\s(?=\d+(?:[.,]\d+)?\b)/)
  if (engineMatch?.index && engineMatch.index > 0) {
    return {
      nome: clean.slice(0, engineMatch.index).trim(),
      modelo: clean.slice(engineMatch.index).trim(),
    }
  }

  const words = clean.split(' ')
  if (words.length <= 3) return { nome: clean, modelo: '' }

  return {
    nome: words.slice(0, 3).join(' '),
    modelo: words.slice(3).join(' '),
  }
}

function joinModelAndYear(modelo: string, ano: string): string {
  return [modelo.trim(), ano.trim()].filter(Boolean).join(' · ')
}

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SelectField({
  label, value, onChange, options, loading, disabled, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  loading?: boolean
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-[#8892a4] font-medium">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full bg-[#1a2540] border border-[#1e2d44] text-[#f0f4ff] rounded-2xl px-4 pr-10 py-3 text-sm appearance-none focus:outline-none focus:border-[#4f8df7] focus:ring-1 focus:ring-[#4f8df7]/30 disabled:opacity-50 cursor-pointer"
          style={{ background: '#1a2540' }}
        >
          <option value="">{placeholder ?? `Selecione ${label.toLowerCase()}`}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#1a2540' }}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8892a4]">
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : <ChevronDown size={14} />}
        </span>
      </div>
    </div>
  )
}

// â”€â”€â”€ props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved?: (veiculo: Veiculo) => void
}

// â”€â”€â”€ component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AddVehicleSheet({ isOpen, onClose, onSaved }: Props) {
  const user            = useStore((s) => s.user)
  const addVeiculoLocal = useStore((s) => s.addVeiculo)
  const [saving, setSaving] = useState(false)

  // FIPE state
  const [marcas,   setMarcas]   = useState<FipeMarca[]>([])
  const [modelos,  setModelos]  = useState<FipeModelo[]>([])
  const [anos,     setAnos]     = useState<FipeAno[]>([])
  const [loadingMarcas,  setLoadingMarcas]  = useState(false)
  const [loadingModelos, setLoadingModelos] = useState(false)
  const [loadingAnos,    setLoadingAnos]    = useState(false)
  const [marcaCodigo,  setMarcaCodigo]  = useState('')
  const [modeloCodigo, setModeloCodigo] = useState<number | null>(null)
  const [anoCodigo,    setAnoCodigo]    = useState('')
  const [anoManual,    setAnoManual]    = useState(false)
  const [fipeOnline,   setFipeOnline]   = useState<boolean | null>(null) // null = checking
  const [modeloBase,   setModeloBase]   = useState('')
  const [nomeValue,    setNomeValue]    = useState('')

  const { register, handleSubmit, control, watch, setValue, setError, clearErrors, getValues, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoVeiculo: 'CARRO',
      nome: '',
      marca: '',
      modelo: '',
      ano: '',
      cor: '#3b82f6',
      kmAtual: '0',
      semControleKm: false,
      quemUsa: 'EU',
      proprietario: '',
      vezesBatido: 'NAO_INFORMADO',
      tempoComVeiculo: '',
    },
  })

  const watchedTipo    = watch('tipoVeiculo')
  const watchedSemKm   = watch('semControleKm')
  const watchedQuemUsa = watch('quemUsa')
  const fipeTipo       = getFipeTipo(watchedTipo)
  const isBike         = ['BICICLETA', 'BIKE_ELETRICA'].includes(watchedTipo)

  // Reset when sheet closes
  useEffect(() => {
    if (!isOpen) {
      reset()
      setMarcas([])
      setModelos([])
      setAnos([])
      setMarcaCodigo('')
      setModeloCodigo(null)
      setAnoCodigo('')
      setAnoManual(false)
      setFipeOnline(null)
      setModeloBase('')
      setNomeValue('')
    }
  }, [isOpen, reset])

  // Check FIPE availability + load marcas when tipo changes
  useEffect(() => {
    if (!fipeTipo || !isOpen) {
      setMarcas([])
      setModelos([])
      setAnos([])
      setFipeOnline(null)
      return
    }
    setLoadingMarcas(true)
    setFipeOnline(null)
    setMarcas([])
    setModelos([])
    setAnos([])
    setMarcaCodigo('')
    setModeloCodigo(null)
    setAnoCodigo('')
    setAnoManual(false)
    setModeloBase('')
    setValue('marca', '')
    setValue('modelo', '')
    setValue('ano', '')
    getMarcas(fipeTipo)
      .then((ms) => {
        setFipeOnline(true)
        setMarcas(ms)
      })
      .catch(() => {
        setFipeOnline(false)
      })
      .finally(() => setLoadingMarcas(false))
  }, [watchedTipo, fipeTipo, isOpen, setValue])

  // Load modelos when marca changes
  const handleMarcaChange = useCallback(async (codigo: string) => {
    setMarcaCodigo(codigo)
    setModelos([])
    setAnos([])
    setModeloCodigo(null)
    setModeloBase('')
    setValue('modelo', '')
    setValue('ano', '')
    if (!fipeTipo || !codigo) return
    const marcaNome = marcas.find((m) => m.codigo === codigo)?.nome ?? ''
    setValue('marca', marcaNome)
    setLoadingModelos(true)
    try {
      const ms = await getModelos(fipeTipo, codigo)
      setModelos(ms)
    } catch {
      toast.error('Não foi possível carregar modelos.')
    } finally {
      setLoadingModelos(false)
    }
  }, [fipeTipo, marcas, setValue])

  // Load anos when modelo changes
  const handleModeloChange = useCallback(async (codigo: string) => {
    const codigoNum = Number(codigo)
    setModeloCodigo(codigoNum)
    setAnos([])
    setAnoCodigo('')
    setAnoManual(false)
    setValue('ano', '')
    if (!fipeTipo || !marcaCodigo || !codigo) return
    const modeloNome = modelos.find((m) => m.codigo === codigoNum)?.nome ?? ''
    const parsed = splitFipeModelName(modeloNome)
    const nextNome = parsed.nome || modeloNome
    setModeloBase(parsed.modelo)
    setNomeValue(nextNome)
    setValue('nome', nextNome, { shouldValidate: true, shouldDirty: true })
    clearErrors('nome')
    setValue('modelo', parsed.modelo)
    setLoadingAnos(true)
    try {
      const as = await getAnos(fipeTipo, marcaCodigo, codigoNum)
      setAnos(as)
    } catch {
      toast.error('Não foi possível carregar anos.')
    } finally {
      setLoadingAnos(false)
    }
  }, [clearErrors, fipeTipo, marcaCodigo, modelos, setValue])

  const onSubmit = async (fd: FormData) => {
    if (saving) return

    const currentValues = getValues()
    const nome = (nomeValue || currentValues.nome || fd.nome || '').trim()
    if (!nome) {
      setError('nome', { type: 'manual', message: 'Nome obrigatório' })
      toast.error('Informe o nome do veículo.')
      return
    }

    if (!user) {
      toast.error('Entre novamente para cadastrar o veículo.')
      return
    }

    setSaving(true)
    try {
      const novo = await addVeiculo(user.uid, {
        tipoVeiculo:     fd.tipoVeiculo,
        nome,
        marca:           fd.marca ?? '',
        modelo:          fd.modelo ?? '',
        ano:             fd.ano ?? '',
        cor:             fd.cor,
        kmAtual:         Number(fd.kmAtual) || 0,
        semControleKm:   fd.semControleKm,
        proprietario:    fd.quemUsa === 'OUTRA_PESSOA' ? (fd.proprietario ?? '') : '',
        vezesBatido:     fd.vezesBatido ?? 'NAO_INFORMADO',
        tempoComVeiculo: fd.tempoComVeiculo ?? '',
        fipeCodMarca:    marcaCodigo || undefined,
        fipeCodModelo:   modeloCodigo != null ? String(modeloCodigo) : undefined,
        fipeCodAno:      anoCodigo || undefined,
      })
      addVeiculoLocal(novo)
      toast.success('Veículo adicionado!')
      onSaved?.(novo)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar veículo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Cadastrar veículo">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 pb-4">

        {/* â”€â”€ TIPO â”€â”€ */}
        <div>
          <p className="text-sm text-[#8892a4] font-medium mb-3">Tipo de veículo</p>
          <Controller
            name="tipoVeiculo"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-5 gap-2">
                {TIPOS_VEICULO.map((tipo) => {
                  const active = field.value === tipo
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => field.onChange(tipo)}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all active:scale-95"
                      style={{
                        background: active ? 'rgba(79,141,247,0.15)' : 'rgba(255,255,255,0.03)',
                        borderColor: active ? '#4f8df7' : 'rgba(255,255,255,0.06)',
                        borderWidth: active ? 2 : 1,
                      }}
                    >
                      <div className="w-8 h-8 flex items-center justify-center">
                        <VehicleIllustration
                          tipo={tipo}
                          className="w-8 h-8 object-contain"
                          style={{ filter: active ? 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(195deg)' : 'brightness(0) invert(0.6)' }}
                        />
                      </div>
                      <span className="text-center leading-tight" style={{ fontSize: 9, color: active ? '#4f8df7' : '#8892a4', fontWeight: active ? 600 : 400 }}>
                        {getVeiculoLabel(tipo)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          />
        </div>

        {/* â”€â”€ MARCA / MODELO / ANO â”€â”€ */}
        {/* fipeOnline===null â†’ verificando; true â†’ selects FIPE; false/!fipeTipo â†’ campos livres */}
        {fipeTipo && fipeOnline === null && (
          <div className="flex items-center gap-2 text-[#8892a4] text-sm">
            <Loader2 size={14} className="animate-spin flex-shrink-0" />
            Verificando disponibilidade da FIPE…
          </div>
        )}

        {fipeTipo && fipeOnline === true ? (
          <>
            <SelectField
              label="Marca"
              value={marcaCodigo}
              onChange={handleMarcaChange}
              options={marcas.map((m) => ({ value: m.codigo, label: m.nome }))}
              loading={loadingMarcas}
              placeholder="Selecione a marca"
            />
            <SelectField
              label="Modelo"
              value={String(modeloCodigo ?? '')}
              onChange={handleModeloChange}
              options={modelos.map((m) => ({ value: String(m.codigo), label: m.nome }))}
              loading={loadingModelos}
              disabled={!marcaCodigo}
              placeholder="Selecione o modelo"
            />
            <div className="flex flex-col gap-1.5">
              {anoManual ? (
                <Input label="Ano" placeholder="Ex: 2019" {...register('ano')} />
              ) : (
                <SelectField
                  label="Ano"
                  value={anoCodigo}
                  onChange={(v) => {
                    setAnoCodigo(v)
                    const nomeAno = anos.find((a) => a.codigo === v)?.nome ?? v
                    setValue('ano', nomeAno)
                    setValue('modelo', joinModelAndYear(modeloBase || getValues('modelo'), nomeAno))
                  }}
                  options={anos.map((a) => ({ value: a.codigo, label: a.nome }))}
                  loading={loadingAnos}
                  disabled={!modeloCodigo}
                  placeholder="Selecione o ano"
                />
              )}
              <button
                type="button"
                onClick={() => { setAnoManual((p) => !p); setAnoCodigo(''); setValue('ano', '') }}
                className="text-xs text-[#4f8df7] text-right mt-0.5 hover:underline"
              >
                {anoManual ? 'Selecionar da lista' : 'Digitar manualmente'}
              </button>
            </div>
          </>
        ) : (!fipeTipo || fipeOnline === false) ? (
          <>
            {fipeOnline === false && (
              <p className="text-xs text-amber-400">FIPE indisponível — preencha manualmente.</p>
            )}
            <Input label="Marca" placeholder="Ex: Volkswagen" {...register('marca')} />
            <Input label="Modelo" placeholder="Ex: Gol 1.0" {...register('modelo')} />
            <Input label="Ano" placeholder="Ex: 2022" {...register('ano')} />
          </>
        ) : null}

        {/* â”€â”€ NOME â”€â”€ */}
        <Input
          label="Nome do veículo *"
          placeholder="Ex: Meu Gol"
          error={errors.nome?.message}
          value={nomeValue}
          onChange={(event) => {
            const nextNome = event.target.value
            setNomeValue(nextNome)
            setValue('nome', nextNome, { shouldDirty: true })
            if (nextNome.trim()) clearErrors('nome')
          }}
          onBlur={() => setValue('nome', nomeValue, { shouldValidate: true })}
        />

        {/* â”€â”€ COR â”€â”€ */}
        <div>
          <p className="text-sm text-[#8892a4] mb-3 font-medium">Cor</p>
          <Controller
            name="cor"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-3">
                {SWATCHES.map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() => field.onChange(sw)}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex-shrink-0 ${
                      field.value === sw
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d1526] border-white/50 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: sw }}
                  />
                ))}
              </div>
            )}
          />
        </div>

        {/* â”€â”€ KM â”€â”€ */}
        {!NO_KM_TYPES.includes(watchedTipo) && (
          <Input
            label="KM atual"
            type="number"
            placeholder="0"
            {...register('kmAtual')}
          />
        )}

        {/* â”€â”€ QUEM USA â”€â”€ */}
        <div>
          <p className="text-sm text-[#8892a4] font-medium mb-3">Quem usa esse veículo?</p>
          <Controller
            name="quemUsa"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {(['EU', 'OUTRA_PESSOA'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => field.onChange(opt)}
                    className="py-3 px-4 rounded-2xl border text-sm font-semibold transition-all"
                    style={{
                      background: field.value === opt ? 'rgba(79,141,247,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: field.value === opt ? '#4f8df7' : 'rgba(255,255,255,0.06)',
                      color: field.value === opt ? '#4f8df7' : '#8892a4',
                    }}
                  >
                    {opt === 'EU' ? 'Eu mesmo' : 'Outra pessoa'}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {watchedQuemUsa === 'OUTRA_PESSOA' && (
          <Input
            label="Nome da pessoa"
            placeholder="Nome do proprietário"
            {...register('proprietario')}
          />
        )}

        {/* â”€â”€ VEZES BATIDO (nÃ£o para bikes) â”€â”€ */}
        {!isBike && (
          <SelectField
            label="Vezes batido"
            value={watch('vezesBatido') ?? 'NAO_INFORMADO'}
            onChange={(v) => setValue('vezesBatido', v)}
            options={VEZES_BATIDO}
            placeholder="Selecione"
          />
        )}

        {/* â”€â”€ TEMPO COM VEÃCULO â”€â”€ */}
        <SelectField
          label="Há quanto tempo tem esse veículo?"
          value={watch('tempoComVeiculo') ?? ''}
          onChange={(v) => setValue('tempoComVeiculo', v)}
          options={TEMPO_COM_VEICULO}
          placeholder="Selecione"
        />

        {/* â”€â”€ SUBMIT â”€â”€ */}
        <Button type="submit" variant="gradient" fullWidth loading={saving} className="mt-1">
          Salvar veículo
        </Button>
      </form>
    </BottomSheet>
  )
}
