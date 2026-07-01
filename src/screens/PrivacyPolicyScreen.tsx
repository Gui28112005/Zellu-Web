import { ShieldCheck } from 'lucide-react'
import { LegalDocument, type LegalSection } from '@/components/legal/LegalDocument'

export const privacyPolicySections: LegalSection[] = [
  {
    title: 'Quem somos e escopo',
    paragraphs: [
      'O Zellu é um aplicativo para gestão de veículos, viagens, manutenção, lembretes, recursos de inteligência artificial e recursos relacionados, incluindo módulos Premium, como gestão de frota e estoque. Esta política vale para o uso do app, páginas oficiais e solicitações de suporte ou privacidade.',
    ],
  },
  {
    title: 'Dados que tratamos',
    paragraphs: [],
    items: [
      'Conta e autenticação: nome, e-mail, identificadores de usuário e dados técnicos de login.',
      'Dados de uso: veículos, lembretes, despesas, histórico de manutenção, viagens, itens de estoque, contatos vinculados, preferências e interações com recursos inteligentes ou IA.',
      'Permissões sensíveis, somente com consentimento: notificações para lembretes, vencimentos e avisos importantes.',
      'Dados técnicos: versão do app, dispositivo, logs essenciais de operação e segurança.',
    ],
  },
  {
    title: 'Finalidades e bases legais (LGPD)',
    paragraphs: [],
    items: [
      'Execução do contrato e prestação das funcionalidades do app.',
      'Cumprimento de obrigação legal ou regulatória, quando aplicável.',
      'Exercício regular de direitos em processos e prevenção a fraude ou abuso.',
      'Consentimento do titular para permissões e recursos específicos.',
      'Legítimo interesse para segurança, estabilidade e melhoria do serviço, respeitando os direitos fundamentais do usuário.',
    ],
  },
  {
    title: 'Como usamos os dados',
    paragraphs: [],
    items: [
      'Autenticação e gerenciamento de conta.',
      'Execução dos recursos de lembretes, histórico, viagens, frota e estoque.',
      'Execução de recursos inteligentes, como assistente de garagem, interpretação de perguntas, sugestões, criação assistida de avisos e registros e leitura de dados já cadastrados.',
      'Sincronização e recuperação de informações quando o recurso estiver habilitado.',
      'Segurança, conformidade e prevenção de fraude.',
      'Atendimento de suporte e tratamento de solicitações do titular.',
    ],
  },
  {
    title: 'Recursos de inteligência artificial',
    paragraphs: [],
    items: [
      'O assistente de IA pode usar dados cadastrados no app, como veículos, avisos, registros, abastecimentos e mensagens enviadas no chat, para responder perguntas e preparar ações solicitadas pelo usuário.',
      'Sempre que possível, o processamento pode ocorrer no próprio app. Quando recursos online estiverem habilitados, parte do conteúdo necessário poderá ser processada por provedores técnicos de infraestrutura ou inteligência artificial contratados para executar a funcionalidade.',
      'As respostas da IA são apoio informativo e podem conter erros. O usuário deve conferir os dados antes de agir, salvar registros, criar avisos ou tomar decisões de manutenção e segurança.',
      'Não utilizamos dados pessoais para venda. O tratamento segue as finalidades descritas nesta política e os princípios de minimização, necessidade e segurança.',
    ],
  },
  {
    title: 'Compartilhamento de dados',
    paragraphs: [
      'Não comercializamos dados pessoais. O compartilhamento ocorre apenas quando necessário para a operação do serviço, com operadores e provedores de tecnologia, como autenticação, infraestrutura, armazenamento, mensageria e backup, observando minimização, finalidade e segurança.',
      'Quando recursos de IA online estiverem habilitados, provedores técnicos de inteligência artificial e infraestrutura também poderão atuar como operadores para processar somente o conteúdo necessário à execução da funcionalidade.',
      'Também poderemos compartilhar dados mediante obrigação legal, ordem judicial ou requisição de autoridade competente.',
    ],
  },
  {
    title: 'Armazenamento, retenção e segurança',
    paragraphs: [],
    items: [
      'Parte dos dados é armazenada localmente no dispositivo e parte em serviços de nuvem necessários à conta ou sincronização.',
      'Aplicamos medidas técnicas e administrativas razoáveis de segurança, incluindo controle de acesso, revisão de permissões e proteção de credenciais.',
      'Os dados são retidos pelo tempo necessário para cumprir as finalidades desta política e obrigações legais ou regulatórias.',
    ],
  },
  {
    title: 'Direitos do titular',
    paragraphs: [
      'Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, quando aplicável, revogação de consentimento e exclusão de dados, respeitadas as hipóteses legais de retenção.',
      'Para exclusão de conta e dados, consulte:',
    ],
    links: [
      {
        label: 'zellu-privacidade.vercel.app',
        href: 'https://zellu-privacidade.vercel.app',
      },
    ],
  },
  {
    title: 'Crianças e adolescentes',
    paragraphs: [
      'O app não é direcionado intencionalmente a crianças sem supervisão dos responsáveis. Caso identifiquemos tratamento indevido de dados de menores em desacordo com a legislação, adotaremos medidas para correção e remoção.',
    ],
  },
  {
    title: 'Transferência internacional',
    paragraphs: [
      'Alguns provedores podem processar dados fora do Brasil. Quando isso ocorrer, adotamos salvaguardas contratuais e técnicas compatíveis com a LGPD e com padrões adequados de proteção.',
    ],
  },
  {
    title: 'Alterações desta política',
    paragraphs: [
      'Esta política pode ser atualizada periodicamente para refletir a evolução do app, requisitos legais e melhorias de segurança. A versão mais recente estará sempre publicada nesta página.',
    ],
  },
  {
    title: 'Contato de privacidade',
    paragraphs: [
      'E-mail para dúvidas e solicitações de privacidade:',
      'Este é o canal para solicitação de direitos do titular, exclusão de conta e dados e incidentes relacionados à privacidade.',
    ],
    links: [
      {
        label: 'guilhermedevsistemas@gmail.com',
        href: 'mailto:guilhermedevsistemas@gmail.com',
      },
    ],
  },
]

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument
      eyebrow="Zellu · Documento oficial"
      title="Política de Privacidade"
      description="Esta política descreve como o Zellu trata dados pessoais no app e em serviços relacionados, em conformidade com a LGPD (Lei 13.709/2018)."
      icon={ShieldCheck}
      sections={privacyPolicySections}
      updatedAt="12 de junho de 2026"
    />
  )
}
