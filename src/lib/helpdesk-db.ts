import mysql from 'mysql2/promise'

const poolConfig: any = {
  database: process.env.HELPDESK_DB_NAME || 'helpdesk',
  user: process.env.HELPDESK_DB_USER || process.env.DB_USER || 'root',
  password: process.env.HELPDESK_DB_PASSWORD || process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

if (process.env.HELPDESK_DB_SOCKET || process.env.DB_SOCKET) {
  poolConfig.socketPath = process.env.HELPDESK_DB_SOCKET || process.env.DB_SOCKET
} else {
  poolConfig.host = process.env.HELPDESK_DB_HOST || process.env.DB_HOST || 'localhost'
  poolConfig.port = parseInt(process.env.HELPDESK_DB_PORT || process.env.DB_PORT || '3306')
}

const hdPool = mysql.createPool(poolConfig)

export async function hdQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await hdPool.execute(sql, params)
  return rows as T[]
}

export async function hdQueryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await hdQuery<T>(sql, params)
  return rows[0] ?? null
}

export async function hdInsert(sql: string, params?: any[]): Promise<number> {
  const [result] = await hdPool.execute(sql, params) as any
  return result.insertId
}
