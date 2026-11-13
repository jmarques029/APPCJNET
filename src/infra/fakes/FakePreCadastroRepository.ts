import { IPreCadastroRepository } from '@/domain/repositories/IPreCadastroRepository';
import { PreCadastro } from '@/domain/entities/PreCadastro';
import { supabase } from '@/infra/supabase/supabaseClient';

export class FakePreCadastroRepository implements IPreCadastroRepository {
  private readonly items = new Map<string, PreCadastro>();

  public async salvar(preCadastro: PreCadastro): Promise<void> {
    this.items.set(preCadastro.id, preCadastro);

    if (process.env.NODE_ENV !== 'test' && supabase.isConfigured()) {
      try {
        await supabase.upsert(
          'pre_cadastros',
          {
            id: preCadastro.id,
            plano_id: preCadastro.planoId,
            area_cobertura_id: preCadastro.areaCoberturaId ?? null,
            nome: preCadastro.nome,
            cpf_cnpj: preCadastro.cpfCnpj.value,
            telefone: preCadastro.telefone,
            endereco_completo: preCadastro.enderecoCompleto,
            latitude: preCadastro.coordenadas?.latitude ?? null,
            longitude: preCadastro.coordenadas?.longitude ?? null,
            status: preCadastro.status,
            criado_em: preCadastro.criadoEm.toISOString(),
          },
          'id'
        );
      } catch (err) {
        console.warn('Erro ao enviar pré-cadastro ao Supabase:', err);
      }
    }
  }

  public async buscarPorId(id: string): Promise<PreCadastro | null> {
    return this.items.get(id) ?? null;
  }

  public async listarTodos(): Promise<PreCadastro[]> {
    return Array.from(this.items.values());
  }

  public limpar(): void {
    this.items.clear();
  }
}
