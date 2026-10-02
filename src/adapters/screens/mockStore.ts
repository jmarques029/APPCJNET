/**
 * mockStore.ts
 * ------------
 * Repositório compartilhado em memória para execução e testes interativos
 * das telas de interface do App CJnet (AssinaturaScreen, AtividadesFormScreen,
 * HistoricoRelatoriosScreen e LoginScreen).
 */

import { FakeOrdemServicoRepository } from '@/infra/fakes/FakeOrdemServicoRepository';
import { FakePlanoRepository } from '@/infra/fakes/FakePlanoRepository';
import { FakeClienteRepository } from '@/infra/fakes/FakeClienteRepository';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { Cliente } from '@/domain/entities/Cliente';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { Email } from '@/domain/value-objects/Email';
import { Preco } from '@/domain/value-objects/Preco';
import { StatusOS } from '@/domain/value-objects/StatusOS';
import { TipoProblema } from '@/domain/value-objects/TipoProblema';

// Instâncias compartilhadas
export const sharedPlanoRepo = new FakePlanoRepository();
export const sharedOsRepo = new FakeOrdemServicoRepository();
export const sharedClienteRepo = new FakeClienteRepository();

export const DEMO_CLIENTE_ID = 'cli-cjnet-01';
export const DEMO_CLIENTE_NOME = 'Carlos Eduardo Silva';
export const DEMO_CLIENTE_EMAIL = 'carlos.silva@cjnet.com.br';

let seeded = false;

