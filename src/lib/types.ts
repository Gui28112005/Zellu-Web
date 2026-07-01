export type TipoVeiculo =
  | 'BICICLETA'
  | 'BIKE_ELETRICA'
  | 'VEICULO_ELETRICO'
  | 'CARRETINHA'
  | 'CARRO'
  | 'HATCH'
  | 'MOTO'
  | 'CAMINHONETE'
  | 'FURGAO'
  | 'CAMINHAO'
  | 'ONIBUS'
  | 'SUV'
  | 'VAN'
  | 'MOTORHOME'
  | 'TRATOR'

export type TipoManutencao =
  | 'CORRENTE'
  | 'LUBRIFICACAO'
  | 'PEDIVELA'
  | 'ACESSORIOS'
  | 'CONFORTO'
  | 'PNEU'
  | 'TRANSMISSAO'
  | 'REVISAO'
  | 'OLEO'
  | 'LAVAGEM'
  | 'ABASTECIMENTO'
  | 'BATERIA'
  | 'VIDROS'
  | 'MECANICA'
  | 'FUNILARIA'
  | 'FREIO'
  | 'LICENCIAMENTO'
  | 'IPVA'
  | 'SEGURO'
  | 'OUTROS'

export type PlanoTier = 'FREE' | 'LITE' | 'FROTA' | 'EMPRESARIAL'

export interface Veiculo {
  id: string
  nome: string
  modelo: string
  marca: string
  ano?: string
  proprietario: string
  cor: string
  kmAtual: number
  semControleKm: boolean
  tipoVeiculo: TipoVeiculo
  vezesBatido?: string
  tempoComVeiculo?: string
  fipeCodMarca?: string
  fipeCodModelo?: string
  fipeCodAno?: string
  userId: string
  criadoEm: number
}

export interface Lembrete {
  id: string
  veiculoId: string
  titulo: string
  peca: string
  dataLimite: string
  kmLimite: string
  tipo: TipoManutencao
  valor: number
  horaAviso: string
  estabelecimentoNome: string
  estabelecimentoTelefone?: string
  concluido: boolean
  concluidoEm?: number
  userId: string
  criadoEm: number
}

export interface Abastecimento {
  id: string
  veiculoId: string
  data: string
  precoLitro: number
  valorPago: number
  litros: number
  tipoCombustivel: 'GASOLINA' | 'ETANOL' | 'DIESEL' | 'FLEX' | 'ELETRICO' | 'GNV'
  km?: number
  userId: string
  criadoEm: number
}

export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  plano: PlanoTier
}

export interface MensagemAI {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type PosicaoPneu = 'DD' | 'DE' | 'TD' | 'TE' | 'ESTEPE'

export interface RegistroPneu {
  id: string
  veiculoId: string
  posicao: PosicaoPneu
  marca: string
  modelo: string
  kmInstalado: number
  kmVidaUtil: number
  kmFinal?: number
  custo?: number
  dataInstalacao: string
  dataRemocao?: string
  userId: string
  criadoEm: number
}

export interface RegistroPeca {
  id: string
  veiculoId: string
  nome: string
  marca: string
  kmInstalado: number
  kmVidaUtil: number
  dataInstalacao: string
  userId: string
  criadoEm: number
}

export interface RegistroRota {
  id: string
  nome: string
  origem: string
  destino: string
  distanciaKm: number
  custoTotal: number
  receitaTotal: number
  motorista: string
  data: string
  veiculoId?: string
  userId: string
  criadoEm: number
}

export interface ItemEstoque {
  id: string
  nome: string
  categoria: string
  quantidade: number
  quantidadeMinima: number
  precoUnitario: number
  codigoBarras?: string
  userId: string
  criadoEm: number
}

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE'

export interface MovimentacaoEstoque {
  id: string
  itemId: string
  itemNome: string
  tipo: TipoMovimentacao
  quantidade: number
  detalhes?: string
  criadoEm: number
}

export type CategoriaEstoque =
  | 'combustivel'
  | 'oleo_lubrificantes'
  | 'consumiveis'
  | 'limpeza'
  | 'epi_seguranca'
  | 'outros'

export type CategoriaGasto = 'combustivel' | 'pedagio' | 'estacionamento' | 'alimentacao' | 'outros'

export interface GastoViagem {
  id: string
  categoria: CategoriaGasto
  descricao: string
  valor: number
  notaImagem?: string
  notaNome?: string
  criadoEm: number
}

export interface RegistroViagem {
  id: string
  veiculoId: string
  nome?: string
  data?: string
  dataInicio?: string
  dataFim?: string
  origem: string
  destino: string
  distanciaKm: number
  responsavel?: string
  acompanhantes?: string
  kmSaida?: number
  kmFinal?: number
  finalizada?: boolean
  finalidade?: string
  gastos: GastoViagem[]
  userId: string
  criadoEm: number
}
