# Facility & Fuhrpark — Technik- & Style-Guide

> Referenzdokument für die Umsetzung und Weiterentwicklung des Facility-&-Fuhrpark-Portals.
> Basiert auf der HelpDesk-Core-Architektur mit projektspezifischen Erweiterungen.

---

## 1. Tech-Stack & Versionen

| Bereich | Technologie | Version |
|---------|-------------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.1.7 |
| Runtime | Node.js | 22+ |
| UI-Library | React | 19.2.3 |
| Sprache | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS v4 (CSS-basiert) | 4.x |
| UI-Primitives | Radix UI + shadcn/ui | aktuell |
| Varianten | class-variance-authority (CVA) | 0.7.1 |
| Datenbank | MySQL 8.x / MariaDB | mysql2 3.20 |
| Auth | JWT via `jose` | 6.2.1 |
| Passwort-Hashing | bcryptjs | 3.0.3 |
| Icons | lucide-react | 0.577+ |
| Datum | date-fns | 4.1.0 |
| Theming | next-themes | 0.4.6 |

---

## 2. Projektstruktur

```
facility-mgmt/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx         # Login mit Jena-Skyline-Animation
│   │   │   └── setup/page.tsx         # Ersteinrichtung (Admin anlegen)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Session-Check → redirect("/login")
│   │   │   ├── dashboard/page.tsx     # Übersicht (bereichsabhängig)
│   │   │   ├── tickets/page.tsx       # Störungsmeldungen (Facility)
│   │   │   ├── tickets/[id]/page.tsx  # Ticket-Detail
│   │   │   ├── locations/page.tsx     # Standortverwaltung (Facility)
│   │   │   ├── locations/[id]/page.tsx# Standort-Detail + OpenStreetMap
│   │   │   ├── vehicles/page.tsx      # Fahrzeugverwaltung (Fuhrpark)
│   │   │   ├── vehicles/[id]/page.tsx # Fahrzeug-Detail
│   │   │   ├── users/page.tsx         # Benutzerverwaltung
│   │   │   ├── settings/page.tsx      # Einstellungen (admin only)
│   │   │   └── profile/page.tsx       # Eigenes Profil
│   │   ├── select/page.tsx            # Bereichsauswahl (nach Login)
│   │   ├── api/
│   │   │   ├── auth/login/route.ts
│   │   │   ├── auth/logout/route.ts
│   │   │   ├── auth/me/route.ts
│   │   │   ├── tickets/route.ts       # GET + POST
│   │   │   ├── tickets/[id]/route.ts  # GET + PUT + DELETE
│   │   │   ├── tickets/[id]/comments/route.ts
│   │   │   ├── locations/route.ts     # GET + POST
│   │   │   ├── locations/[id]/route.ts# GET + PUT + DELETE
│   │   │   ├── vehicles/route.ts      # GET + POST
│   │   │   ├── vehicles/[id]/route.ts # GET + PUT + DELETE
│   │   │   ├── users/route.ts
│   │   │   ├── users/[id]/route.ts
│   │   │   ├── settings/route.ts
│   │   │   ├── notifications/route.ts
│   │   │   └── setup/check/route.ts   # DB-Migrations + Seeds
│   │   ├── layout.tsx                 # Root-Layout (ThemeProvider)
│   │   ├── globals.css                # Tailwind v4 + CSS-Variablen + Animationen
│   │   └── page.tsx                   # Redirect → /dashboard
│   ├── components/
│   │   ├── ui/                        # shadcn/Radix-Primitives
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx              # CVA: default|secondary|destructive|outline|success|warning|info|purple
│   │   │   ├── button.tsx             # CVA: default|destructive|outline|secondary|ghost|link
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── textarea.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx            # Bereichsabhängige Navigation + Umschalter
│   │   │   ├── topbar.tsx             # Theme-Toggle, Notifications, User-Menü
│   │   │   └── area-transition.tsx    # SVG-Animations-Overlay beim Bereichswechsel
│   │   ├── tickets/
│   │   │   ├── ticket-list-client.tsx
│   │   │   └── ticket-detail-client.tsx
│   │   ├── locations/
│   │   │   ├── location-list-client.tsx
│   │   │   └── location-detail-client.tsx
│   │   ├── vehicles/
│   │   │   ├── vehicle-list-client.tsx
│   │   │   └── vehicle-detail-client.tsx
│   │   ├── users/
│   │   │   └── users-client.tsx
│   │   ├── settings/
│   │   │   └── settings-client.tsx
│   │   └── theme-provider.tsx
│   └── lib/
│       ├── db.ts                      # MySQL-Pool, query(), queryOne()
│       ├── auth.ts                    # JWT: signToken, verifyToken, getSession
│       └── utils.ts                   # cn() → clsx + tailwind-merge
├── instrumentation.ts                 # Server-Init (für Pollers reserviert)
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts                 # Leer → Tailwind v4 nutzt CSS
└── package.json
```