export function initializeSharedStore(): void {
  if (seeded) return;
  seeded = true;

  // 1. Clientes e Usuários do Sistema
  const cliente = new Cliente({
    id: DEMO_CLIENTE_ID,
    authUserId: 'auth-demo-01',
    nome: DEMO_CLIENTE_NOME,
    cpfCnpj: new CpfCnpj('52998224725'),
    email: new Email(DEMO_CLIENTE_EMAIL),
    telefone: '35998765432',
    papel: 'CLIENTE',
  });
  sharedClienteRepo.salvar(cliente);

  // Cliente 2 (Maria Fernandes) - usado para validar que o cliente só enxerga as suas próprias OSs
  const cliente2 = new Cliente({
    id: 'cli-maria-02',
    authUserId: 'auth-demo-02',
    nome: 'Maria Fernandes',
    cpfCnpj: new CpfCnpj('52998224725'),
    email: new Email('maria.fernandes@cjnet.com.br'),
    telefone: '35997654321',
    papel: 'CLIENTE',
  });
  sharedClienteRepo.salvar(cliente2);

  // Técnico de Campo (João Santos)
  const tecnico = new Cliente({
    id: 'tec-joao-01',
    authUserId: 'auth-tec-01',
    nome: 'João Santos',
    cpfCnpj: new CpfCnpj('52998224725'),
    email: new Email('tecnico@cjnet.com.br'),
    telefone: '35998112233',
    papel: 'TECNICO',
  });
  sharedClienteRepo.salvar(tecnico);

  // Administrador Geral (Empresa CJnet)
  const admin = new Cliente({
    id: 'adm-01',
    authUserId: 'auth-adm-01',
    nome: 'Gerência CJnet',
    cpfCnpj: new CpfCnpj('11222333000181'),
    email: new Email('admin@cjnet.com.br'),
    telefone: '3538551234',
    papel: 'ADMIN',
  });
  sharedClienteRepo.salvar(admin);

  // 2. Planos de Fibra Óptica CJnet (Coqueiral/MG)
  const planos = [
    new PlanoInternet({
      id: 'plano-200',
      nome: 'CJnet Fibra 200 Mega',
      velocidadeMbps: 200,
      precoMensal: Preco.fromReais(89.9),
      beneficios: [
        '100% Fibra Óptica até o roteador',
        'Roteador Wi-Fi Dual Band incluso',
        'Instalação 100% Gratuita',
        'Suporte Técnico Local Coqueiral',
      ],
      destaque: false,
      ativo: true,
    }),
    new PlanoInternet({
      id: 'plano-400',
      nome: 'CJnet Fibra 400 Mega Ultra',
      velocidadeMbps: 400,
      precoMensal: Preco.fromReais(109.9),
      beneficios: [
        'Wi-Fi 6 de Última Geração comodato',
        'Instalação Express Gratuita',
        'Prioridade no Atendimento e Suporte',
        'Ideal para Streaming 4K e Home Office',
      ],
      destaque: true,
      ativo: true,
    }),
    new PlanoInternet({
      id: 'plano-600',
      nome: 'CJnet Fibra 600 Mega Gamer',
      velocidadeMbps: 600,
      precoMensal: Preco.fromReais(139.9),
      beneficios: [
        'Baixíssima latência (Ping Reduzido)',
        'Wi-Fi 6 Gamer Alta Performance',
        'Upload Turbinado (50% do download)',
        'Suporte Prioritário CJnet VIP',
      ],
      destaque: false,
      ativo: true,
    }),
    new PlanoInternet({
      id: 'plano-1000',
      nome: 'CJnet Fibra 1 Giga Dedicado',
      velocidadeMbps: 1000,
      precoMensal: Preco.fromReais(189.9),
      beneficios: [
        'Velocidade Máxima Gigabits',
        '2 Roteadores Wi-Fi Mesh Inclusos',
        'IP Fixo sob demanda',
        'Gerente de Contas Dedicado',
      ],
      destaque: false,
      ativo: true,
    }),
  ];

  for (const plano of planos) {
    sharedPlanoRepo.salvar(plano);
  }

  // 3. Ordens de Serviço (Chamados) Iniciais para Histórico e Relatórios
  const os1 = new OrdemServico({
    idLocal: 'OS-1001',
    clienteId: DEMO_CLIENTE_ID,
    tipoProblema: TipoProblema.SEM_SINAL,
    descricao: 'Sem conexão de internet na sala. Luz PON da ONU piscando em vermelho.',
    status: StatusOS.PENDENTE,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 horas atrás
  });

  const os2 = new OrdemServico({
    idLocal: 'OS-1002',
    clienteId: DEMO_CLIENTE_ID,
    tipoProblema: TipoProblema.LENTIDAO,
    descricao: 'Velocidade oscilando abaixo de 20 Mega no período noturno durante videoconferência.',
    status: StatusOS.EM_ATENDIMENTO,
    tecnicoId: 'tec-joao-01',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 dia atrás
  });

  const os3 = new OrdemServico({
    idLocal: 'OS-1003',
    clienteId: DEMO_CLIENTE_ID,
    tipoProblema: TipoProblema.QUEDA,
    descricao: 'Quedas sucessivas do sinal de internet após fortes chuvas de vento na região central.',
    status: StatusOS.CONCLUIDO,
    tecnicoId: 'tec-marcos-02',
    parecerTecnico: 'Conector óptico na caixa de emenda (CTO-04) refeito. Potência óptica normalizada em -19.2 dBm.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 dias atrás
    dataFechamento: new Date(Date.now() - 1000 * 60 * 60 * 70),
  });

  // 4. Ordem de Serviço de outro cliente (Maria Fernandes)
  // Serve para comprovar que na aba do cliente Carlos (cli-cjnet-01) esta OS NÃO aparece!
  const osOutroCliente = new OrdemServico({
    idLocal: 'OS-2001',
    clienteId: 'cli-maria-02',
    tipoProblema: TipoProblema.OUTROS,
    descricao: 'Instalação de ponto adicional no escritório residencial após reforma.',
    status: StatusOS.PENDENTE,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  });

  sharedOsRepo.salvar(os1);
  sharedOsRepo.salvar(os2);
  sharedOsRepo.salvar(os3);
  sharedOsRepo.salvar(osOutroCliente);
}

// Inicializa imediatamente para garantir dados disponíveis
initializeSharedStore();
