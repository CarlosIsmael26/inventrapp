import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore'

import { db } from '../config/firebase'

import type {
  PlatformRole,
  PlatformUser,
  UserStatus,
} from '../types/user'

import type { UserProfile } from '../types/UserProfile'

type FirestoreUser = {
  displayName?: string
  email?: string
  platformRole?: PlatformRole
  status?: UserStatus
  businessName?: string
  businessRole?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

function mapUserDocument(
  document: QueryDocumentSnapshot<DocumentData>,
): PlatformUser {
  const data = document.data() as FirestoreUser

  return {
    uid: document.id,
    displayName: data.displayName ?? 'Usuario sin nombre',
    email: data.email ?? '',
    platformRole: data.platformRole ?? 'user',
    status: data.status ?? 'active',
    businessName: data.businessName ?? 'Sin negocio',
    businessRole: data.businessRole ?? 'Sin asignar',
    createdAt: data.createdAt?.toDate() ?? null,
    updatedAt: data.updatedAt?.toDate() ?? null,
  }
}

export async function getPlatformUsers(): Promise<
  PlatformUser[]
> {
  const usersReference = collection(db, 'users')

  try {
    const usersQuery = query(
      usersReference,
      orderBy('createdAt', 'desc'),
    )

    const snapshot = await getDocs(usersQuery)

    return snapshot.docs.map(mapUserDocument)
  } catch (error) {
    console.warn(
      'No fue posible ordenar los usuarios por fecha.',
      error,
    )

    const snapshot = await getDocs(usersReference)

    return snapshot.docs.map(mapUserDocument)
  }
}

export async function getUserProfile(
  uid: string,
): Promise<UserProfile | null> {
  const userReference = doc(db, 'users', uid)

  const snapshot = await getDoc(userReference)

  if (!snapshot.exists()) {
    return null
  }

  return {
    uid: snapshot.id,
    ...snapshot.data(),
  } as UserProfile
}