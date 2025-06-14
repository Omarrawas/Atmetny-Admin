import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  Timestamp,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getCountFromServer,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebaseClient';
import type { User, Subject, Question, Exam, Tag } from '@/types';

// Generic Firestore utility functions
const createDocument = async <T extends { createdAt: Timestamp, updatedAt: Timestamp }>(collectionPath: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, collectionPath), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

const createDocumentWithId = async <T extends { createdAt: Timestamp, updatedAt: Timestamp }>(collectionPath: string, id: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  await setDoc(doc(db, collectionPath, id), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};


const getDocument = async <T>(collectionPath: string, id: string): Promise<T | null> => {
  const docRef = doc(db, collectionPath, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

const getDocuments = async <T>(collectionPath: string, q?: any): Promise<T[]> => { // q can be Query
  const queryToExecute = q || collection(db, collectionPath);
  const querySnapshot = await getDocs(queryToExecute);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

const updateDocument = async <T>(collectionPath: string, id: string, data: Partial<T>): Promise<void> => {
  const docRef = doc(db, collectionPath, id);
  await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
};

const deleteDocument = async (collectionPath: string, id: string): Promise<void> => {
  const docRef = doc(db, collectionPath, id);
  await deleteDoc(docRef);
};

// User specific functions
export const getUser = (id: string) => getDocument<User>('users', id);
export const getUsers = (queryParams?: { page?: number, perPage?: number }) => {
    let q = query(collection(db, 'users'), orderBy('email'));
    // Add pagination if needed, e.g., using limit and startAfter
    return getDocuments<User>('users', q);
};
export const updateUserRole = (id: string, role: User['role']) => updateDocument<User>('users', id, { role });
export const getTotalUsersCount = async () => {
    const coll = collection(db, "users");
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
}


// Subject specific functions
export const createSubject = (data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => createDocument<Subject>('subjects', data);
export const getSubject = (id: string) => getDocument<Subject>('subjects', id);
export const getSubjects = (queryParams?: { page?: number, perPage?: number }) => {
    let q = query(collection(db, 'subjects'), orderBy('name'));
    return getDocuments<Subject>('subjects', q);
};
export const updateSubject = (id: string, data: Partial<Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>>) => updateDocument<Subject>('subjects', id, data);
export const deleteSubject = (id: string) => deleteDocument('subjects', id);
export const getTotalSubjectsCount = async () => {
    const coll = collection(db, "subjects");
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
}


// Question specific functions
export const createQuestion = (data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => createDocument<Question>('questions', data);
export const getQuestion = (id: string) => getDocument<Question>('questions', id);
export const getQuestions = (queryParams?: { subjectId?: string, page?: number, perPage?: number }) => {
    let q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    if (queryParams?.subjectId) {
        q = query(q, where('subjectId', '==', queryParams.subjectId));
    }
    return getDocuments<Question>('questions', q);
};
export const updateQuestion = (id: string, data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => updateDocument<Question>('questions', id, data);
export const deleteQuestion = (id: string) => deleteDocument('questions', id);
export const getTotalQuestionsCount = async () => {
    const coll = collection(db, "questions");
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
}
export const getQuestionsByIds = async (questionIds: string[]): Promise<Question[]> => {
  if (!questionIds || questionIds.length === 0) return [];
  // Firestore 'in' query supports up to 30 equality clauses. If more, split into multiple queries.
  // For simplicity, this example assumes questionIds.length <= 30.
  const q = query(collection(db, 'questions'), where('__name__', 'in', questionIds));
  return getDocuments<Question>('questions', q);
}


// Exam specific functions
export const createExam = (data: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => createDocument<Exam>('exams', data);
export const getExam = (id: string) => getDocument<Exam>('exams', id);
export const getExams = (queryParams?: { page?: number, perPage?: number }) => {
    let q = query(collection(db, 'exams'), orderBy('title'));
    return getDocuments<Exam>('exams', q);
};
export const updateExam = (id: string, data: Partial<Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>>) => updateDocument<Exam>('exams', id, data);
export const deleteExam = (id: string) => deleteDocument('exams', id);
export const getTotalExamsCount = async () => {
    const coll = collection(db, "exams");
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
}

// Tag specific functions
export const createTag = (data: Omit<Tag, 'id'>) => addDoc(collection(db, 'tags'), data).then(ref => ref.id);
export const getTags = () => getDocuments<Tag>('tags', query(collection(db, 'tags'), orderBy('name')));
export const getTag = (id: string) => getDocument<Tag>('tags', id);
export const updateTag = (id: string, data: Partial<Omit<Tag, 'id'>>) => updateDocument<Tag>('tags', id, data);
export const deleteTag = (id: string) => deleteDocument('tags', id);

export const getFirestoreDB = () => db;
export const getNewBatch = (): WriteBatch => writeBatch(db);
