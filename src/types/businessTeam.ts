export type TeamRole = 'admin' | 'cashier' | 'seller' | 'warehouse' | 'viewer'
export type TeamStatus = 'active' | 'inactive'
export type BusinessTeamMember = { id: string; userId: string; displayName: string; email: string; role: TeamRole | 'owner'; status: TeamStatus; createdAt: Date | null }
export type CreateBusinessTeamUserInput = { displayName: string; email: string; temporaryPassword: string; role: TeamRole }
