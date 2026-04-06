import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { coreQuery } from "@/lib/core-db"

export async function GET() {
  try {
    // ═══ PORTAL_CORE: Users, Roles, Settings, Departments, Notifications, Templates ═══
    await coreQuery(`CREATE TABLE IF NOT EXISTS users (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS roles (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      label VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT 'gray',
      is_builtin TINYINT(1) DEFAULT 0,
      sort_order INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS departments (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      display_name VARCHAR(200) DEFAULT NULL,
      parent_id INT UNSIGNED DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS settings (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      key_name VARCHAR(100) NOT NULL UNIQUE,
      value TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS notifications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT DEFAULT NULL,
      is_read TINYINT(1) DEFAULT 0,
      link VARCHAR(500) DEFAULT NULL,
      area VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_read (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS templates (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) DEFAULT NULL,
      content TEXT NOT NULL,
      trigger_event VARCHAR(100) DEFAULT NULL,
      trigger_enabled TINYINT(1) DEFAULT 0,
      trigger_recipient VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    // Seed builtin roles
    const builtinRoles = [
      { name: "admin", label: "Administrator", color: "red", sort: 1 },
      { name: "manager", label: "Manager", color: "blue", sort: 2 },
      { name: "agent", label: "Agent", color: "purple", sort: 3 },
      { name: "techniker", label: "Techniker", color: "teal", sort: 4 },
      { name: "hausmeister", label: "Hausmeister", color: "amber", sort: 5 },
      { name: "redakteur", label: "Redakteur", color: "indigo", sort: 6 },
      { name: "user", label: "Benutzer", color: "gray", sort: 10 },
    ]
    for (const r of builtinRoles) {
      await coreQuery(
        "INSERT IGNORE INTO roles (name, label, color, is_builtin, sort_order) VALUES (?, ?, ?, 1, ?)",
        [r.name, r.label, r.color, r.sort]
      )
    }

    // ═══ FACILITY_MGMT: Tickets, Locations, Vehicles, Commissions ═══
    await query(`CREATE TABLE IF NOT EXISTS tickets (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      ticket_number VARCHAR(30) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) DEFAULT 'Sonstiges',
      priority ENUM('low','medium','high','critical') DEFAULT 'medium',
      status ENUM('open','in_progress','waiting','resolved','closed') DEFAULT 'open',
      location_building VARCHAR(100) DEFAULT NULL,
      location_floor VARCHAR(50) DEFAULT NULL,
      location_room VARCHAR(50) DEFAULT NULL,
      location_id INT UNSIGNED DEFAULT NULL,
      requester_id INT UNSIGNED NOT NULL,
      assigned_to_user_id INT UNSIGNED DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await query(`CREATE TABLE IF NOT EXISTS ticket_counters (
      year INT PRIMARY KEY,
      last_number INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await query(`CREATE TABLE IF NOT EXISTS ticket_comments (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NULL,
      content TEXT NOT NULL,
      is_internal TINYINT(1) DEFAULT 0,
      is_system TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await query(`CREATE TABLE IF NOT EXISTS ticket_categories (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      icon VARCHAR(50) DEFAULT NULL,
      sort_order INT DEFAULT 0,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await query(`CREATE TABLE IF NOT EXISTS locations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      street VARCHAR(200) DEFAULT NULL,
      zip VARCHAR(10) DEFAULT NULL,
      city VARCHAR(100) DEFAULT NULL,
      contact_name VARCHAR(150) DEFAULT NULL,
      contact_phone VARCHAR(100) DEFAULT NULL,
      contact_email VARCHAR(200) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      latitude DECIMAL(10, 7) DEFAULT NULL,
      longitude DECIMAL(10, 7) DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await query(`CREATE TABLE IF NOT EXISTS vehicles (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      license_plate VARCHAR(20) NOT NULL,
      make VARCHAR(100) DEFAULT NULL,
      model VARCHAR(100) DEFAULT NULL,
      type ENUM('pkw','transporter','lkw','anhaenger','sonstige') DEFAULT 'pkw',
      year INT DEFAULT NULL,
      color VARCHAR(50) DEFAULT NULL,
      vin VARCHAR(50) DEFAULT NULL,
      status ENUM('verfuegbar','in_nutzung','werkstatt','ausgemustert') DEFAULT 'verfuegbar',
      assigned_to_user_id INT UNSIGNED DEFAULT NULL,
      location_id INT UNSIGNED DEFAULT NULL,
      mileage INT DEFAULT NULL,
      fuel_type VARCHAR(30) DEFAULT NULL,
      next_inspection DATE DEFAULT NULL,
      next_tuv DATE DEFAULT NULL,
      insurance_until DATE DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await query(`CREATE TABLE IF NOT EXISTS commissions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      commission_number VARCHAR(30) NOT NULL UNIQUE,
      status ENUM('entwurf','offen','in_bearbeitung','abgeschlossen','storniert') DEFAULT 'entwurf',
      requester_id INT UNSIGNED NOT NULL,
      assigned_to_user_id INT UNSIGNED DEFAULT NULL,
      location_id INT UNSIGNED DEFAULT NULL,
      recipient_name VARCHAR(200) DEFAULT NULL,
      delivery_date DATE DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await query(`CREATE TABLE IF NOT EXISTS commission_items (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      commission_id INT UNSIGNED NOT NULL,
      article_name VARCHAR(255) NOT NULL,
      article_number VARCHAR(100) DEFAULT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit VARCHAR(30) DEFAULT 'Stk.',
      picked_quantity INT DEFAULT 0,
      unit_price DECIMAL(10,2) DEFAULT 0.00,
      notes VARCHAR(500) DEFAULT NULL,
      sort_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await query(`CREATE TABLE IF NOT EXISTS commission_counters (
      year INT PRIMARY KEY,
      last_number INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    // Seed ticket categories
    const categories = [
      { name: "Elektrik", icon: "Zap", sort: 1 },
      { name: "Sanitär", icon: "Droplets", sort: 2 },
      { name: "Heizung/Klima", icon: "Thermometer", sort: 3 },
      { name: "Aufzug", icon: "ArrowUpDown", sort: 4 },
      { name: "Reinigung", icon: "Sparkles", sort: 5 },
      { name: "Sicherheit", icon: "Shield", sort: 6 },
      { name: "Gebäude", icon: "Building2", sort: 7 },
      { name: "Sonstiges", icon: "MoreHorizontal", sort: 8 },
    ]
    for (const c of categories) {
      await query(
        "INSERT IGNORE INTO ticket_categories (name, icon, sort_order) VALUES (?, ?, ?)",
        [c.name, c.icon, c.sort]
      )
    }

    // Check if users exist in portal_core
    const users = await coreQuery("SELECT COUNT(*) as count FROM users")
    const hasUsers = (users[0] as any).count > 0

    return NextResponse.json({ db_ok: true, has_users: hasUsers })
  } catch (err: any) {
    console.error("[Setup Check]", err)
    return NextResponse.json({ db_ok: false, error: err.message }, { status: 500 })
  }
}
