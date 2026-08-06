import { FieldValue } from 'firebase-admin/firestore'

import {
  adminAuth,
  adminDb,
} from '../_lib/firebaseAdmin'

type CreateUserBody = {
  displayName?: string
  email?: string
  temporaryPassword?: string
  platformRole?: 'user' | 'support' | 'super_admin'
  status?: 'active' | 'blocked'
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

async function verifySuperAdmin(request: Request) {
  const authorization = request.headers.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED')
  }

  const idToken = authorization.slice(7)
  const decodedToken = await adminAuth.verifyIdToken(idToken)

  const profile = await adminDb
    .collection('users')
    .doc(decodedToken.uid)
    .get()

  if (
    !profile.exists ||
    profile.data()?.platformRole !== 'super_admin' ||
    profile.data()?.status !== 'active'
  ) {
    throw new Error('FORBIDDEN')
  }

  return decodedToken
}

export async function POST(request: Request) {
  let createdUid: string | null = null

  try {
    const authenticatedAdmin = await verifySuperAdmin(request)
    const body = (await request.json()) as CreateUserBody

    const displayName = body.displayName?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.temporaryPassword
    const platformRole = body.platformRole ?? 'user'
    const status = body.status ?? 'active'

    if (!displayName || !email || !password) {
      return json(
        {
          message:
            'Nombre, correo y contraseña son obligatorios.',
        },
        400,
      )
    }

    if (password.length < 6) {
      return json(
        {
          message:
            'La contraseña debe tener al menos 6 caracteres.',
        },
        400,
      )
    }

    const newUser = await adminAuth.createUser({
      displayName,
      email,
      password,
      disabled: status === 'blocked',
    })

    createdUid = newUser.uid

    await adminDb.collection('users').doc(newUser.uid).set({
      displayName,
      email,
      platformRole,
      status,
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: authenticatedAdmin.uid,
      updatedBy: authenticatedAdmin.uid,
    })

    return json(
      {
        message: 'Usuario creado correctamente.',
        user: {
          uid: newUser.uid,
          displayName,
          email,
          platformRole,
          status,
        },
      },
      201,
    )
  } catch (error) {
    console.error('Error creando usuario:', error)

    if (createdUid) {
      await adminAuth.deleteUser(createdUid).catch(console.error)
    }

    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error
        ? String(error.code)
        : ''

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return json({ message: 'Debes iniciar sesión.' }, 401)
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return json(
        {
          message:
            'No tienes permisos para crear usuarios.',
        },
        403,
      )
    }

    if (errorCode === 'auth/email-already-exists') {
      return json(
        {
          message:
            'El correo electrónico ya está registrado.',
        },
        409,
      )
    }

    return json(
      {
        message:
          'No fue posible crear el usuario.',
      },
      500,
    )
  }
}