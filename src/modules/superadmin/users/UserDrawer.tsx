import { useState, type FormEvent } from 'react'

import { Drawer } from '../../../components/drawer'
import {
  PasswordField,
  SelectField,
  TextField,
  type SelectOption,
} from '../../../components/forms'
import {
  Button,
  useToast,
} from '../../../components/ui'
import { createPlatformUser } from '../../../services'
import type {
  PlatformRole,
  UserStatus,
} from '../../../types/user'

type UserForm = {
  displayName: string
  email: string
  temporaryPassword: string
  platformRole: PlatformRole
  status: UserStatus
}

type UserDrawerProps = {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

const initialForm: UserForm = {
  displayName: '',
  email: '',
  temporaryPassword: '',
  platformRole: 'user',
  status: 'active',
}

const platformRoleOptions: SelectOption[] = [
  { value: 'user', label: 'Usuario' },
  { value: 'support', label: 'Soporte' },
  { value: 'super_admin', label: 'Super Admin' },
]

const statusOptions: SelectOption[] = [
  { value: 'active', label: 'Activo' },
  { value: 'blocked', label: 'Bloqueado' },
]

export function UserDrawer({
  open,
  onClose,
  onSaved,
}: UserDrawerProps) {
  const toast = useToast()

  const [form, setForm] = useState<UserForm>(initialForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  function updateField<K extends keyof UserForm>(
    field: K,
    value: UserForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setFormError('')
  }

  function handleClose() {
    if (saving) {
      return
    }

    resetForm()
    onClose()
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setFormError('')

    const displayName = form.displayName.trim()
    const email = form.email.trim().toLowerCase()

    if (!displayName) {
      setFormError('Ingresa el nombre completo.')
      return
    }

    if (!email) {
      setFormError('Ingresa el correo electrónico.')
      return
    }

    if (form.temporaryPassword.length < 6) {
      setFormError(
        'La contraseña temporal debe tener al menos 6 caracteres.',
      )
      return
    }

    try {
      setSaving(true)

      const result = await createPlatformUser({
        ...form,
        displayName,
        email,
      })

      toast.success(
        'Usuario creado',
        result.message,
      )

      resetForm()
      onClose()
      onSaved?.()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible crear el usuario.'

      setFormError(message)

      toast.error(
        'Error al crear usuario',
        message,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      title="Crear usuario"
      description="Registra un nuevo usuario y define su acceso inicial."
      onClose={handleClose}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={handleClose}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            form="create-user-form"
            loading={saving}
          >
            Guardar usuario
          </Button>
        </>
      }
    >
      <form
        id="create-user-form"
        className="user-form"
        onSubmit={handleSubmit}
      >
        <TextField
          id="displayName"
          label="Nombre completo"
          placeholder="Ej. Juan Pérez"
          value={form.displayName}
          required
          disabled={saving}
          onChange={(value) =>
            updateField('displayName', value)
          }
        />

        <TextField
          id="email"
          type="email"
          label="Correo electrónico"
          placeholder="usuario@correo.com"
          value={form.email}
          required
          disabled={saving}
          autoComplete="email"
          onChange={(value) =>
            updateField('email', value)
          }
        />

        <PasswordField
          id="temporaryPassword"
          label="Contraseña temporal"
          placeholder="Mínimo 6 caracteres"
          value={form.temporaryPassword}
          helperText="El usuario deberá cambiarla después de ingresar."
          required
          disabled={saving}
          onChange={(value) =>
            updateField('temporaryPassword', value)
          }
        />

        <SelectField
          id="platformRole"
          label="Rol de plataforma"
          value={form.platformRole}
          options={platformRoleOptions}
          disabled={saving}
          onChange={(value) =>
            updateField(
              'platformRole',
              value as PlatformRole,
            )
          }
        />

        <SelectField
          id="status"
          label="Estado inicial"
          value={form.status}
          options={statusOptions}
          disabled={saving}
          onChange={(value) =>
            updateField(
              'status',
              value as UserStatus,
            )
          }
        />

        {formError && (
          <div className="form-error">
            {formError}
          </div>
        )}
      </form>
    </Drawer>
  )
}