import {
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'

type UserStatsProps = {
  totalUsers: number
  activeUsers: number
  superAdmins: number
  blockedUsers: number
}

export function UserStats({
  totalUsers,
  activeUsers,
  superAdmins,
  blockedUsers,
}: UserStatsProps) {
  return (
    <section className="users-stats">
      <article>
        <div className="stat-icon">
          <Users size={21} />
        </div>

        <div>
          <span>Usuarios registrados</span>
          <strong>{totalUsers}</strong>
        </div>
      </article>

      <article>
        <div className="stat-icon">
          <UserCheck size={21} />
        </div>

        <div>
          <span>Usuarios activos</span>
          <strong>{activeUsers}</strong>
        </div>
      </article>

      <article>
        <div className="stat-icon">
          <ShieldCheck size={21} />
        </div>

        <div>
          <span>Super Admins</span>
          <strong>{superAdmins}</strong>
        </div>
      </article>

      <article>
        <div className="stat-icon">
          <UserX size={21} />
        </div>

        <div>
          <span>Bloqueados</span>
          <strong>{blockedUsers}</strong>
        </div>
      </article>
    </section>
  )
}