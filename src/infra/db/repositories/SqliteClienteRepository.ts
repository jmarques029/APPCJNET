/**
 * SqliteClienteRepository.ts
 * -------------------------
 * Implementação SQLite do IClienteRepository.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import { Cliente, type StatusContratoType } from '@/domain/entities/Cliente';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { Email } from '@/domain/value-objects/Email';
import { PapelUsuario, type PapelUsuarioType } from '@/domain/value-objects/PapelUsuario';

interface ClienteRow {
  id: string;
  auth_user_id: string;
  plano_id: string | null;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  papel: string;
  status_contrato: string;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteClienteRepository implements IClienteRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async salvar(cliente: Cliente): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO clientes
       (id, auth_user_id, plano_id, nome, cpf_cnpj, email, telefone, papel, status_contrato, push_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      cliente.id,
      cliente.authUserId,
      cliente.planoId ?? null,
      cliente.nome,
      cliente.cpfCnpj.value,
      cliente.email.value,
      cliente.telefone,
      cliente.papel.value,
      cliente.statusContrato,
      cliente.pushToken ?? null,
      cliente.createdAt.toISOString(),
      cliente.updatedAt.toISOString()
    );
  }

  public async buscarPorId(id: string): Promise<Cliente | null> {
    const row = await this.db.getFirstAsync<ClienteRow>(
      `SELECT * FROM clientes WHERE id = ?`,
      id
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  public async buscarPorAuthUserId(authUserId: string): Promise<Cliente | null> {
    const row = await this.db.getFirstAsync<ClienteRow>(
      `SELECT * FROM clientes WHERE auth_user_id = ?`,
      authUserId
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  public async buscarPorCpfCnpj(cpfCnpj: string): Promise<Cliente | null> {
    const cleanCpf = cpfCnpj.replace(/\D/g, '');
    const row = await this.db.getFirstAsync<ClienteRow>(
      `SELECT * FROM clientes WHERE cpf_cnpj = ? OR cpf_cnpj = ?`,
      cpfCnpj,
      cleanCpf
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  public async listarTodos(): Promise<Cliente[]> {
    const rows = await this.db.getAllAsync<ClienteRow>(`SELECT * FROM clientes`);
    return rows.map((r) => this.mapRowToEntity(r));
  }

  private mapRowToEntity(row: ClienteRow): Cliente {
    return new Cliente({
      id: row.id,
      authUserId: row.auth_user_id,
      planoId: row.plano_id,
      nome: row.nome,
      cpfCnpj: new CpfCnpj(row.cpf_cnpj),
      email: new Email(row.email),
      telefone: row.telefone,
      papel: PapelUsuario.create(row.papel as PapelUsuarioType),
      statusContrato: row.status_contrato as StatusContratoType,
      pushToken: row.push_token,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