---

## 3. Dual-Area-Architektur (Kern-Feature)

### 3.1 Konzept

Das Portal vereint **zwei Bereiche** unter einer Oberfläche:

| Bereich | Zweck | Farbwelt | Icon |
|---------|-------|----------|------|
| **Facility** | Gebäude, Störungen, Standorte | Teal/Emerald | `Building2` |
| **Fuhrpark** | Fahrzeuge, Flotte | Blue/Indigo | `Car` |

### 3.2 Bereichswechsel-Flow

```
Login → /select (Kachel-Auswahl) → localStorage.setItem("active_area", "facility"|"fleet")
                                   ↓
Sidebar liest area aus localStorage → zeigt bereichsabhängige Navigation
                                   ↓
Wechsel-Button in Sidebar → CustomEvent "area-switch" → AreaTransition-Overlay (3s)
                            → Sidebar-Navigation wechselt
```

### 3.3 CustomEvent-Pattern

```typescript
// Auslösen (sidebar.tsx):
window.dispatchEvent(new CustomEvent("area-switch", { detail: newArea }))
setTimeout(() => {
  setArea(newArea)
  localStorage.setItem("active_area", newArea)
}, 800) // Verzögerung für Overlay-Aufbau

// Empfangen (layout.tsx):
useEffect(() => {
  const handler = (e: CustomEvent) => setTransitionArea(e.detail)
  window.addEventListener("area-switch", handler as any)
  return () => window.removeEventListener("area-switch", handler as any)
}, [])
```

### 3.4 Bereichsabhängige Navigation

```typescript
const facilityNav: NavItem[] = [
  { key: "dashboard",  href: "/dashboard",  label: "Dashboard",           icon: LayoutDashboard },
  { key: "tickets",    href: "/tickets",    label: "Störungsmeldungen",    icon: AlertTriangle },
  { key: "locations",  href: "/locations",  label: "Standorte",           icon: MapPin },
  { key: "users",      href: "/users",      label: "Benutzer",            icon: Users, requiredRoles: ["admin", "manager"] },
  { key: "settings",   href: "/settings",   label: "Einstellungen",       icon: Settings, requiredRoles: ["admin"] },
]

const fleetNav: NavItem[] = [
  { key: "dashboard",  href: "/dashboard",  label: "Dashboard",           icon: LayoutDashboard },
  { key: "vehicles",   href: "/vehicles",   label: "Fahrzeuge",           icon: Truck },
  { key: "users",      href: "/users",      label: "Benutzer",            icon: Users, requiredRoles: ["admin", "manager"] },
  { key: "settings",   href: "/settings",   label: "Einstellungen",       icon: Settings, requiredRoles: ["admin"] },
]
```

### 3.5 Bereichsfarben

```typescript
// Sidebar-Styling:
area === "fleet" ? "bg-blue-600" : "bg-primary"         // Button-Hintergrund
area === "fleet"
  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"   // Aktiver Nav-Eintrag
  : "bg-primary/10 text-primary"

// Area-Transition-Gradient:
facility: "from-teal-600/95 via-emerald-600/95 to-teal-700/95"
fleet:    "from-blue-600/95 via-indigo-600/95 to-blue-700/95"

// Select-Page Kacheln:
facility: "--tile-glow: hsl(168 80% 40%)"   // Teal
fleet:    "--tile-glow: hsl(220 80% 50%)"   // Blue
```

