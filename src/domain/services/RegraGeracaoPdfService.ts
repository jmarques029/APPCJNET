import { OrdemServico } from '../entities/OrdemServico';
import { Cliente } from '../entities/Cliente';

export interface DocumentoPdfOrdemServico {
  cabecalho: {
    empresa: string;
    cidade: string;
    titulo: string;
    numeroOS: string;
    emitidoEm: Date;
  };
  dadosCliente: {
    nome: string;
    documento: string;
    telefone: string;
    email: string;
  };
  dadosTecnico?: {
    nome: string;
    documento: string;
  };
  dadosChamado: {
    tipoProblema: string;
    descricao: string;
    status: string;
    abertoEm: Date;
    concluidoEm?: Date | null;
    parecerTecnico?: string | null;
    tecnicoResponsavelId?: string | null;
    totalFotosAnexadas: number;
  };
  declaracaoEncerramento: string;
}

export class RegraGeracaoPdfService {
  public static comporDocumentoOS(
    os: OrdemServico,
    cliente: Cliente,
    tecnico?: Cliente
  ): DocumentoPdfOrdemServico {
    if (os.clienteId !== cliente.id) {
      throw new Error('A Ordem de Serviço não pertence ao cliente informado.');
    }

    const agora = new Date();
    const numeroOS = os.idRemoto ? `#${os.idRemoto}` : `(Local) #${os.idLocal}`;

    const doc: DocumentoPdfOrdemServico = {
      cabecalho: {
        empresa: 'CJnet Provedor de Internet',
        cidade: 'Coqueiral / MG',
        titulo: 'Comprovante e Laudo de Atendimento Técnico',
        numeroOS,
        emitidoEm: agora,
      },
      dadosCliente: {
        nome: cliente.nome,
        documento: cliente.cpfCnpj.formatted,
        telefone: cliente.telefone,
        email: cliente.email.value,
      },
      dadosChamado: {
        tipoProblema: os.tipoProblema.label,
        descricao: os.descricao,
        status: os.status.value,
        abertoEm: os.createdAt,
        concluidoEm: os.dataFechamento,
        parecerTecnico: os.parecerTecnico,
        tecnicoResponsavelId: os.tecnicoId,
        totalFotosAnexadas: os.fotos.length,
      },
      declaracaoEncerramento:
        'Declaro que o atendimento acima foi registrado conforme as diretrizes técnicas da CJnet Provedor de Internet.',
    };

    if (tecnico) {
      doc.dadosTecnico = {
        nome: tecnico.nome,
        documento: tecnico.cpfCnpj.formatted,
      };
    }

    return doc;
  }
}
