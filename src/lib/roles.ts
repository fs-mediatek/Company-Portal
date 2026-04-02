let rolesCache: any[] | null = null
let cacheTime = 0

export async function fetchRoles(): Promise<any[]> {
  if (rolesCache && Date.now() - cacheTime < 30000) return rolesCache
  try {
    const res = await fetch("/api/roles")
    if (!res.ok) return []
    const data = await res.json()
    rolesCache = data
    cacheTime = Date.now()
    return data
  } catch {
    return []
  }
}

export function roleLabel(roles: any[], name: string): string {
  const role = roles.find(r => r.name === name)
  return role?.label || name
}

export function roleColor(roles: any[], name: string): string {
  const role = roles.find(r => r.name === name)
  return role?.color || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
}
