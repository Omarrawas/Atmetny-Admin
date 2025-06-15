// src/lib/firestore.ts
// IMPORTANT: All functions in this file need to be reimplemented to use Supabase.
// Only getSubjects and getTags have a skeletal implementation for demonstration.
// ALL OTHER FUNCTIONS WILL THROW ERRORS.

import { supabase } from '@/lib/supabaseClient';
import type { Question, Exam, NewsArticle, Subject, AccessCode, SubjectSection, Lesson, UserProfile, Tag, ExamAttempt, AppSettings, Announcement } from '@/types';

const NOT_IMPLEMENTED_ERROR = "This function is not implemented for Supabase. Please update src/lib/firestore.ts";

// --- Helper for Timestamps (if needed, Supabase usually returns ISO strings) ---
export const convertTimestampsToDates = (data: any[]): any[] => {
  return data.map(item => {
    const newItem = { ...item };
    for (const key in newItem) {
      if (newItem[key] instanceof Date) {
        newItem[key] = newItem[key].toISOString();
      } else if (Array.isArray(newItem[key])) {
        newItem[key] = convertTimestampsToDates(newItem[key]);
      }
    }
    return newItem;
  });
};


// --- Subjects ---
export const addSubject = async (data: Omit<Subject, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  const { data: newSubject, error } = await supabase.from('subjects').insert(data).select().single();
  if (error) throw error; 
  return newSubject.id;
};

export const getSubjects = async (): Promise<Subject[]> => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching subjects from Supabase (in firestore.ts):", error);
    throw error; 
  }
  return (data as Subject[]) || [];
};

