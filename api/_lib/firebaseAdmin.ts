import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const ADMIN_APP_NAME = 'inventrapp-admin'

type FirebaseAdminServices = {
  auth: ReturnType<typeof getAuth>
  db: ReturnType<typeof getFirestore>
  storage: ReturnType<typeof getStorage>
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`)
  }

  return value
}

export function getFirebaseAdmin(): FirebaseAdminServices {
  const existingApp = getApps().find(
    (app) => app.name === ADMIN_APP_NAME,
  )

  const projectId = getRequiredEnvironmentVariable('FIREBASE_ADMIN_PROJECT_ID')
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim() || process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || `${projectId}.firebasestorage.app`
  const app =
    existingApp ??
    initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail: getRequiredEnvironmentVariable(
            'FIREBASE_ADMIN_CLIENT_EMAIL',
          ),
          privateKey: getRequiredEnvironmentVariable(
            'FIREBASE_ADMIN_PRIVATE_KEY',
          ).replace(/\\n/g, '\n'),
        }),
        storageBucket,
      },
      ADMIN_APP_NAME,
    )

  const initializedApp = existingApp
    ? getApp(ADMIN_APP_NAME)
    : app

  return {
    auth: getAuth(initializedApp),
    db: getFirestore(initializedApp),
    storage: getStorage(initializedApp),
  }
}
