import { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import { Cliente } from '@/domain/entities/Cliente';

export class FakeClienteRepository implements IClienteRepository {
  private readonly items = new Map<string, Cliente>();

  public async salvar(cliente: Cliente): Promise<void> {
    this.items.set(cliente.id, cliente);
  }

  public async buscarPorId(id: string): Promise<Cliente | null> {
    return this.items.get(id) ?? null;
  }

  public async buscarPorAuthUserId(authUserId: string): Promise<Cliente | null> {
    for (const cliente of this.items.values()) {
      if (cliente.authUserId === authUserId) {
        return cliente;
      }
    }
    return null;
  }

  public async buscarPorCpfCnpj(cpfCnpj: string): Promise<Cliente | null> {
    for (const cliente of this.items.values()) {
      if (cliente.cpfCnpj.valorSemFormatacao === cpfCnpj.replace(/\D/g, '')) {
        return cliente;
      }
    }
    return null;
  }

  public async listarTodos(): Promise<Cliente[]> {
    return Array.from(this.items.values());
  }

  public limpar(): void {
    this.items.clear();
  }
}