---

## 4. Area-Transition-Animationssystem

### 4.1 Facility-Transition: ÜAG-Gebäude

Beim Wechsel auf Facility erscheint das ÜAG-Firmengebäude als SVG:
- 2-geschossiges Gebäude mit zentralem Glaseingang
- Flachdach mit Überstand
- Fensterbänder links/rechts des Eingangs
- Bäume (links 3, rechts 2) mit `treeSway`-Animation
- **5 animierte Personen** laufen von beiden Seiten zum Eingang
- Büsche und Parkplatz-Elemente

**SVG-Hilfskomponenten:**
- `Person({ x, flip, delay, from })` — Strichmännchen mit Walk- und Bob-Animation
- `Tree({ x, h, delay })` — Prozeduraler Laubbaum mit Schwank-Animation

### 4.2 Fuhrpark-Transition: ÜAG-Fahrzeugflotte

Beim Wechsel auf Fuhrpark erscheint eine Straßenszene:
- Straße mit gestrichelter Mittellinie
- **5 ÜAG-Fahrzeuge** fahren von beiden Seiten ein (gestaffelt)
- 3 Fahrzeugtypen: Transporter, PKW, LKW — jeweils mit "ÜAG"-Beschriftung
- `FleetVehicle({ type, delay, direction })` — SVG-Fahrzeug mit Logo

### 4.3 Animations-CSS

```css
/* Overlay: 3s Gesamtdauer */
.area-overlay     { animation: areaOverlayIn 3s ... }
.area-icon-pop    { animation: areaIconPop 0.8s ... 0.3s }
.area-label-slide { animation: areaLabelSlide 0.5s ... 0.7s }
.area-pulse       { animation: areaPulse 1.5s ... 0.3s }

/* Facility */
.facility-bg-anim { animation: facilityBuildRise 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) }
.person-walk-left { animation: personWalkLeft 1.4s ease-out }
.person-walk-right{ animation: personWalkRight 1.4s ease-out }
.person-bob       { animation: personBob 0.5s ease-in-out infinite }
.tree-sway        { animation: treeSway 3s ease-in-out infinite }

/* Fleet */
.fleet-car-left   { animation: fleetDriveLeft 1.8s cubic-bezier(0.16, 1, 0.3, 1) }
.fleet-car-right  { animation: fleetDriveRight 1.8s cubic-bezier(0.16, 1, 0.3, 1) }
```

---

## 5. Login-Seite: Jena-Skyline

### 5.1 Layer-Stack

```
1. Animated gradient      — 20s Farbverlauf-Verschiebung
2. Blueprint grid         — 60×60px Raster, opacity 3–4%
3. Particle canvas        — Canvas-Partikel mit Verbindungslinien
4. Glow orbs             — 3 verschwommene Lichtkreise
5. Jena Skyline SVG       — Erkennbare Wahrzeichen
6. Login card            — Glasmorphism-Karte (z-10)
```

### 5.2 Jena-Wahrzeichen (SVG)

| Landmark | Position | Besonderheit |
|----------|----------|-------------|
| Kernberge | Links | Hügelsilhouette |
| Jenzig | Rechts | Spitzer Kegel |
| Saale | Vordergrund | Wellenförmig + Schimmer-Linie |
| Universität | x=40 | 4×5 Fenstergrid |
| Stadtkirche St. Michael | x=195 | Turm + Spitze + Kreuz + Uhr |
| Zeiss Planetarium | x=420 | Kuppel mit Rippen + Blinklicht |
| JenTower | x=620 | Höchstes Objekt, Panorama-Restaurant, Antenne mit Blinklicht |
| Zeiss HQ | x=710 | Moderne Glasfassade + Linsen-Symbol |
| Ernst-Abbe-Hochhaus | x=830 | Historischer Turm |
| Camsdorfer Brücke | x=560–760 | 4 Bögen über die Saale |
| Wohngebäude | Diverse | Spitzdächer mit Fenstergrid |

### 5.3 Beschriftung

