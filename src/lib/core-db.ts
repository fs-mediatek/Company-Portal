import mysql from 'mysql2/promise'

const poolConfig: any = {
  database: process.env.CORE_DB_NAME || 'portal_core',
  user: process.env.CORE_DB_USER || process.env.DB_USER || 'root',
  password: process.env.CORE_DB_PASSWORD || process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

if (process.env.CORE_DB_SOCKET || process.env.DB_SOCKET) {
  poolConfig.socketPath = process.env.CORE_DB_SOCKET || process.env.DB_SOCKET
} else {
  poolConfig.host = process.env.CORE_DB_HOST || process.env.DB_HOST || 'localhost'
  poolConfig.port = parseInt(process.env.CORE_DB_PORT || process.env.DB_PORT || '3306')
}

const corePool = mysql.createPool(poolConfig)

export async function coreQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await corePool.execute(sql, params)
  return rows as T[]
}

export async function coreQueryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await coreQuery<T>(sql, params)
  return rows[0] ?? null
}

export async function coreInsert(sql: string, params?: any[]): Promise<number> {
  const [result] = await corePool.execute(sql, params) as any
  return result.insertId
}
