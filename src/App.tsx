import React, { useEffect, useRef, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { onAuthStateChanged, User as FirebaseUser, Unsubscribe as AuthUnsubscribe } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  subscribeVeiculos,
  subscribeLembretes,
  subscribeAbastecimentos,
} from '@/lib/db'
import { useStore } from '@/lib/store'
import { AppLayout } from '@/components/layout/AppLayout'
import { requestPushPermission, syncLembrete } from '@/lib/push'
import { getSubscriptionStatus } from '@/lib/subscription'
import toast from 'react-hot-toast'
import { hasLocalData, getDriveToken, downloadFromDrive, applyBackupToLocalStorage, recordBackupTimestamp, DRIVE_BACKUP_KEY } from '@/lib/driveBackup'

// ─── Lazy screens ────────────────────────────────────────────────────────────

const AuthScreen = lazy(() => import('@/screens/AuthScreen'))
const OnboardingScreen = lazy(() => import('@/screens/OnboardingScreen'))
const GaragemScreen = lazy(() => import('@/screens/GaragemScreen'))
const VehicleDetailScreen = lazy(() => import('@/screens/VehicleDetailScreen'))
const ReminderDetailScreen = lazy(() => import('@/screens/ReminderDetailScreen'))
const ReminderCategoryScreen = lazy(() => import('@/screens/ReminderCategoryScreen'))
const FuelScreen = lazy(() => import('@/screens/FuelScreen'))
const RelatorioScreen = lazy(() => import('@/screens/RelatorioScreen'))
const MecanicoVirtualScreen = lazy(() => import('@/screens/MecanicoVirtualScreen'))
const GuiaManutencaoScreen = lazy(() => import('@/screens/GuiaManutencaoScreen'))
const ProfileScreen = lazy(() => import('@/screens/ProfileScreen'))
const SettingsScreen = lazy(() => import('@/screens/SettingsScreen'))
const BibliotecaScreen = lazy(() => import('@/screens/BibliotecaScreen'))
const PrivacyPolicyScreen = lazy(() => import('@/screens/PrivacyPolicyScreen'))
const TermsOfUseScreen = lazy(() => import('@/screens/TermsOfUseScreen'))
const PremiumScreen = lazy(() => import('@/screens/PremiumScreen'))
const PremiumBenefitsScreen = lazy(() => import('@/screens/PremiumBenefitsScreen'))
const PlansScreen = lazy(() => import('@/screens/PlansScreen'))
const FleetOverviewScreen = lazy(() => import('@/screens/FleetOverviewScreen'))
const FleetCostsScreen = lazy(() => import('@/screens/FleetCostsScreen'))
const PneusScreen = lazy(() => import('@/screens/PneusScreen'))
const PecasScreen = lazy(() => import('@/screens/PecasScreen'))
const RotasScreen = lazy(() => import('@/screens/RotasScreen'))
const EstoqueScreen = lazy(() => import('@/screens/EstoqueScreen'))
const ViagensScreen = lazy(() => import('@/screens/ViagensScreen'))

function PrimaryVehicleScreen() {
  const veiculos = useStore((state) => state.veiculos)

  if (veiculos.length === 0) return <GaragemScreen />

  const lastVehicleId = localStorage.getItem('zellu:lastVehicleId')
  const vehicle = veiculos.find((item) => item.id === lastVehicleId) ?? veiculos[0]

  return <VehicleDetailScreen vehicleId={vehicle.id} />
}