Jedes Wahrzeichen hat ein dezentes Label (CSS-Klasse `skyline-label`):
```css
.skyline-label {
  font-size: 9px;
  fill: hsl(var(--foreground) / 0.15);
  font-weight: 500;
  letter-spacing: 0.5px;
  animation: labelFadeIn 1s ease-out 1.2s both;
}
```

### 5.4 Fenster-Animation (deterministisch)

```typescript
// KEIN Math.random() — verursacht Hydration-Mismatch
const seed = (buildingIndex * 97 + windowIndex * 31 + 7) % 100
const delay = buildingDelay + 0.8 + (seed / 100) * 2
```

### 5.5 Login-Card-Animationen

```css
.login-entrance { animation: loginEntrance 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both; }
.logo-icon      { animation: logoPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both; }
.title-fade     { animation: titleFade 0.5s ease-out 0.7s both; }
.card-glow::before { /* Gradient-Border mit mask-composite */ }
```

---

## 6. Konfiguration

### 6.1 Umgebungsvariablen (`.env.local`)

```bash
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=facility_mgmt
DB_USER=helpdesk
DB_PASSWORD=<geheim>
DB_SOCKET=                 # Optional: Unix-Socket (Linux)

APP_SECRET_KEY=<zufällig>  # JWT-Signing
APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Facility & Fuhrpark
```

### 6.2 Dev-Server-Port

Standard-Port ist **3001** (nicht 3000), um nicht mit helpdesk-core zu kollidieren:
```json
{ "dev": "next dev -p 3001" }
```

---

## 7. Farbschema & Theming

### 7.1 CSS-Variablen (HSL-basiert)

```css
:root {
  --radius: 0.625rem;
  --primary: 168 75% 38%;           /* Teal (Facility-Primärfarbe) */
  --background: 0 0% 98%;
  --foreground: 220 20% 12%;
  --card: 0 0% 100%;
  --muted: 210 20% 96%;
  --destructive: 0 84% 60%;
}

.dark {
  --primary: 168 75% 45%;           /* Heller Teal für Dark Mode */
  --background: 220 25% 6%;
  --foreground: 210 20% 92%;
  --card: 220 20% 10%;
  --muted: 220 15% 15%;
  --destructive: 0 63% 31%;
}
```

### 7.2 Designprinzipien

- **Primärfarbe:** Teal (`hsl(168, 75%, 38%)`) — Facility-Welt
- **Sekundärfarbe:** Blue (`hsl(220, 80%, 50%)`) — Fuhrpark-Welt
- **Border-Radius:** `0.625rem` (rounded-lg)
- **Schrift:** Inter (System-Stack)
- **Dark Mode:** `next-themes` mit `attribute="class"`, `enableSystem: true`
- **Animationen:** Umfangreiche Keyframe-Bibliothek (20+ Animationen)

---

## 8. Datenbank-Schema

### 8.1 Gemeinsame Tabellen

```sql
-- Benutzer
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(200) DEFAULT 'melder',
  group_id INT UNSIGNED DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gruppen (hierarchisch)
CREATE TABLE `groups` (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_id INT UNSIGNED DEFAULT NULL,
  default_roles VARCHAR(200) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rollen (mit Farb-Badges)
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100),
  color VARCHAR(150),          -- Tailwind-Klassen z.B. "bg-red-100 text-red-800 ..."
  is_builtin TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 100
);

-- Key-Value Einstellungen
CREATE TABLE settings (key_name VARCHAR(100) UNIQUE, value TEXT);

-- Benachrichtigungen
CREATE TABLE notifications (
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL, message TEXT,
  is_read TINYINT(1) DEFAULT 0, link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Standorte
CREATE TABLE locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  street VARCHAR(200), zip VARCHAR(10), city VARCHAR(100),
  contact_name VARCHAR(150), contact_phone VARCHAR(100), contact_email VARCHAR(200),
  notes TEXT,
  latitude DECIMAL(10, 7), longitude DECIMAL(10, 7),
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8.2 Facility-Tabellen (Störungsmeldungen)

```sql
CREATE TABLE tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'Sonstiges',
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  status ENUM('open','in_progress','waiting','resolved','closed') DEFAULT 'open',
  location_building VARCHAR(100),
  location_floor VARCHAR(50),
  location_room VARCHAR(50),
  location_id INT UNSIGNED DEFAULT NULL,
  requester_id INT UNSIGNED NOT NULL,
  assigned_to_user_id INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL
);

