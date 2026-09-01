export interface PostgresQueryResult<Row = Record<string, unknown>> {
  readonly rowCount: number
  readonly rows: readonly Row[]
}

export interface PostgresExecutor {
  query<Row = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<PostgresQueryResult<Row>>
}

export interface PostgresTransactionExecutor extends PostgresExecutor {
  transaction<T>(work: (transaction: PostgresExecutor) => Promise<T>): Promise<T>
}
