import { query } from "@/lib/db"

export async function getEffectiveRoles(userId: number): Promise<string[]> {
  const user = await query<any>(
    'SELECT role, group_id FROM users WHERE id = ?',
    [userId]
  )
  if (!user.length) return []

  const personalRoles = (user[0].role || '').split(',').map((r: string) => r.trim()).filter(Boolean)
  const groupId = user[0].group_id

  if (!groupId) return [...new Set(personalRoles)]

  // Walk up group hierarchy collecting default_roles
  const groupRoles: string[] = []
  let currentGroupId: number | null = groupId
  const visited = new Set<number>()

  while (currentGroupId && !visited.has(currentGroupId)) {
    visited.add(currentGroupId)
    const group = await query<any>(
      'SELECT default_roles, parent_id FROM `groups` WHERE id = ?',
      [currentGroupId]
    )
    if (!group.length) break
    if (group[0].default_roles) {
      groupRoles.push(...group[0].default_roles.split(',').map((r: string) => r.trim()).filter(Boolean))
    }
    currentGroupId = group[0].parent_id
  }

  return [...new Set([...personalRoles, ...groupRoles])]
}