// ─── Loading fallback ────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#070c14] px-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(79,141,247,0.28),transparent_32%),linear-gradient(180deg,#09111f_0%,#070c14_72%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(96,165,250,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.08)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />

      <div className="relative z-10 flex w-full max-w-[280px] flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-[34px] bg-[#4f8df7]/20 blur-2xl" />
          <div className="absolute inset-0 rounded-[34px] border border-[#70a7ff]/25 bg-[#0f1a2e]/70 shadow-2xl shadow-blue-500/20 [animation:zellu-pulse_2.4s_ease-in-out_infinite]" />
          <div className="absolute inset-[5px] rounded-[30px] border border-white/5 bg-[#0b1424]" />
          <img
            src="/pwa-192x192.png"
            alt="Zellu"
            className="relative h-20 w-20 rounded-[24px] object-cover shadow-lg shadow-black/25"
          />
        </div>

        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.3em] text-[#70a7ff]">
          Zellu
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-[#f4f7ff]">
          Preparando sua garagem
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-[#8fa2bf]">
          Sincronizando dados, avisos e historico do app.
        </p>

        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-[#16243a]">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#2563eb] via-[#60a5fa] to-[#34d399] [animation:zellu-load_1.45s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes zellu-pulse {
          0%, 100% { box-shadow: 0 22px 60px rgba(79, 141, 247, 0.18); border-color: rgba(112, 167, 255, 0.22); }
          50% { box-shadow: 0 26px 74px rgba(79, 141, 247, 0.34); border-color: rgba(112, 167, 255, 0.42); }
        }
        @keyframes zellu-load {
          0% { transform: translateX(-110%); }
          55% { transform: translateX(72%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </div>
  )
}

// ─── Auth guard ──────────────────────────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user)
  const initialized = useStore((s) => s.initialized)

  if (!initialized) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  if (!localStorage.getItem('zellu-onboarded')) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function AuthRoute() {
  const user = useStore((s) => s.user)
  const initialized = useStore((s) => s.initialized)

  if (!initialized) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return <AuthScreen />
}

function PremiumGuard({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user)
  const subscriptionReady = useStore((s) => s.subscriptionReady)

  if (!subscriptionReady) return <LoadingScreen />
  // Premium features are open while payment integration is pending
  return <>{children}</>
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const location = useLocation()

  const setUser = useStore((s) => s.setUser)
  const setVeiculos = useStore((s) => s.setVeiculos)
  const setLembretes = useStore((s) => s.setLembretes)
  const setAbastecimentos = useStore((s) => s.setAbastecimentos)
  const setInitialized = useStore((s) => s.setInitialized)
  const setSubscriptionReady = useStore((s) => s.setSubscriptionReady)
  const user = useStore((s) => s.user)
  const veiculos = useStore((s) => s.veiculos)
  const lembretes = useStore((s) => s.lembretes)

  // Hold Firestore unsub refs so we can clean up on sign-out or unmount
  const unsubVRef = useRef<(() => void) | null>(null)
  const unsubLRef = useRef<(() => void) | null>(null)
  const unsubARef = useRef<(() => void) | null>(null)

  // Track last-synced schedule per lembrete to avoid clearing sent markers unnecessarily
  const syncedScheduleRef = useRef<Map<string, string>>(new Map())

  function unsubAll() {
    unsubVRef.current?.()
    unsubLRef.current?.()
    unsubARef.current?.()
    unsubVRef.current = null
    unsubLRef.current = null
    unsubARef.current = null
  }

  useEffect(() => {
    const unsubAuth: AuthUnsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      // Always tear down previous Firestore listeners first
      unsubAll()

      if (firebaseUser) {
        const baseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          plano: 'FREE' as const,
        }
        setSubscriptionReady(false)

        if (import.meta.env.DEV) {
          setUser({ ...baseUser, plano: 'EMPRESARIAL' })
          setSubscriptionReady(true)
        } else {
          setUser(baseUser)
          void getSubscriptionStatus()
          .then((subscription) => {
            if (auth.currentUser?.uid === firebaseUser.uid) {
              setUser({ ...baseUser, plano: subscription.plan })
            }
          })
          .catch((error) => console.warn('Não foi possível consultar a assinatura:', error))
          .finally(() => {
            if (auth.currentUser?.uid === firebaseUser.uid) setSubscriptionReady(true)
          })
        }

        unsubVRef.current = subscribeVeiculos(firebaseUser.uid, setVeiculos)
        unsubLRef.current = subscribeLembretes(firebaseUser.uid, setLembretes)
        unsubARef.current = subscribeAbastecimentos(firebaseUser.uid, setAbastecimentos)

        // Se localStorage está vazio e há backup no Drive, oferece restauração
        if (!hasLocalData(firebaseUser.uid) && localStorage.getItem(DRIVE_BACKUP_KEY)) {
          setTimeout(() => {
            toast(
              (t) => (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">Nenhum dado local encontrado.</span>
                  <span className="text-xs text-[#8892a4]">Restaurar backup do Google Drive?</span>
                  <div className="flex gap-2 mt-1">
                    <button
                      className="flex-1 rounded-lg bg-[#4f8df7] py-1.5 text-xs font-semibold text-white"
                      onClick={async () => {
                        toast.dismiss(t.id)
                        try {
                          const token = await getDriveToken()
                          const payload = await downloadFromDrive(token)
                          applyBackupToLocalStorage(firebaseUser.uid, payload)
                          setVeiculos(payload.veiculos ?? [])
                          setLembretes(payload.lembretes ?? [])
                          setAbastecimentos(payload.abastecimentos ?? [])
                          recordBackupTimestamp()
                          toast.success('Dados restaurados do Drive!')
                        } catch (err: any) {
                          toast.error(err?.message ?? 'Erro ao restaurar.')
                        }
                      }}
                    >
                      Restaurar
                    </button>
                    <button
                      className="flex-1 rounded-lg border border-[#263650] py-1.5 text-xs text-[#8892a4]"
                      onClick={() => toast.dismiss(t.id)}
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              ),
              { duration: Infinity, icon: '☁️' },
            )
          }, 1500)
        }

        // Pede permissão de push na primeira vez (silencioso se já concedida)
        requestPushPermission(firebaseUser.uid)
      } else {
        setSubscriptionReady(false)
        setUser(null)
        setVeiculos([])
        setLembretes([])
        setAbastecimentos([])
      }

      setInitialized(true)
    })

    return () => {
      unsubAuth()
      unsubAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user || lembretes.length === 0) return

    lembretes
      .filter((lembrete) => !lembrete.concluido)
      .forEach((lembrete) => {
        const scheduleKey = `${lembrete.dataLimite}|${lembrete.horaAviso}|${lembrete.titulo}|${lembrete.veiculoId}`
        if (syncedScheduleRef.current.get(lembrete.id) === scheduleKey) return
        syncedScheduleRef.current.set(lembrete.id, scheduleKey)
        syncLembrete(
          user.uid,
          lembrete,
          veiculos.find((veiculo) => veiculo.id === lembrete.veiculoId),
        )
      })
  }, [user?.uid, veiculos, lembretes])

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/politica-de-privacidade" element={<PrivacyPolicyScreen />} />
          <Route path="/termos-de-uso" element={<TermsOfUseScreen />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <PrimaryVehicleScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/garagem"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <GaragemScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/veiculo/:id"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <VehicleDetailScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/veiculo/:id/lembrete/:reminderId"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <ReminderDetailScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/veiculo/:id/novo-aviso"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <ReminderCategoryScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/veiculo/:id/abastecimento"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <FuelScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/relatorio/:veiculoId"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <RelatorioScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/mecanico-virtual"
            element={
              <AuthGuard>
                <PremiumGuard>
                  <AppLayout>
                    <PageTransitionWrapper>
                      <MecanicoVirtualScreen />
                    </PageTransitionWrapper>
                  </AppLayout>
                </PremiumGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/guia-manutencao"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <GuiaManutencaoScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/perfil"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <ProfileScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/premium"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <PremiumScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/planos"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <PlansScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/premium/beneficios"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <PremiumBenefitsScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/premium/visao-geral"
            element={
              <AuthGuard>
                <PremiumGuard>
                  <AppLayout>
                    <PageTransitionWrapper>
                      <FleetOverviewScreen />
                    </PageTransitionWrapper>
                  </AppLayout>
                </PremiumGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/premium/custos"
            element={
              <AuthGuard>
                <PremiumGuard>
                  <AppLayout>
                    <PageTransitionWrapper>
                      <FleetCostsScreen />
                    </PageTransitionWrapper>
                  </AppLayout>
                </PremiumGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/premium/pneus"
            element={
              <AuthGuard>
                <PremiumGuard>
                  <AppLayout>
                    <PageTransitionWrapper>
                      <PneusScreen />
                    </PageTransitionWrapper>
                  </AppLayout>
                </PremiumGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/premium/pecas"
            element={
              <AuthGuard>
                <PremiumGuard>
                  <AppLayout>
                    <PageTransitionWrapper>
                      <PecasScreen />
                    </PageTransitionWrapper>
                  </AppLayout>
                </PremiumGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/premium/rotas"
            element={
              <AuthGuard>
                <PremiumGuard>
                  <AppLayout>
                    <PageTransitionWrapper>
                      <RotasScreen />
                    </PageTransitionWrapper>
                  </AppLayout>
                </PremiumGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/premium/estoque"
            element={
              <AuthGuard>
                <PremiumGuard>
                  <AppLayout>
                    <PageTransitionWrapper>
                      <EstoqueScreen />
                    </PageTransitionWrapper>
                  </AppLayout>
                </PremiumGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/premium/viagens"
            element={
              <AuthGuard>
                <PremiumGuard>
                  <AppLayout>
                    <PageTransitionWrapper>
                      <ViagensScreen />
                    </PageTransitionWrapper>
                  </AppLayout>
                </PremiumGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <SettingsScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/biblioteca"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <BibliotecaScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}

// ─── Page transition wrapper ─────────────────────────────────────────────────

function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  )
}
