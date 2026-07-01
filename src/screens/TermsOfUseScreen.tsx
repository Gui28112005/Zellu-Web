import { ScrollText } from 'lucide-react'
import { LegalDocument, type LegalSection } from '@/components/legal/LegalDocument'

export const termsOfUseSections: LegalSection[] = [
  {
    title: 'Aceitação dos termos',
    paragraphs: [
      'Ao acessar ou usar o Zellu, você declara que leu e concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize o aplicativo.',
    ],
  },
  {
    title: 'O que o Zellu oferece',
    paragraphs: [
      'O Zellu ajuda a organizar informações do veículo, lembretes, registros de serviços, abastecimentos, relatórios e recursos de assistência digital. As funcionalidades podem evoluir ao longo do tempo.',
    ],
  },
  {
    title: 'Sua conta e seus dados',
    paragraphs: [
      'Você é responsável por manter seus dados corretos, proteger o acesso à conta e pelas atividades realizadas nela. Avise pelos canais oficiais se perceber uso não autorizado.',
      'Algumas informações podem ficar somente no aparelho ou navegador. Faça os registros com atenção, pois limpar os dados do aplicativo ou desinstalá-lo pode remover conteúdo não sincronizado.',
    ],
  },
  {
    title: 'Lembretes e calendário',
    paragraphs: [
      'Lembretes, datas e a abertura do calendário são ferramentas de organização. O Zellu não garante que alertas sejam entregues em um horário específico, pois isso também depende das permissões, do sistema operacional, da internet e das configurações do aparelho.',
      'Você continua responsável por acompanhar prazos de manutenção, documentos, seguros e demais obrigações do veículo.',
    ],
  },
  {
    title: 'Assistência digital',
    paragraphs: [
      'Respostas geradas por recursos de inteligência artificial são informativas e podem conter imprecisões. Elas não substituem diagnóstico, orçamento ou serviço de um mecânico qualificado, nem orientações de fabricantes ou autoridades.',
    ],
  },
  {
    title: 'Uso permitido',
    paragraphs: ['Você concorda em não:'],
    items: [
      'Usar o aplicativo para atividades ilegais, fraudulentas ou que prejudiquem terceiros.',
      'Tentar acessar contas, sistemas ou dados sem autorização.',
      'Interferir no funcionamento, na segurança ou na disponibilidade do Zellu.',
      'Copiar, explorar ou distribuir partes do aplicativo em desacordo com a legislação.',
    ],
  },
  {
    title: 'Disponibilidade e responsabilidade',
    paragraphs: [
      'Buscamos manter o Zellu disponível e confiável, mas podem ocorrer interrupções, manutenção ou falhas de serviços externos. Recursos também podem ser alterados ou descontinuados quando necessário.',
      'Na medida permitida pela lei, o Zellu não se responsabiliza por decisões tomadas exclusivamente com base no aplicativo, perda de dados armazenados apenas no dispositivo ou prejuízos causados por informações inseridas incorretamente pelo usuário.',
    ],
  },
  {
    title: 'Propriedade intelectual',
    paragraphs: [
      'A marca, o visual, o código e os conteúdos próprios do Zellu são protegidos pela legislação aplicável. O uso do aplicativo não transfere a você qualquer direito de propriedade sobre esses elementos.',
    ],
  },
  {
    title: 'Encerramento e atualizações',
    paragraphs: [
      'Você pode deixar de usar o aplicativo e solicitar a exclusão da conta pelos canais oficiais disponíveis. Podemos restringir acessos usados de forma ilegal, abusiva ou contrária a estes termos.',
      'Estes termos podem ser atualizados para acompanhar mudanças no serviço ou na legislação. A versão vigente e sua data ficarão disponíveis nesta tela. Aplica-se a legislação brasileira.',
    ],
  },
  {
    title: 'Contato',
    paragraphs: [
      'Se tiver dúvidas sobre estes termos, entre em contato pelos canais oficiais disponibilizados no aplicativo.',
    ],
  },
]

export default function TermsOfUseScreen() {
  return (
    <LegalDocument
      eyebrow="Regras do Zellu"
      title="Termos de Uso"
      description="Um resumo claro das regras para usar o Zellu com segurança e entender os limites de cada recurso."
      icon={ScrollText}
      sections={termsOfUseSections}
    />
  )
}
