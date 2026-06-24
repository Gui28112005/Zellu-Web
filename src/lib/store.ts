import { create } from 'zustand'
import type { AppUser, Veiculo, Lembrete, Abastecimento } from '@/lib/types'

interface AppStore {
  // Auth
  user: AppUser | null
  setUser: (u: AppUser | null) => void

  // Veículos
  veiculos: Veiculo[]
  setVeiculos: (v: Veiculo[]) => void
  addVeiculo: (v: Veiculo) => void
  updateVeiculoLocal: (v: Veiculo) => void
  removeVeiculoLocal: (id: string) => void

  // Veículo ativo
  veiculoAtivo: Veiculo | null
  setVeiculoAtivo: (v: Veiculo | null) => void

  // Lembretes
  lembretes: Lembrete[]
  setLembretes: (l: Lembrete[]) => void
  addLembreteLocal: (l: Lembrete) => void
  updateLembreteLocal: (l: Lembrete) => void
  removeLembreteLocal: (id: string) => void

  // Abastecimentos
  abastecimentos: Abastecimento[]
  setAbastecimentos: (a: Abastecimento[]) => void
  addAbastecimentoLocal: (a: Abastecimento) => void

  // UI state
  loading: boolean
  setLoading: (l: boolean) => void

  initialized: boolean
  setInitialized: (i: boolean) => void

  subscriptionReady: boolean
  setSubscriptionReady: (ready: boolean) => void
}

export const useStore = create<AppStore>((set) => ({
  // Auth
  user: null,
  setUser: (u) => set({ user: u }),

  // Veículos
  veiculos: [],
  setVeiculos: (v) => set({ veiculos: v }),
  addVeiculo: (v) => set((s) => ({ veiculos: [v, ...s.veiculos] })),
  updateVeiculoLocal: (v) =>
    set((s) => ({
      veiculos: s.veiculos.map((x) => (x.id === v.id ? v : x)),
      veiculoAtivo: s.veiculoAtivo?.id === v.id ? v : s.veiculoAtivo,
    })),
  removeVeiculoLocal: (id) =>
    set((s) => ({
      veiculos: s.veiculos.filter((x) => x.id !== id),
      veiculoAtivo: s.veiculoAtivo?.id === id ? null : s.veiculoAtivo,
    })),

  // Veículo ativo
  veiculoAtivo: null,
  setVeiculoAtivo: (v) => set({ veiculoAtivo: v }),

  // Lembretes
  lembretes: [],
  setLembretes: (l) => set({ lembretes: l }),
  addLembreteLocal: (l) => set((s) => ({ lembretes: [l, ...s.lembretes] })),
  updateLembreteLocal: (l) =>
    set((s) => ({
      lembretes: s.lembretes.map((x) => (x.id === l.id ? l : x)),
    })),
  removeLembreteLocal: (id) =>
    set((s) => ({
      lembretes: s.lembretes.filter((x) => x.id !== id),
    })),

  // Abastecimentos
  abastecimentos: [],
  setAbastecimentos: (a) => set({ abastecimentos: a }),
  addAbastecimentoLocal: (a) =>
    set((s) => ({ abastecimentos: [a, ...s.abastecimentos] })),

  // UI
  loading: false,
  setLoading: (l) => set({ loading: l }),

  initialized: false,
  setInitialized: (i) => set({ initialized: i }),

  subscriptionReady: false,
  setSubscriptionReady: (ready) => set({ subscriptionReady: ready }),
}))
