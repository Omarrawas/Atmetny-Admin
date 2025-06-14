'use server';

import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebaseClient';
import type { Question } from '@/types';

export async function getQuestionsBySubjectId(subjectId: string): Promise<Question[]> {
  if (!subjectId) return [];
  try {
    const q = query(
      collection(db, 'questions'),
      where('subjectId', '==', subjectId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
  } catch (error) {
    console.error("Error fetching questions by subject ID:", error);
    return [];
  }
}
