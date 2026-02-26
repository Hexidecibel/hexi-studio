import Database from 'better-sqlite3';
import type { DatabaseAdapter, DatabaseStatement, DatabaseResult } from './database';

export class SqliteDatabaseAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  prepare(sql: string): DatabaseStatement {
    return new SqliteStatementWrapper(this.db, sql);
  }

  async batch(statements: DatabaseStatement[]): Promise<unknown[]> {
    const results: unknown[] = [];
    const transaction = this.db.transaction(() => {
      for (const stmt of statements) {
        results.push((stmt as SqliteStatementWrapper).executeRun());
      }
    });
    transaction();
    return results;
  }

  close(): void {
    this.db.close();
  }
}

class SqliteStatementWrapper implements DatabaseStatement {
  private db: Database.Database;
  private sql: string;
  private params: unknown[] = [];

  constructor(db: Database.Database, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...values: unknown[]): DatabaseStatement {
    this.params = values;
    return this;
  }

  async run(): Promise<DatabaseResult> {
    return this.executeRun();
  }

  executeRun(): DatabaseResult {
    const stmt = this.db.prepare(this.sql);
    const result = stmt.run(...this.params);
    return { meta: { changes: result.changes } };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...this.params) as T | undefined;
    return row ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.all(...this.params) as T[];
    return { results: rows };
  }
}
