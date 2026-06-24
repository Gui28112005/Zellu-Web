import React, { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Upload, RotateCcw, Check, Loader2 } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetectedData {
  valor?: number
  data?: string
  km?: number
  peca?: string
  linhas: string[]
}

interface CameraCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (data: DetectedData) => void
}

type Stage = 'preview' | 'captured' | 'processing' | 'done'

// ─── OCR parsing helpers ──────────────────────────────────────────────────────

function parseOCRText(text: string): DetectedData {
  const linhas = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2)

  // Currency: R$ 1.234,56 or 1234,56 or 1.234.56
  let valor: number | undefined
  const currencyMatch = text.match(/R\$\s*([\d.,]+)/i)
  if (currencyMatch) {
    const raw = currencyMatch[1].replace(/\./g, '').replace(',', '.')
    const n = parseFloat(raw)
    if (!isNaN(n) && n > 0) valor = n
  }
  if (!valor) {
    // Try standalone decimal amount like 250,00 or 250.00
    const standalone = text.match(/\b(\d{1,6}[,.]?\d{0,2})\b/)
    if (standalone) {
      const raw = standalone[1].replace(',', '.')
      const n = parseFloat(raw)
      if (!isNaN(n) && n > 5) valor = n
    }
  }

  // Date: dd/MM/yyyy
  let data: string | undefined
  const dateMatch = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/)
  if (dateMatch) {
    data = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`
  }

  // KM: 45000 km or 45.000 km
  let km: number | undefined
  const kmMatch = text.match(/(\d[\d.,]*)\s*km/i)
  if (kmMatch) {
    const raw = kmMatch[1].replace(/\./g, '').replace(',', '')
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n > 100) km = n
  }

  // Item/peca: lines containing maintenance keywords
  const keywords = [
    'filtro', 'óleo', 'oleo', 'pneu', 'troca', 'revisão', 'revisao',
    'freio', 'bateria', 'correia', 'vela', 'pastilha', 'fluido',
    'alinhamento', 'balanceamento', 'lavagem', 'serviço', 'servico',
    'mão de obra', 'mao de obra', 'peça', 'peca',
  ]
  let peca: string | undefined
  for (const linha of linhas) {
    const lower = linha.toLowerCase()
    if (keywords.some((k) => lower.includes(k))) {
      peca = linha.slice(0, 60)
      break
    }
  }

  return { valor, data, km, peca, linhas: linhas.slice(0, 20) }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [stage, setStage] = useState<Stage>('preview')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [detected, setDetected] = useState<DetectedData | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Toggle states for detected items
  const [useValor, setUseValor] = useState(true)
  const [useData, setUseData] = useState(true)
  const [useKm, setUseKm] = useState(true)
  const [usePeca, setUsePeca] = useState(true)

  // ── Camera lifecycle ────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setPermissionDenied(false)
    } catch {
      setPermissionDenied(true)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isOpen && stage === 'preview') {
      startCamera()
    }
    return () => {
      if (!isOpen) stopCamera()
    }
  }, [isOpen, stage, startCamera, stopCamera])

  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      setStage('preview')
      setCapturedBlob(null)
      setCapturedUrl(null)
      setDetected(null)
      setProgress(0)
      setPermissionDenied(false)
    }
  }, [isOpen, stopCamera])

  // ── Capture from camera ─────────────────────────────────────────────────────

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setCapturedBlob(blob)
        setCapturedUrl(URL.createObjectURL(blob))
        stopCamera()
        setStage('captured')
      },
      'image/jpeg',
      0.92
    )
  }, [stopCamera])

  // ── Upload from file ────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      setCapturedBlob(file)
      setCapturedUrl(url)
      stopCamera()
      setStage('captured')
      // Reset input so same file can be re-selected
      e.target.value = ''
    },
    [stopCamera]
  )

  // ── OCR analysis ────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!capturedBlob) return
    setStage('processing')
    setProgress(0)

    try {
      // Dynamic import to keep bundle lean
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('por', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })
      const { data: { text } } = await worker.recognize(capturedBlob)
      await worker.terminate()

      const result = parseOCRText(text)
      setDetected(result)
      setUseValor(true)
      setUseData(true)
      setUseKm(true)
      setUsePeca(true)
      setStage('done')
    } catch (err) {
      console.error('OCR error', err)
      // Fallback: return empty result
      setDetected({ linhas: [] })
      setStage('done')
    }
  }, [capturedBlob])

  // ── Retake ──────────────────────────────────────────────────────────────────

  const handleRetake = useCallback(() => {
    setCapturedBlob(null)
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedUrl(null)
    setDetected(null)
    setProgress(0)
    setStage('preview')
    startCamera()
  }, [capturedUrl, startCamera])

  // ── Confirm and return data ─────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (!detected) return
    const result: DetectedData = {
      linhas: detected.linhas,
      ...(useValor && detected.valor !== undefined ? { valor: detected.valor } : {}),
      ...(useData && detected.data ? { data: detected.data } : {}),
      ...(useKm && detected.km !== undefined ? { km: detected.km } : {}),
      ...(usePeca && detected.peca ? { peca: detected.peca } : {}),
    }
    onCapture(result)
    onClose()
  }, [detected, useValor, useData, useKm, usePeca, onCapture, onClose])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        key="camera-overlay"
        className="fixed inset-0 bg-black z-[100] flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <X size={18} />
          </button>
          <p className="text-white font-semibold text-sm">Escanear Nota</p>
          <div className="w-9" />
        </div>

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden">

          {/* ── PREVIEW STATE ── */}
          {stage === 'preview' && (
            <>
              {permissionDenied ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
                    📷
                  </div>
                  <p className="text-white font-semibold">Câmera bloqueada</p>
                  <p className="text-white/60 text-sm">
                    Permissão de câmera negada. Use o upload para selecionar uma imagem.
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload size={16} />}
                  >
                    Selecionar imagem
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Corner guides */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-72 h-48">
                      {/* TL */}
                      <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-white rounded-tl-md" />
                      {/* TR */}
                      <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-white rounded-tr-md" />
                      {/* BL */}
                      <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-white rounded-bl-md" />
                      {/* BR */}
                      <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-white rounded-br-md" />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── CAPTURED STATE ── */}
          {(stage === 'captured' || stage === 'processing') && capturedUrl && (
            <div className="w-full h-full relative">
              <img
                src={capturedUrl}
                alt="Nota capturada"
                className={`w-full h-full object-contain transition-opacity duration-300 ${stage === 'processing' ? 'opacity-40' : 'opacity-100'}`}
              />
              {stage === 'processing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <Spinner size="lg" />
                  <p className="text-white font-semibold">Analisando...</p>
                  {progress > 0 && (
                    <div className="w-48">
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-white/60 text-xs text-center mt-1">{progress}%</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── DONE STATE ── */}
          {stage === 'done' && detected && (
            <div className="h-full overflow-y-auto px-4 py-4">
              <p className="text-white/60 text-sm mb-4 text-center">
                Selecione os dados a importar
              </p>
              <div className="space-y-3 max-w-sm mx-auto">

                {detected.valor !== undefined && (
                  <DetectedItem
                    emoji="💰"
                    label={`R$ ${detected.valor.toFixed(2).replace('.', ',')}`}
                    sublabel="Valor detectado"
                    active={useValor}
                    onToggle={() => setUseValor((v) => !v)}
                  />
                )}
                {detected.data && (
                  <DetectedItem
                    emoji="📅"
                    label={detected.data}
                    sublabel="Data detectada"
                    active={useData}
                    onToggle={() => setUseData((v) => !v)}
                  />
                )}
                {detected.km !== undefined && (
                  <DetectedItem
                    emoji="🛣"
                    label={`${detected.km.toLocaleString('pt-BR')} km`}
                    sublabel="Quilometragem detectada"
                    active={useKm}
                    onToggle={() => setUseKm((v) => !v)}
                  />
                )}
                {detected.peca && (
                  <DetectedItem
                    emoji="🔧"
                    label={detected.peca}
                    sublabel="Item detectado"
                    active={usePeca}
                    onToggle={() => setUsePeca((v) => !v)}
                  />
                )}

                {!detected.valor && !detected.data && !detected.km && !detected.peca && (
                  <div className="text-center py-8">
                    <p className="text-white/40 text-sm">Nenhum dado reconhecido.</p>
                    <p className="text-white/30 text-xs mt-1">Tente uma foto mais nítida.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Bottom bar */}
        <div className="px-4 py-4 bg-black/60 backdrop-blur-sm">
          {stage === 'preview' && !permissionDenied && (
            <div className="flex gap-3 justify-center">
              <Button
                variant="ghost"
                size="md"
                className="flex-1 max-w-[140px]"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload size={16} />}
              >
                Upload
              </Button>
              <Button
                variant="gradient"
                size="md"
                className="flex-1 max-w-[180px]"
                onClick={handleCapture}
                leftIcon={<Camera size={16} />}
              >
                Capturar
              </Button>
            </div>
          )}

          {stage === 'captured' && (
            <div className="flex gap-3 justify-center">
              <Button
                variant="ghost"
                size="md"
                className="flex-1 max-w-[140px]"
                onClick={handleRetake}
                leftIcon={<RotateCcw size={16} />}
              >
                Nova foto
              </Button>
              <Button
                variant="gradient"
                size="md"
                className="flex-1 max-w-[180px]"
                onClick={handleAnalyze}
                leftIcon={<Loader2 size={16} />}
              >
                Analisar
              </Button>
            </div>
          )}

          {stage === 'processing' && (
            <div className="flex justify-center">
              <p className="text-white/50 text-sm">Processando OCR...</p>
            </div>
          )}

          {stage === 'done' && (
            <div className="flex gap-3 justify-center">
              <Button
                variant="ghost"
                size="md"
                className="flex-1 max-w-[140px]"
                onClick={handleRetake}
                leftIcon={<RotateCcw size={16} />}
              >
                Nova foto
              </Button>
              <Button
                variant="gradient"
                size="md"
                className="flex-1 max-w-[180px]"
                onClick={handleConfirm}
                leftIcon={<Check size={16} />}
              >
                Usar dados
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── DetectedItem ─────────────────────────────────────────────────────────────

interface DetectedItemProps {
  emoji: string
  label: string
  sublabel: string
  active: boolean
  onToggle: () => void
}

function DetectedItem({ emoji, label, sublabel, active, onToggle }: DetectedItemProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-150 text-left ${
        active
          ? 'bg-gradient-to-r from-[#4f8df7]/15 to-[#60a5fa]/15 border-[#4f8df7]/40'
          : 'bg-white/5 border-white/10 opacity-50'
      }`}
    >
      <span className="text-2xl flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{label}</p>
        <p className="text-white/50 text-xs">{sublabel}</p>
      </div>
      <div
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
          active
            ? 'bg-gradient-to-br from-[#4f8df7] to-[#60a5fa] border-transparent'
            : 'border-white/30'
        }`}
      >
        {active && <Check size={12} className="text-white" />}
      </div>
    </button>
  )
}