CREATE TABLE ticket_counters (year INT PRIMARY KEY, last_number INT DEFAULT 0);
CREATE TABLE ticket_comments (ticket_id INT, user_id INT, content TEXT, is_internal, is_system);
CREATE TABLE ticket_attachments (ticket_id INT, filename, original_name, mime_type, size_bytes, uploaded_by);

-- Vordefinierte Kategorien
CREATE TABLE ticket_categories (
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),       -- Lucide-Icon-Name
  sort_order INT DEFAULT 0,
  active TINYINT(1) DEFAULT 1
);
-- Seeds: Elektrik, Sanitär, Heizung/Klima, Aufzug, Reinigung, Sicherheit, Gebäude, Sonstiges
```

### 8.3 Fuhrpark-Tabellen

```sql
CREATE TABLE vehicles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  license_plate VARCHAR(20) NOT NULL,
  make VARCHAR(100),                    -- Hersteller
  model VARCHAR(100),                   -- Modell
  type ENUM('pkw','transporter','lkw','anhaenger','sonstige') DEFAULT 'pkw',
  year INT,
  color VARCHAR(50),
  vin VARCHAR(50),                      -- Fahrgestellnummer
  status ENUM('verfuegbar','in_nutzung','werkstatt','ausgemustert') DEFAULT 'verfuegbar',
  assigned_to_user_id INT UNSIGNED,     -- Zugewiesener Nutzer
  location_id INT UNSIGNED,             -- Standort
  mileage INT,                          -- Kilometerstand
  fuel_type VARCHAR(30),                -- Kraftstoffart
  next_inspection DATE,                 -- Nächste Inspektion
  next_tuv DATE,                        -- TÜV-Termin
  insurance_until DATE,                 -- Versicherung bis
  notes TEXT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. Rollen-System

### 9.1 Eingebaute Rollen

| Rolle | Label | Farbe | Berechtigung |
|-------|-------|-------|-------------|
| `admin` | Administrator | Rot | Vollzugriff |
| `manager` | Manager | Blau | Benutzer + Einstellungen verwalten |
| `techniker` | Techniker | Amber | Tickets bearbeiten/zuweisen |
| `hausmeister` | Hausmeister | Emerald | Tickets sehen/bearbeiten |
| `melder` | Melder | Grau | Nur eigene Störungen melden |

### 9.2 Berechtigungsprüfung

```typescript
const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
const isAdmin = session.role.includes("admin")

// Navigation-Sichtbarkeit:
// admin sieht immer alles
// Andere Rollen: nur wenn requiredRoles-Array die Rolle enthält (oder leer)
```

---

## 10. Status-Werte

### 10.1 Tickets (Störungsmeldungen)

```typescript
'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
```

| Status | Badge-Variant | Deutsch |
|--------|--------------|---------|
| `open` | `info` | Offen |
| `in_progress` | `purple` | In Bearbeitung |
| `waiting` | `warning` | Wartend |
| `resolved` | `success` | Gelöst |
| `closed` | `secondary` | Geschlossen |

### 10.2 Fahrzeuge

```typescript
'verfuegbar' | 'in_nutzung' | 'werkstatt' | 'ausgemustert'
```

| Status | Badge-Variant | Deutsch |
|--------|--------------|---------|
| `verfuegbar` | `success` | Verfügbar |
| `in_nutzung` | `info` | In Nutzung |
| `werkstatt` | `warning` | Werkstatt |
| `ausgemustert` | `secondary` | Ausgemustert |

### 10.3 Fahrzeugtypen

```typescript
'pkw' | 'transporter' | 'lkw' | 'anhaenger' | 'sonstige'
```

### 10.4 Ticket-Kategorien (Facility)

