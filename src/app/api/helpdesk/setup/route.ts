import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery } from "@/lib/helpdesk-db"

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('open','pending','in_progress','resolved','closed') DEFAULT 'open',
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  category VARCHAR(100) DEFAULT 'Sonstiges',
  requester_id INT UNSIGNED,
  assignee_id INT UNSIGNED DEFAULT NULL,
  affected_user_id INT UNSIGNED DEFAULT NULL,
  delegate_id INT UNSIGNED DEFAULT NULL,
  sla_due_at TIMESTAMP NULL DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  satisfaction_rating TINYINT UNSIGNED DEFAULT NULL,
  satisfaction_comment TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_requester (requester_id)
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  content TEXT NOT NULL,
  is_internal TINYINT(1) DEFAULT 0,
  is_system TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket (ticket_id)
);

CREATE TABLE IF NOT EXISTS ticket_checklist (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT UNSIGNED NOT NULL,
  content VARCHAR(500) NOT NULL,
  is_done TINYINT(1) DEFAULT 0,
  done_by VARCHAR(100) DEFAULT NULL,
  done_at TIMESTAMP NULL DEFAULT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket (ticket_id)
);

CREATE TABLE IF NOT EXISTS ticket_counters (
  year INT PRIMARY KEY,
  last_number INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_tag VARCHAR(50) UNIQUE,
  name VARCHAR(255) DEFAULT NULL,
  type VARCHAR(50) DEFAULT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'other',
  brand VARCHAR(100) DEFAULT NULL,
  model VARCHAR(100) DEFAULT NULL,
  manufacturer VARCHAR(100) DEFAULT NULL,
  serial_number VARCHAR(100) DEFAULT NULL,
  status ENUM('available','assigned','maintenance','retired') DEFAULT 'available',
  assigned_to_user_id INT DEFAULT NULL,
  purchase_date DATE DEFAULT NULL,
  purchase_price DECIMAL(10,2) DEFAULT NULL,
  warranty_until DATE DEFAULT NULL,
  os_version VARCHAR(100) DEFAULT NULL,
  primary_user_email VARCHAR(255) DEFAULT NULL,
  intune_device_id VARCHAR(100) DEFAULT NULL,
  phone_number VARCHAR(30) DEFAULT NULL,
  imei VARCHAR(20) DEFAULT NULL,
  commissioned_at DATE DEFAULT NULL,
  notes TEXT,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_platform (platform),
  INDEX idx_status (status),
  INDEX idx_assigned (assigned_to_user_id)
);

CREATE TABLE IF NOT EXISTS kb_articles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) DEFAULT NULL,
  content_html TEXT,
  status ENUM('draft','published') DEFAULT 'draft',
  tags VARCHAR(500) DEFAULT NULL,
  author_id INT UNSIGNED DEFAULT NULL,
  views INT UNSIGNED DEFAULT 0,
  helpful_votes INT UNSIGNED DEFAULT 0,
  unhelpful_votes INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT UNSIGNED DEFAULT NULL,
  status ENUM('requested','approved','ordered','shipped','delivered','rejected','cancelled') DEFAULT 'requested',
  requested_by INT UNSIGNED NOT NULL,
  assignee_id INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  notes TEXT DEFAULT NULL,
  INDEX idx_order (order_id)
);

CREATE TABLE IF NOT EXISTS order_counters (
  year INT PRIMARY KEY,
  last_number INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS catalog (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  category VARCHAR(100) DEFAULT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200) DEFAULT NULL,
  contact_email VARCHAR(200) DEFAULT NULL,
  contact_phone VARCHAR(100) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  category VARCHAR(100) DEFAULT NULL,
  quantity INT DEFAULT 0,
  min_quantity INT DEFAULT 0,
  location VARCHAR(200) DEFAULT NULL,
  supplier_id INT UNSIGNED DEFAULT NULL,
  unit_price DECIMAL(10,2) DEFAULT 0,
  notes TEXT DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mobile_contracts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(30) UNIQUE NOT NULL,
  base_price DECIMAL(10,2) DEFAULT 0,
  connection_costs DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_net DECIMAL(10,2) DEFAULT 0,
  total_gross DECIMAL(10,2) DEFAULT 0,
  cost_center_1 VARCHAR(50) DEFAULT NULL,
  cost_center_2 VARCHAR(50) DEFAULT NULL,
  active_user VARCHAR(150) DEFAULT NULL,
  device_id VARCHAR(50) DEFAULT NULL,
  pin VARCHAR(20) DEFAULT NULL,
  puk VARCHAR(20) DEFAULT NULL,
  pin2 VARCHAR(20) DEFAULT NULL,
  puk2 VARCHAR(20) DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  status VARCHAR(30) DEFAULT 'Aktiv',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mobile_contract_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id INT UNSIGNED NOT NULL,
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT DEFAULT NULL,
  new_value TEXT DEFAULT NULL,
  changed_by INT UNSIGNED DEFAULT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contract (contract_id)
);

CREATE TABLE IF NOT EXISTS mobile_sim_cards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sim_number VARCHAR(100) UNIQUE NOT NULL,
  provider VARCHAR(100) DEFAULT NULL,
  contact_name VARCHAR(150) DEFAULT NULL,
  contact_email VARCHAR(200) DEFAULT NULL,
  status ENUM('blank','sent','activated') DEFAULT 'blank',
  notes TEXT DEFAULT NULL,
  added_by INT UNSIGNED DEFAULT NULL,
  sent_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  }

  try {
    const statements = SCHEMA.split(";").map(s => s.trim()).filter(s => s.length > 0)
    for (const stmt of statements) {
      await hdQuery(stmt)
    }
    return NextResponse.json({ success: true, message: "Helpdesk-Datenbank initialisiert" })
  } catch (err: any) {
    console.error("[Helpdesk Setup]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await hdQuery("SELECT 1")
    const tables = await hdQuery("SHOW TABLES")
    return NextResponse.json({ db_ok: true, tables: tables.map((t: any) => Object.values(t)[0]) })
  } catch (err: any) {
    return NextResponse.json({ db_ok: false, error: err.message })
  }
}
