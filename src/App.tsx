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
const ProfileScreen = lazy(() => import('@/screens/ProfileScreen'))
const SettingsScreen = lazy(() => import('@/screens/SettingsScreen'))
const BibliotecaScreen = lazy(() => import('@/screens/BibliotecaScreen'))
const PrivacyPolicyScreen = lazy(() => import('@/screens/PrivacyPolicyScreen'))
const TermsOfUseScreen = lazy(() => import('@/screens/TermsOfUseScreen'))
const PremiumScreen = lazy(() => import('@/screens/PremiumScreen'))
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
    <div className="fixed inset-0 bg-[#070c14] flex flex-col items-center justify-center gap-4">
      {/* Spinning gradient circle */}
      <div className="relative w-16 h-16">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[#4f8df7] to-[#60a5fa] opacity-20"
        />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            background:
              'linear-gradient(#070c14, #070c14) padding-box, linear-gradient(135deg, #4f8df7, #60a5fa) border-box',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div
          className="absolute inset-1 rounded-full bg-gradient-to-br from-[#4f8df7] to-[#60a5fa]"
          style={{ opacity: 0.15 }}
        />
      </div>

      {/* Zellu wordmark */}
      <span
        className="text-2xl font-bold tracking-tight"
        style={{
          background: 'linear-gradient(135deg, #4f8df7, #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Zellu
      </span>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Auth guard ──────────────────────────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user)
  const initialized = useStore((s) => s.initialized)

  if (!initialized) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
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
  if (user?.plano !== 'FROTA') return <Navigate to="/premium" replace />
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
        setUser(baseUser)
        setSubscriptionReady(false)

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

        unsubVRef.current = subscribeVeiculos(firebaseUser.uid, setVeiculos)
        unsubLRef.current = subscribeLembretes(firebaseUser.uid, setLembretes)
        unsubARef.current = subscribeAbastecimentos(firebaseUser.uid, setAbastecimentos)
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
          <Route
            path="/politica-de-privacidade"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <PrivacyPolicyScreen />
                  </PageTransitionWrapper>
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/termos-de-uso"
            element={
              <AuthGuard>
                <AppLayout>
                  <PageTransitionWrapper>
                    <TermsOfUseScreen />
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