Elektrik, Sanitär, Heizung/Klima, Aufzug, Reinigung, Sicherheit, Gebäude, Sonstiges

---

## 11. Animations-Bibliothek (globals.css)

### 11.1 Login-Seite

| Klasse | Keyframe | Dauer | Beschreibung |
|--------|----------|-------|-------------|
| `.animate-gradient` | `gradientShift` | 20s | Hintergrund-Gradient verschiebt sich |
| `.animate-orb` | `orbFloat` | 12s | Glow-Orbs schweben + skalieren |
| `.skyline-building` | `buildingRise` | 0.8s | Gebäude steigen von unten |
| `.skyline-label` | `labelFadeIn` | 1s | Labels erscheinen nach 1.2s Delay |
| `.window-light` | `windowGlow` | 4s | Fenster-Flimmern (gold → transparent) |
| `.animate-blink` | `blink` | 3s | Antennen-Blinklicht |
| `.login-entrance` | `loginEntrance` | 0.7s | Card-Eintritt (blur + scale + translateY) |
| `.logo-icon` | `logoPop` | 0.5s | Logo springt rein (Bounce) |
| `.title-fade` | `titleFade` | 0.5s | Titel blendet ein |
| `.animate-shake` | `shake` | 0.5s | Fehler-Shake |

### 11.2 Bereichsauswahl (/select)

| Klasse | Keyframe | Dauer | Beschreibung |
|--------|----------|-------|-------------|
| `.tile-entry` | `tileEntry` | 0.6s | Kachel erscheint (scale + translateY) |
| `.icon-float` | `iconFloat` | 3s | Icon schwebt sanft |
| `.tile-glow` | `tileGlow` | 4s | Pulsierender Schatten auf Kachel |

### 11.3 Bereichswechsel

| Klasse | Keyframe | Dauer | Beschreibung |
|--------|----------|-------|-------------|
| `.area-overlay` | `areaOverlayIn` | 3s | Vollbild-Overlay: fade in → hold → fade out |
| `.area-icon-pop` | `areaIconPop` | 0.8s | Bereichs-Icon springt rein |
| `.area-label-slide` | `areaLabelSlide` | 0.5s | Bereichs-Text gleitet hoch |
| `.area-pulse` | `areaPulse` | 1.5s | Radialer Puls hinter Icon |
| `.facility-bg-anim` | `facilityBuildRise` | 1.2s | ÜAG-Gebäude steigt auf |
| `.person-walk-left` | `personWalkLeft` | 1.4s | Person läuft von links ein |
| `.person-walk-right` | `personWalkRight` | 1.4s | Person läuft von rechts ein |
| `.person-bob` | `personBob` | 0.5s∞ | Schrittbewegung (endlos) |
| `.tree-sway` | `treeSway` | 3s∞ | Baum wiegt im Wind (endlos) |
| `.fleet-car-left` | `fleetDriveLeft` | 1.8s | Fahrzeug fährt von links ein |
| `.fleet-car-right` | `fleetDriveRight` | 1.8s | Fahrzeug fährt von rechts ein |

### 11.4 Allgemein

| Klasse | Dauer | Beschreibung |
|--------|-------|-------------|
| `.animate-fade-in` | 0.2s | Seiten-Eintritt |
| `.card-glow::before` | hover | Gradient-Border mit mask-composite |

---

## 12. API-Patterns

### 12.1 Standard-Endpunkt

```typescript
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "25")
  const offset = (page - 1) * limit

  let where = "WHERE 1=1"
  const params: any[] = []
  if (search) { where += " AND (name LIKE ? OR city LIKE ?)"; params.push(`%${search}%`, `%${search}%`) }

  const items = await query(`SELECT * FROM locations ${where} ORDER BY name LIMIT ${limit} OFFSET ${offset}`, params)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const [result] = await query("INSERT INTO ... VALUES (...)", [...]) as any
  return NextResponse.json({ id: result.insertId }, { status: 201 })
}
```

### 12.2 LIMIT/OFFSET-Workaround (MySQL 8.4)