export const updateSubject = async (id: string, data: Partial<Omit<Subject, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  const { error } = await supabase.from('subjects').update(data).eq('id', id);
  if (error) throw error;
};
export const deleteSubject = async (subjectId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteSubject"); };
export const getSubjectById = async (id: string): Promise<Subject | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectById"); };
export const getSubjectsWithDetails = async (): Promise<Subject[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectsWithDetails"); };

// --- Questions ---
export const addQuestion = async (data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addQuestion"); };
export const getQuestions = async (): Promise<Question[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getQuestions"); };
export const updateQuestion = async (id: string, data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateQuestion"); };
export const deleteQuestion = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteQuestion"); };
export const getQuestionById = async (id: string): Promise<Question | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getQuestionById"); };
export const importQuestionsBatch = async (questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": importQuestionsBatch"); };

// --- Exams ---
export const addExam = async (data: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addExam"); };
export const getExams = async (): Promise<Exam[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getExams"); };
export const updateExam = async (id: string, data: Partial<Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateExam"); };
export const deleteExam = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteExam"); };
export const getExamById = async (id: string): Promise<Exam | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getExamById"); };

// --- News Articles ---
export const addNewsArticle = async (data: Omit<NewsArticle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addNewsArticle"); };
export const getNewsArticles = async (): Promise<NewsArticle[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getNewsArticles"); };
export const updateNewsArticle = async (id: string, data: Partial<Omit<NewsArticle, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateNewsArticle"); };
export const deleteNewsArticle = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteNewsArticle"); };
export const getNewsArticleById = async (id: string): Promise<NewsArticle | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getNewsArticleById"); };

// --- Activation Codes (QR Codes) --- formerly Access Codes
export const addAccessCode = async (data: Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  // Example: const { data: newCode, error } = await supabase.from('activation_codes').insert(data).select().single();
  // if (error) throw error; return newCode.id;
  throw new Error(NOT_IMPLEMENTED_ERROR + ": addAccessCode (now addActivationCode for table 'activation_codes')");
};
export const getAccessCodes = async (): Promise<AccessCode[]> => {
  // Example: const { data, error } = await supabase.from('activation_codes').select('*');
  // if (error) throw error; return data as AccessCode[];
  throw new Error(NOT_IMPLEMENTED_ERROR + ": getAccessCodes (now getActivationCodes for table 'activation_codes')");
};
export const updateAccessCode = async (id: string, data: Partial<Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  // Example: const { error } = await supabase.from('activation_codes').update(data).eq('id', id);
  // if (error) throw error;
  throw new Error(NOT_IMPLEMENTED_ERROR + ": updateAccessCode (now updateActivationCode for table 'activation_codes')");
};
export const deleteAccessCode = async (id: string): Promise<void> => {
  // Example: const { error } = await supabase.from('activation_codes').delete().eq('id', id);
  // if (error) throw error;
  throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteAccessCode (now deleteActivationCode for table 'activation_codes')");
};
export const getAccessCodeById = async (id: string): Promise<AccessCode | null> => {
  // Example: const { data, error } = await supabase.from('activation_codes').select('*').eq('id', id).single();
  // if (error && error.code !== 'PGRST116') throw error; return data as AccessCode | null;
  throw new Error(NOT_IMPLEMENTED_ERROR + ": getAccessCodeById (now getActivationCodeById for table 'activation_codes')");
};

// --- Subject Sections ---
export const addSubjectSection = async (subjectId: string, data: Omit<SubjectSection, 'id' | 'subjectId' | 'createdAt' | 'updatedAt'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addSubjectSection"); };
export const getSubjectSections = async (subjectId: string): Promise<SubjectSection[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectSections"); };
export const updateSubjectSection = async (subjectId: string, sectionId: string, data: Partial<Omit<SubjectSection, 'id' | 'subjectId' | 'createdAt' | 'updatedAt'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateSubjectSection"); };
export const deleteSubjectSection = async (subjectId: string, sectionId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteSubjectSection"); };

// --- Lessons ---
export const addLesson = async (subjectId: string, sectionId: string, data: Omit<Lesson, 'id' | 'subjectId' | 'sectionId' | 'createdAt' | 'updatedAt'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addLesson"); };
export const getLessonsInSection = async (subjectId: string, sectionId: string): Promise<Lesson[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getLessonsInSection"); };
export const getLessonById = async (subjectId: string, sectionId: string, lessonId: string): Promise<Lesson | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getLessonById"); };
export const updateLesson = async (subjectId: string, sectionId: string, lessonId: string, data: Partial<Omit<Lesson, 'id' | 'subjectId' | 'sectionId' | 'createdAt' | 'updatedAt'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateLesson"); };
export const deleteLesson = async (subjectId: string, sectionId: string, lessonId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteLesson"); };

// --- Users (Profiles) ---
export const getUsers = async (): Promise<UserProfile[]> => {
  // Example: const { data, error } = await supabase.from('profiles').select('*');
  // if (error) throw error; return data as UserProfile[];
  throw new Error(NOT_IMPLEMENTED_ERROR + ": getUsers");
};
export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  // Example: const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
  // if (error && error.code !== 'PGRST116') throw error; 
  // return data as UserProfile | null;
  throw new Error(NOT_IMPLEMENTED_ERROR + ": getUserByEmail");
};
export const updateUser = async (id: string, data: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  // Example: const { error } = await supabase.from('profiles').update(data).eq('id', id);
  // if (error) throw error;
  throw new Error(NOT_IMPLEMENTED_ERROR + ": updateUser");
};

export const getTeachers = async (): Promise<UserProfile[]> => {
  // Example: const { data, error } = await supabase.from('profiles').select('*').eq('role', 'teacher');
  // if (error) throw error; return data as UserProfile[];
  throw new Error(NOT_IMPLEMENTED_ERROR + ": getTeachers");
};
export const updateTeacherSubjects = async (teacherId: string, subjectIds: string[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateTeacherSubjects"); };

// --- Questions for Lesson ---
export const getQuestionsForLesson = async (lessonId: string): Promise<Question[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getQuestionsForLesson"); };
export const unlinkQuestionFromLesson = async (questionId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": unlinkQuestionFromLesson"); };
export const getSubjectNameById = async (subjectId: string): Promise<string | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectNameById"); };

// --- Tags ---
export const addTag = async (data: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const { data: newTag, error } = await supabase.from('tags').insert(data).select().single();
  if (error) throw error;
  return newTag.id;
};
export const getTags = async (): Promise<Tag[]> => {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching tags from Supabase:", error);
    throw error;
  }
  return (data as Tag[]) || [];
};
export const updateTag = async (id: string, data: Partial<Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateTag"); };
export const deleteTag = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteTag"); };

// --- Exam Attempts ---
export const getExamAttempts = async (examId?: string): Promise<ExamAttempt[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getExamAttempts"); };

// --- App Settings ---
export const getAppSettings = async (): Promise<AppSettings | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getAppSettings"); };
export const updateAppSettings = async (settings: Partial<Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateAppSettings"); };

// --- Exam Titles (Helper) ---
export const getExamTitleById = async (examId: string): Promise<string | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getExamTitleById"); };

// --- Announcements ---
export const addAnnouncement = async (data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addAnnouncement"); };
export const getAnnouncements = async (): Promise<Announcement[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getAnnouncements"); };
export const updateAnnouncement = async (id: string, data: Partial<Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateAnnouncement"); };
export const deleteAnnouncement = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteAnnouncement"); };
export const getAnnouncementById = async (id: string): Promise<Announcement | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getAnnouncementById"); };

// --- Batch Imports ---
export const addExamsBatch = async (exams: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addExamsBatch"); };
export const addNewsArticlesBatch = async (articles: Omit<NewsArticle, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addNewsArticlesBatch"); };
export const addAccessCodesBatch = async (codes: Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> => {
  // Example: const { error } = await supabase.from('activation_codes').insert(codes);
  // if (error) throw error;
  throw new Error(NOT_IMPLEMENTED_ERROR + ": addAccessCodesBatch (now for table 'activation_codes')");
};
export const addUsersBatch = async (users: Partial<UserProfile>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addUsersBatch"); };
export const addSubjectsBatch = async (subjectsData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'sections'>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addSubjectsBatch"); };
