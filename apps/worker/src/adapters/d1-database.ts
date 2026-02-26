import type { DatabaseAdapter, DatabaseStatement, DatabaseResult } from './database';

export class D1DatabaseAdapter implements DatabaseAdapter {
  constructor(private db: D1Database) {}

  prepare(sql: string): DatabaseStatement {
    return new D1StatementWrapper(this.db.prepare(sql));
  }

  async batch(statements: DatabaseStatement[]): Promise<unknown[]> {
    const d1Stmts = statements.map(s => (s as D1StatementWrapper).unwrap());
    return this.db.batch(d1Stmts);
  }
}

class D1StatementWrapper implements DatabaseStatement {
  private stmt: D1PreparedStatement;

  constructor(stmt: D1PreparedStatement) {
    this.stmt = stmt;
  }

  bind(...values: unknown[]): DatabaseStatement {
    this.stmt = this.stmt.bind(...values);
    return this;
  }

  async run(): Promise<DatabaseResult> {
    const result = await this.stmt.run();
    return { meta: { changes: result.meta.changes } };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return this.stmt.first<T>();
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const result = await this.stmt.all<T>();
    return { results: result.results };
  }

  unwrap(): D1PreparedStatement {
    return this.stmt;
  }
}
