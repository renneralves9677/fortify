export type LegalSection = { title: string; paragraphs: string[] };

export const termsSections: LegalSection[] = [
  {
    title: 'Controlador',
    paragraphs: [
      'O controlador dos dados pessoais tratados nesta plataforma é a empresa contratante do serviço Fortify, na qualidade de operador de negócios, e a Fortify como fornecedora da solução tecnológica.',
      'Para questões sobre privacidade, utilize o contato do Encarregado (DPO) indicado na Política de Privacidade.',
    ],
  },
  {
    title: 'Aceitação',
    paragraphs: [
      'Ao acessar ou utilizar o Fortify, você declara ter lido, compreendido e aceito estes Termos de Uso e a Política de Privacidade vigentes.',
      'Se não concordar, não utilize o serviço.',
    ],
  },
  {
    title: 'Uso do serviço',
    paragraphs: [
      'O Fortify é uma plataforma SaaS multi-tenant para gestão de contratos, assinaturas, obras e ordens de compra.',
      'O usuário é responsável pela veracidade dos dados inseridos e pelo uso adequado das credenciais de acesso.',
      'É proibido utilizar o sistema para fins ilícitos ou em violação à legislação aplicável.',
    ],
  },
  {
    title: 'Responsabilidades',
    paragraphs: [
      'A Fortify envidará esforços razoáveis para manter a disponibilidade e segurança da plataforma, sem garantia de operação ininterrupta.',
      'Conteúdos jurídicos de contratos gerados pelos usuários são de responsabilidade da empresa contratante; recomenda-se revisão por assessoria jurídica.',
    ],
  },
];

export const privacySections: LegalSection[] = [
  {
    title: 'Controlador e DPO',
    paragraphs: [
      'O controlador dos dados é a empresa cliente do Fortify. O Encarregado de Proteção de Dados (DPO) pode ser contactado pelo e-mail informado nas configurações do sistema ou no centro de privacidade.',
    ],
  },
  {
    title: 'Finalidade do tratamento',
    paragraphs: [
      'Tratamos dados pessoais para autenticação, gestão de contratos e obras, assinaturas eletrônicas, auditoria de ações e suporte ao titular.',
    ],
  },
  {
    title: 'Bases legais (Art. 7 LGPD)',
    paragraphs: [
      'Execução de contrato ou procedimentos preliminares (Art. 7, V).',
      'Cumprimento de obrigação legal ou regulatória (Art. 7, II), quando aplicável.',
      'Consentimento do titular para aceite de termos e política (Art. 7, I).',
      'Legítimo interesse para segurança, prevenção a fraudes e melhoria do serviço (Art. 7, IX), observados os direitos do titular.',
    ],
  },
  {
    title: 'Direitos do titular (Art. 18)',
    paragraphs: [
      'Confirmação da existência de tratamento, acesso, correção, portabilidade, eliminação e revogação do consentimento, nos termos da LGPD.',
      'No Fortify, o titular pode acessar o centro de privacidade em Configurações e exportar seus dados em JSON.',
    ],
  },
  {
    title: 'Retenção',
    paragraphs: [
      'Dados são mantidos enquanto durar a relação contratual e conforme prazos legais aplicáveis. Logs de auditoria podem ser retidos por período adicional para segurança e compliance.',
    ],
  },
  {
    title: 'Compartilhamento',
    paragraphs: [
      'Dados podem ser processados por provedores de infraestrutura (ex.: hospedagem, banco de dados) sob contratos e medidas de segurança adequadas.',
      'Não vendemos dados pessoais a terceiros.',
    ],
  },
];
