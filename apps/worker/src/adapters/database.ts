export interface DatabaseResult {
  meta: {
    changes: number;
  };
}

export interface DatabaseStatement {
  bind(...values: unknown[]): DatabaseStatement;
  run(): Promise<DatabaseResult>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface DatabaseAdapter {
  prepare(sql: string): DatabaseStatement;
  batch(statements: DatabaseStatement[]): Promise<unknown[]>;
}