```typescript
// FALSCH: await pool.execute('SELECT * FROM t LIMIT ? OFFSET ?', [limit, offset])
// RICHTIG: parseInt-Werte direkt interpolieren:
const items = await query(`SELECT * FROM t LIMIT ${limit} OFFSET ${offset}`, whereParams)
```

---

## 13. Namenskonventionen

### 13.1 Sprache

| Bereich | Sprache | Beispiel |
|---------|---------|---------|
| UI-Labels & Texte | **Deutsch** | "Störungsmeldung erstellen", "Abbrechen" |
| Fehlermeldungen | **Deutsch** | "Keine Berechtigung" |
| DB-Spaltennamen | **Englisch**, snake_case | `created_at`, `assigned_to_user_id` |
| DB-ENUMs | **Deutsch** bei Fachbegriffen | `verfuegbar`, `werkstatt`, `ausgemustert` |
| Variablen/Funktionen | **Englisch**, camelCase | `fetchTickets`, `isPrivileged` |
| Komponenten-Dateien | kebab-case | `ticket-list-client.tsx`, `vehicle-detail-client.tsx` |

### 13.2 Suffix-Konvention

| Suffix | Bedeutung |
|--------|----------|
| `*-client.tsx` | Client-Komponente mit Interaktivität |
| `page.tsx` | Server-seitige Seite (rendert Client-Komponente) |
| `route.ts` | API-Endpunkt |

---

## 14. Hydration-Fallstricke

### 14.1 Kein `Math.random()` im Render

```typescript
// FALSCH — verschiedene Werte auf Server/Client:
style={{ animationDelay: `${Math.random() * 2}s` }}

// RICHTIG — deterministisch mit Seed:
const seed = (buildingIndex * 97 + windowIndex * 31 + 7) % 100
const delay = baseDelay + 0.8 + (seed / 100) * 2
style={{ animationDelay: `${delay.toFixed(2)}s` }}
```

### 14.2 Theme-Toggle mit `mounted`-Guard

```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])

// Im Render:
{mounted && <ParticleCanvas />}   // Canvas nur client-side
{mounted ? (theme === "dark" ? <Sun /> : <Moon />) : <div className="h-4 w-4" />}
```

---

## 15. Bekannte Fallstricke

| Problem | Lösung |
|---------|--------|
| MySQL 8.4 + `LIMIT ?` in Prepared Statements | `LIMIT ${parseInt(limit)}` direkt interpolieren |
| Hydration-Mismatch bei `Math.random()` | Deterministische Seed-Berechnung nutzen |
| Theme-Icon (Sun/Moon) Hydration-Mismatch | `mounted`-State als Guard |
| Next.js 16: Statische Route von `[id]` überschattet | Route auf eigene Top-Level-Ebene |
| Dev-Port 3000 bereits belegt (helpdesk-core) | Port 3001 nutzen |
| `pool.execute` vs `pool.query` | `execute` = Prepared Statements (sicher) |

---

## 16. Zusammenfassung der Designprinzipien

1. **Dual-Area-Architektur** — Facility (Teal) + Fuhrpark (Blue), nahtloser Wechsel
2. **Deutsch-First UI** — Alle sichtbaren Texte in Deutsch, technische Bezeichner in Englisch
3. **Jena-Skyline Login** — Erkennbare Wahrzeichen mit beschrifteten Labels
4. **Thematische Transitions** — ÜAG-Gebäude (Facility) / ÜAG-Fahrzeuge (Fuhrpark)
5. **Dark Mode Standard** — Immer Light + Dark via CSS-Variablen
6. **CVA + Radix** — UI-Varianten über `class-variance-authority`
7. **Prepared Statements** — Alle DB-Queries über `pool.execute` mit `?` (außer LIMIT/OFFSET)
8. **JWT in HttpOnly Cookie** — Kein localStorage-Token
9. **Deterministische Animationen** — Kein `Math.random()` im SSR, Seed-basierte Delays
10. **Komma-separierte Rollen** — Flexibles RBAC ohne Join-Tabelle
11. **`animate-fade-in`** — Jede Seite mit sanfter Einblendung
12. **Umfangreiche SVG-Animationen** — 20+ Keyframes für immersive Übergänge
