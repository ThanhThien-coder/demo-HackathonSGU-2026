import postgres from "postgres";

// 03_API_VA_LUU_TRU Muc 8, D-65: DATABASE_URL qua Supavisor Transaction Pooler (port 6543)
// 05_HA_TANG_CLOUD Muc 1: driver postgres 3.x voi max: 5 ket noi / ban sao, prepare: false
const connectionString = process.env.DATABASE_URL;

declare global {
  var _sql: postgres.Sql | undefined;
}

export const sql =
  globalThis._sql ??
  (connectionString
    ? postgres(connectionString, {
        max: 5,
        prepare: false,
      })
    : postgres({
        max: 5,
        prepare: false,
      }));

if (process.env.NODE_ENV !== "production") {
  globalThis._sql = sql;
}

export type TransactionSql = postgres.TransactionSql;

export const db = {
  sql,
  // D-65: db.tx dung sql.begin de chay transaction
  tx: <T>(cb: (tx: postgres.TransactionSql) => T | Promise<T>) => sql.begin(cb),
};
