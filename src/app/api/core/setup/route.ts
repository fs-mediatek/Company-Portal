import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery } from "@/lib/core-db"

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(255) DEFAULT 'user',
  department_id INT UNSIGNED DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_active (active)
);

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT 'gray',
  is_builtin TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) DEFAULT NULL,
  parent_id INT UNSIGNED DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL UNIQUE,
  value TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT DEFAULT NULL,
  is_read TINYINT(1) DEFAULT 0,
  link VARCHAR(500) DEFAULT NULL,
  area VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  content TEXT NOT NULL,
  trigger_event VARCHAR(100) DEFAULT NULL,
  trigger_enabled TINYINT(1) DEFAULT 0,
  trigger_recipient VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sla_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  area VARCHAR(50) NOT NULL DEFAULT 'all',
  match_category VARCHAR(100) DEFAULT NULL,
  match_priority VARCHAR(20) DEFAULT NULL,
  response_hours DECIMAL(8,1) DEFAULT NULL,
  resolution_hours DECIMAL(8,1) DEFAULT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auto_assign_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  area VARCHAR(50) NOT NULL DEFAULT 'all',
  category VARCHAR(100) DEFAULT NULL,
  assign_to_user_id INT UNSIGNED NOT NULL,
  priority INT DEFAULT 100,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  area VARCHAR(50) NOT NULL DEFAULT 'all',
  description TEXT DEFAULT NULL,
  workflow_steps TEXT DEFAULT NULL,
  sort_order INT DEFAULT 100,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chatbot_responses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  keywords VARCHAR(500) NOT NULL,
  title VARCHAR(200) NOT NULL,
  answer TEXT NOT NULL,
  link VARCHAR(500) DEFAULT NULL,
  sort_order INT DEFAULT 100,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

const BUILTIN_ROLES = [
  { name: "admin", label: "Administrator", color: "red", sort: 1 },
  { name: "manager", label: "Manager", color: "blue", sort: 2 },
  { name: "agent", label: "Agent", color: "purple", sort: 3 },
  { name: "techniker", label: "Techniker", color: "teal", sort: 4 },
  { name: "hausmeister", label: "Hausmeister", color: "amber", sort: 5 },
  { name: "redakteur", label: "Redakteur", color: "indigo", sort: 6 },
  { name: "user", label: "Benutzer", color: "gray", sort: 10 },
]

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  }

  try {
    // Create tables
    const statements = SCHEMA.split(";").map(s => s.trim()).filter(s => s.length > 0)
    for (const stmt of statements) {
      await coreQuery(stmt)
    }

    // Seed builtin roles
    for (const role of BUILTIN_ROLES) {
      await coreQuery(
        `INSERT IGNORE INTO roles (name, label, color, is_builtin, sort_order) VALUES (?, ?, ?, 1, ?)`,
        [role.name, role.label, role.color, role.sort]
      )
    }

    return NextResponse.json({ success: true, message: "Portal-Core Datenbank initialisiert" })
  } catch (err: any) {
    console.error("[Core Setup]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await coreQuery("SELECT 1")
    const tables = await coreQuery("SHOW TABLES")
    return NextResponse.json({ db_ok: true, tables: tables.map((t: any) => Object.values(t)[0]) })
  } catch (err: any) {
    return NextResponse.json({ db_ok: false, error: err.message })
  }
}
