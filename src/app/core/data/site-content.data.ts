export interface FaqItem {
  question: string;
  answer: string;
}

export interface ProjectItem {
  slug: 'fluxo' | 'nokta';
  title: string;
  category: string;
  year: string;
  service: string;
  model: string;
  overview: string;
  thumbnail: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'O que exatamente a NIZ TECH automatiza?',
    answer:
      'A NIZ automatiza tarefas operacionais, administrativas e de atendimento, além de integrar fluxos de dados entre sistemas. Desde respostas automáticas e análise de documentos até gestão financeira e relatórios inteligentes.',
  },
  {
    question: 'É necessário conhecimento técnico para usar a plataforma?',
    answer:
      'Não. Nosso painel é intuitivo e pensado para equipes sem background técnico. Em poucos cliques, é possível criar fluxos automáticos e acompanhar resultados em tempo real.',
  },
  {
    question: 'A NIZ TECH substitui funcionários humanos?',
    answer:
      'De forma alguma. Nossa IA foi criada para aumentar a produtividade das equipes, não substituí-las. Ela cuida do operacional para que sua equipe foque no que realmente importa: estratégia e crescimento.',
  },
  {
    question: 'Como a NIZ TECH se adapta a empresas de médio porte?',
    answer:
      'A plataforma é escalável — pode começar com automações simples e crescer conforme a demanda. É possível conectar setores como financeiro, comercial, jurídico e marketing em um único ecossistema.',
  },
  {
    question: 'A IA da NIZ TECH é treinada com dados da minha empresa?',
    answer:
      'Sim, mas de forma segura e controlada. Utilizamos seus dados apenas para treinar fluxos internos e melhorar a precisão dos resultados, sempre respeitando a LGPD e políticas de privacidade.',
  },
  {
    question: 'Quanto tempo leva para implementar a automação?',
    answer:
      'Depende do nível de complexidade do projeto. Em média, clientes de porte médio começam a ver resultados entre 7 e 15 dias após a configuração inicial.',
  },
];

export const PROJECTS_DATA: Record<'fluxo' | 'nokta', ProjectItem> = {
  fluxo: {
    slug: 'fluxo',
    title: 'Fluxo',
    category: 'Fisioterapia',
    year: '2026',
    service: 'Aplicação de gerencia de Consultório de Fisioterapia',
    model: 'Web App',
    overview:
      'Fluxo é um prontuário clínico feito para a rotina do fisioterapeuta: ficha do paciente, sessões, evolução e acompanhamento visual em um só lugar. O projeto une clareza clínica e uso rápido no consultório, com identidade visual limpa e foco no que importa no atendimento — sem ruído, sem planilhas paralelas.',
    thumbnail: '/assets/images/image-98f894cf.png',
  },
  nokta: {
    slug: 'nokta',
    title: 'NOKTA',
    category: 'Jogos',
    year: '2026',
    service: 'Assistente Partidas de valorant',
    model: 'Web App',
    overview:
      'Plataforma e assistente inteligente voltado para jogadores de Valorant, integrando análise de desempenho e acompanhamento tático em tempo real.',
    thumbnail: '/assets/images/image-5efd1e2a.png',
  },
};

export const AI_TYPING_PROMPTS: string[] = [
  'Gerar relatório diário de vendas e enviar no WhatsApp...',
  'Qualificar leads recebidos no CRM automaticamente...',
  'Sincronizar notas fiscais com o painel financeiro...',
  'Agendar reunião automática com clientes prioritários...',
];
