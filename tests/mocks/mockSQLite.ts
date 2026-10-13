/**
 * mockSQLite.ts
 * -------------
 * Simulador de SQLite em memória para execução de testes unitários e de integração
 * dos repositórios SQLite e do OfflineSyncManager no ambiente Jest/Node.
 */

export class MockSQLiteDatabase {
  public tables: Record<string, any[]> = {
    clientes: [],
    planos: [],
    areas_cobertura: [],
    pre_cadastros: [],
    ordens_servico: [],
    os_fotos: [],
    sync_queue: [],
    mensagens_suporte: [],
  };

  public userVersion = 0;

  public async execAsync(source: string): Promise<void> {
    // Tratamento de PRAGMA user_version
    const versionMatch = source.match(/PRAGMA\s+user_version\s*=\s*(\d+)/i);
    if (versionMatch) {
      this.userVersion = parseInt(versionMatch[1], 10);
    }
  }

  public async getFirstAsync<T>(source: string, ...params: any[]): Promise<T | null> {
    const all = await this.getAllAsync<T>(source, ...params);
    return all.length > 0 ? all[0] : null;
  }

  public async getAllAsync<T>(source: string, ...params: any[]): Promise<T[]> {
    // 1. PRAGMA user_version
    if (/PRAGMA\s+user_version/i.test(source)) {
      return [{ user_version: this.userVersion } as unknown as T];
    }

    // 2. COUNT(*)
    const countMatch = source.match(/SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)/i);
    if (countMatch) {
      const table = countMatch[1];
      const count = (this.tables[table] || []).length;
      return [{ count } as unknown as T];
    }

    // 3. SELECT * FROM <table> WHERE <col> = ? (or OR <col> = ?)
    const fromMatch = source.match(/FROM\s+(\w+)/i);
    if (!fromMatch) return [];

    const table = fromMatch[1];
    let items = [...(this.tables[table] || [])];

    // Simples WHERE clause handling
    if (/WHERE\s+id_local\s*=\s*\?/i.test(source)) {
      items = items.filter((i) => i.id_local === params[0]);
    } else if (/WHERE\s+id_remoto\s*=\s*\?/i.test(source)) {
      items = items.filter((i) => i.id_remoto === params[0]);
    } else if (/WHERE\s+cliente_id\s*=\s*\?/i.test(source)) {
      items = items.filter((i) => i.cliente_id === params[0]);
    } else if (/WHERE\s+tecnico_id\s*=\s*\?/i.test(source)) {
      items = items.filter((i) => i.tecnico_id === params[0]);
    } else if (/WHERE\s+id\s*=\s*\?/i.test(source)) {
      items = items.filter((i) => i.id === params[0]);
    } else if (/WHERE\s+auth_user_id\s*=\s*\?/i.test(source)) {
      items = items.filter((i) => i.auth_user_id === params[0]);
    } else if (/WHERE\s+cpf_cnpj\s*=\s*\?/i.test(source)) {
      items = items.filter((i) => i.cpf_cnpj === params[0] || i.cpf_cnpj === params[1]);
    } else if (/WHERE\s+ativo\s*=\s*1/i.test(source)) {
      items = items.filter((i) => i.ativo === 1 || i.ativo === true);
    } else if (/WHERE\s+status\s*=\s*'PENDENTE'/i.test(source)) {
      items = items.filter((i) => i.status === 'PENDENTE');
    } else if (/WHERE\s+os_id\s*=\s*\?/i.test(source)) {
      items = items.filter((i) => i.os_id === params[0]);
    }

    // ORDER BY created_at DESC / ASC
    if (/ORDER BY\s+(created_at|criado_em)\s+DESC/i.test(source)) {
      items.sort((a, b) => {
        const da = new Date(a.created_at || a.criado_em).getTime();
        const db = new Date(b.created_at || b.criado_em).getTime();
        return db - da;
      });
    } else if (/ORDER BY\s+(created_at|criado_em)\s+ASC/i.test(source)) {
      items.sort((a, b) => {
        const da = new Date(a.created_at || a.criado_em).getTime();
        const db = new Date(b.created_at || b.criado_em).getTime();
        return da - db;
      });
    }

    return items as T[];
  }

  public async runAsync(source: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    // 1. INSERT OR REPLACE INTO <table|colunas>
    const insertMatch = source.match(/INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const table = insertMatch[1];
      const cols = insertMatch[2].split(',').map((c) => c.trim());

      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = params[idx];
      });

      if (!this.tables[table]) {
        this.tables[table] = [];
      }

      // Check replace by primary key (id or id_local)
      const pk = obj.id_local !== undefined ? 'id_local' : 'id';
      const existingIdx = this.tables[table].findIndex((item) => item[pk] === obj[pk]);

      if (existingIdx >= 0) {
        this.tables[table][existingIdx] = obj;
      } else {
        this.tables[table].push(obj);
      }

      return { lastInsertRowId: 1, changes: 1 };
    }

    // 2. UPDATE sync_queue SET status = 'CONCLUIDO', atualizado_em = ? WHERE id = ?
    if (/UPDATE\s+sync_queue\s+SET\s+status\s*=\s*'CONCLUIDO'/i.test(source)) {
      const atualizadoEm = params[0];
      const id = params[1];
      const item = this.tables.sync_queue.find((i) => i.id === id);
      if (item) {
        item.status = 'CONCLUIDO';
        item.atualizado_em = atualizadoEm;
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // 3. UPDATE sync_queue SET tentativas = tentativas + 1 ...
    if (/UPDATE\s+sync_queue\s+SET\s+tentativas/i.test(source)) {
      const erro = params[0];
      const atualizadoEm = params[1];
      const id = params[2];
      const item = this.tables.sync_queue.find((i) => i.id === id);
      if (item) {
        item.tentativas = (item.tentativas || 0) + 1;
        item.ultimo_erro = erro;
        item.atualizado_em = atualizadoEm;
        item.status = item.tentativas >= 4 ? 'ERRO' : 'PENDENTE';
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // 4. DELETE FROM sync_queue WHERE status = 'CONCLUIDO'
    if (/DELETE\s+FROM\s+sync_queue\s+WHERE\s+status\s*=\s*'CONCLUIDO'/i.test(source)) {
      const before = this.tables.sync_queue.length;
      this.tables.sync_queue = this.tables.sync_queue.filter((i) => i.status !== 'CONCLUIDO');
      return { lastInsertRowId: 0, changes: before - this.tables.sync_queue.length };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }
}

export function createMockSQLiteDatabase(): MockSQLiteDatabase {
  return new MockSQLiteDatabase();
}
