import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { auth } from '@/lib/firebase'
import { useStore } from '@/lib/store'

const safeAreaStyle = {
  paddingTop: 'calc(env(safe-area-inset-top) + 48px)',
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 48px)',
}

const gridStyle = {
  backgroundImage:
    'linear-gradient(rgba(96, 165, 250, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(96, 165, 250, 0.055) 1px, transparent 1px)',
  backgroundSize: '42px 42px',
  maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
}

function mapFirebaseError(code: string): string {
  const messages: Record<string, string> = {
    'auth/account-exists-with-different-credential': 'Este e-mail já está vinculado a outra forma de acesso',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/network-request-failed': 'Confira sua conexão e tente novamente',
    'auth/unauthorized-domain': 'Este domínio ainda não está autorizado no Firebase Authentication',
    'auth/operation-not-supported-in-this-environment': 'Este navegador não aceitou o login por janela. Tente novamente',
  }

  return messages[code] ?? 'Não foi possível entrar com o Google. Tente novamente'
}

function GoogleButton() {
  const navigate = useNavigate()
  const user = useStore((state) => state.user)
  const setUser = useStore((state) => state.setUser)
  const [loading, setLoading] = useState(false)

  function finishLogin(user: User) {
    setUser({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      plano: 'FREE',
    })

    toast.success('Bem-vindo!')
    navigate('/', { replace: true })
  }

  useEffect(() => {
    let cancelled = false

    if (user) {
      navigate('/', { replace: true })
      return
    }

    setPersistence(auth, browserLocalPersistence)
      .catch(() => undefined)
      .then(() => getRedirectResult(auth))
      .then((credential) => {
        if (cancelled) return
        const redirectUser = credential?.user ?? auth.currentUser
        if (redirectUser) finishLogin(redirectUser)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const code = (error as { code?: string }).code ?? ''
        if (code !== 'auth/popup-closed-by-user') toast.error(mapFirebaseError(code))
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate])

  function shouldFallbackToRedirect(code: string) {
    return [
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ].includes(code)
  }

  async function handleGoogleSignIn() {
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await setPersistence(auth, browserLocalPersistence)

      const credential = await signInWithPopup(auth, provider)
      finishLogin(credential.user)
    } catch (error: unknown) {
      const code = (error as { code?: string }).code ?? ''

      if (shouldFallbackToRedirect(code)) {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        await signInWithRedirect(auth, provider)
        return
      }

      if (code !== 'auth/popup-closed-by-user') {
        toast.error(mapFirebaseError(code))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 text-sm font-medium text-[#172033] shadow-lg shadow-black/15 transition-all duration-150 hover:bg-[#f4f7fb] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-[#172033]/20 border-t-[#172033]"
        />
      ) : (
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
        </svg>
      )}
      <span>{loading ? 'Conectando...' : 'Continuar com Google'}</span>
    </button>
  )
}

export default function AuthScreen() {
  return (
    <motion.main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_15%,#102d62_0%,#09162e_34%,#070c14_70%)] px-6 py-12"
      style={safeAreaStyle}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.25 }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={gridStyle} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 top-[12%] h-72 w-72 rounded-full bg-[#146cff]/20 blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-[8%] h-80 w-80 rounded-full bg-[#22d3ee]/10 blur-[100px]"
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <motion.div
          className="relative"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src="/pwa-192x192.png"
            alt="Logo Zellu"
            width="192"
            height="192"
            className="relative h-36 w-36 rounded-[30px] border border-[#7dd3fc]/25 object-cover sm:h-40 sm:w-40"
          />
        </motion.div>

        <h1 className="mt-7 bg-gradient-to-r from-[#8bc5ff] via-white to-[#63b3ff] bg-clip-text text-5xl font-normal tracking-tight text-transparent">
          Zellu
        </h1>
        <p className="mt-3 text-sm tracking-wide text-[#9db0cc]">Gestão veicular inteligente</p>

        <div className="mt-11 w-full rounded-[20px] border border-white/10 bg-white/[0.035] p-1.5 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <GoogleButton />
        </div>

        <p className="mt-5 max-w-xs text-center text-xs leading-5 text-[#66738a]">
          Use sua conta Google para entrar ou criar sua conta com segurança.
        </p>
      </div>
    </motion.main>
  )
}
