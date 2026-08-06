import { doc, getDoc } from 'firebase/firestore'

import { db } from '../config/firebase'

import type { UserProfile } from '../types/UserProfile'

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
