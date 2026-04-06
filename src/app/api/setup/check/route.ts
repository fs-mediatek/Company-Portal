import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { coreQuery } from "@/lib/core-db"
import { hdQuery } from "@/lib/helpdesk-db"

export async function GET() {
  try {
    // ═══════════════════════════════════════════════════════════════
    // PORTAL_CORE
    // ═══════════════════════════════════════════════════════════════

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS roles (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      label VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT 'gray',
      is_builtin TINYINT(1) DEFAULT 0,
      sort_order INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS departments (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      display_name VARCHAR(200) DEFAULT NULL,
      parent_id INT UNSIGNED DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS settings (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      key_name VARCHAR(100) NOT NULL UNIQUE,
      value TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS notifications (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS templates (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) DEFAULT NULL,
      content TEXT NOT NULL,
      trigger_event VARCHAR(100) DEFAULT NULL,
      trigger_enabled TINYINT(1) DEFAULT 0,
      trigger_recipient VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS sla_rules (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS auto_assign_rules (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      area VARCHAR(50) NOT NULL DEFAULT 'all',
      category VARCHAR(100) DEFAULT NULL,
      assign_to_user_id INT UNSIGNED NOT NULL,
      priority INT DEFAULT 100,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS order_categories (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      area VARCHAR(50) NOT NULL DEFAULT 'all',
      description TEXT DEFAULT NULL,
      workflow_steps TEXT DEFAULT NULL,
      sort_order INT DEFAULT 100,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS chatbot_responses (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      keywords VARCHAR(500) NOT NULL,
      title VARCHAR(200) NOT NULL,
      answer TEXT NOT NULL,
      link VARCHAR(500) DEFAULT NULL,
      sort_order INT DEFAULT 100,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await coreQuery(`CREATE TABLE IF NOT EXISTS sharepoint_sites (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      site_url VARCHAR(500) NOT NULL,
      drive_name VARCHAR(100) NOT NULL DEFAULT 'Dokumente',
      base_folder VARCHAR(200) NOT NULL DEFAULT '',
      description VARCHAR(255) DEFAULT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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

    // ═══════════════════════════════════════════════════════════════
    // FACILITY_MGMT
    // ═══════════════════════════════════════════════════════════════

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await query(`CREATE TABLE IF NOT EXISTS ticket_categories (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      icon VARCHAR(50) DEFAULT NULL,
      sort_order INT DEFAULT 0,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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
      latitude DECIMAL(10,7) DEFAULT NULL,
      longitude DECIMAL(10,7) DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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
      transmission VARCHAR(30) DEFAULT NULL,
      tire_type VARCHAR(80) DEFAULT NULL,
      tire_size VARCHAR(80) DEFAULT NULL,
      first_registration DATE DEFAULT NULL,
      ownership_type ENUM('leasing','kauf') DEFAULT NULL,
      lease_end_date DATE DEFAULT NULL,
      lease_end_km INT DEFAULT NULL,
      lease_amount VARCHAR(50) DEFAULT NULL,
      vehicle_tax DECIMAL(10,2) DEFAULT NULL,
      purchase_price DECIMAL(10,2) DEFAULT NULL,
      insurer VARCHAR(100) DEFAULT NULL,
      insurance_number VARCHAR(100) DEFAULT NULL,
      insurance_amount DECIMAL(10,2) DEFAULT NULL,
      payment_period VARCHAR(30) DEFAULT NULL,
      contact_person VARCHAR(100) DEFAULT NULL,
      contact_email VARCHAR(200) DEFAULT NULL,
      contact_phone VARCHAR(50) DEFAULT NULL,
      cost_center VARCHAR(50) DEFAULT NULL,
      company VARCHAR(100) DEFAULT NULL,
      sharepoint_site_id INT UNSIGNED DEFAULT NULL,
      photo_path VARCHAR(500) DEFAULT NULL,
      next_inspection DATE DEFAULT NULL,
      next_tuv DATE DEFAULT NULL,
      insurance_until DATE DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await query(`CREATE TABLE IF NOT EXISTS vehicle_documents (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT UNSIGNED NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) DEFAULT NULL,
      size_bytes INT DEFAULT NULL,
      doc_label VARCHAR(100) DEFAULT NULL,
      sharepoint_item_id VARCHAR(500) DEFAULT NULL,
      storage_type VARCHAR(10) DEFAULT 'local',
      uploaded_by INT UNSIGNED DEFAULT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_vehicle (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await query(`CREATE TABLE IF NOT EXISTS vehicle_mileage_log (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT UNSIGNED NOT NULL,
      mileage INT NOT NULL,
      recorded_at DATE NOT NULL,
      notes TEXT DEFAULT NULL,
      created_by INT UNSIGNED DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_vehicle (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await query(`CREATE TABLE IF NOT EXISTS commission_counters (
      year INT PRIMARY KEY,
      last_number INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    // Schulungen / Traincore
    await query(`CREATE TABLE IF NOT EXISTS training_courses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      category VARCHAR(100) DEFAULT NULL,
      duration_hours INT DEFAULT NULL,
      instructor_name VARCHAR(255) DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_active (active),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await query(`CREATE TABLE IF NOT EXISTS training_chapters (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT DEFAULT NULL,
      content_type ENUM('text','video','link','file','image','callout') DEFAULT 'text',
      media_url VARCHAR(500) DEFAULT NULL,
      sort_order INT DEFAULT 0,
      duration_minutes INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await query(`CREATE TABLE IF NOT EXISTS training_assignments (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      assigned_by INT UNSIGNED DEFAULT NULL,
      status ENUM('assigned','in_progress','completed','overdue') DEFAULT 'assigned',
      due_date DATE DEFAULT NULL,
      started_at TIMESTAMP NULL DEFAULT NULL,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      progress_percent INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_course (course_id),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await query(`CREATE TABLE IF NOT EXISTS training_chapter_progress (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      assignment_id INT UNSIGNED NOT NULL,
      chapter_id INT UNSIGNED NOT NULL,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_assignment_chapter (assignment_id, chapter_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await query(`CREATE TABLE IF NOT EXISTS training_quiz_results (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      assignment_id INT UNSIGNED NOT NULL,
      chapter_id INT UNSIGNED NOT NULL,
      score INT DEFAULT 0,
      passed TINYINT(1) DEFAULT 0,
      answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

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

    // ═══════════════════════════════════════════════════════════════
    // HELPDESK DB
    // ═══════════════════════════════════════════════════════════════

    await hdQuery(`CREATE TABLE IF NOT EXISTS tickets (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS ticket_comments (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NULL,
      content TEXT NOT NULL,
      is_internal TINYINT(1) DEFAULT 0,
      is_system TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ticket (ticket_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS ticket_checklist (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT UNSIGNED NOT NULL,
      content VARCHAR(500) NOT NULL,
      is_done TINYINT(1) DEFAULT 0,
      done_by VARCHAR(100) DEFAULT NULL,
      done_at TIMESTAMP NULL DEFAULT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ticket (ticket_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS ticket_counters (
      year INT PRIMARY KEY,
      last_number INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS assets (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS kb_articles (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS orders (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS order_items (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_id INT UNSIGNED NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity INT DEFAULT 1,
      unit_price DECIMAL(10,2) DEFAULT 0,
      notes TEXT DEFAULT NULL,
      INDEX idx_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS order_counters (
      year INT PRIMARY KEY,
      last_number INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS catalog (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      category VARCHAR(100) DEFAULT NULL,
      price DECIMAL(10,2) DEFAULT 0,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS suppliers (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      contact_name VARCHAR(200) DEFAULT NULL,
      contact_email VARCHAR(200) DEFAULT NULL,
      contact_phone VARCHAR(100) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS inventory (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS mobile_contracts (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS mobile_contract_history (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      contract_id INT UNSIGNED NOT NULL,
      field_name VARCHAR(50) NOT NULL,
      old_value TEXT DEFAULT NULL,
      new_value TEXT DEFAULT NULL,
      changed_by INT UNSIGNED DEFAULT NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_contract (contract_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    await hdQuery(`CREATE TABLE IF NOT EXISTS mobile_sim_cards (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

    // Check if users exist
    const users = await coreQuery("SELECT COUNT(*) as count FROM users")
    const hasUsers = (users[0] as any).count > 0

    return NextResponse.json({ db_ok: true, has_users: hasUsers })
  } catch (err: any) {
    console.error("[Setup Check]", err)
    return NextResponse.json({ db_ok: false, error: err.message }, { status: 500 })
  }
}
