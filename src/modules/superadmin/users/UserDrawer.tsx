import { useEffect, useState, type FormEvent } from 'react'

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
import { createPlatformUser, updatePlatformUser } from '../../../services'
import type {
  PlatformRole,
  PlatformUser,
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
  user?: PlatformUser | null
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
  user,
  onClose,
  onSaved,
}: UserDrawerProps) {
  const toast = useToast()

  const [form, setForm] = useState<UserForm>(initialForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const editing = Boolean(user)

  useEffect(() => {
    if (!open) {
      return
    }

    setForm(
      user
        ? {
            displayName: user.displayName,
            email: user.email,
            temporaryPassword: '',
            platformRole: user.platformRole,
            status: user.status,
          }
        : initialForm,
    )
    setFormError('')
  }, [open, user])

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

    if (!editing && form.temporaryPassword.length < 6) {
      setFormError(
        'La contraseña temporal debe tener al menos 6 caracteres.',
      )
      return
    }

    try {
      setSaving(true)

      const message = user
        ? await updatePlatformUser({
            uid: user.uid,
            displayName,
            platformRole: form.platformRole,
            status: form.status,
          })
        : await createPlatformUser({
            ...form,
            displayName,
            email,
          })

      toast.success(
        editing ? 'Usuario actualizado' : 'Usuario creado',
        message,
      )

      resetForm()
      onClose()
      onSaved?.()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible guardar el usuario.'

      setFormError(message)

      toast.error(
        'Error al guardar usuario',
        message,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      title={editing ? 'Editar usuario' : 'Crear usuario'}
      description={
        editing
          ? 'Actualiza el nombre, rol y estado de acceso.'
          : 'Registra un nuevo usuario y define su acceso inicial.'
      }
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
          disabled={saving || editing}
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

        {!editing && (
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
        )}

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
