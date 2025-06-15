// src/lib/firestore.ts
// IMPORTANT: Most functions in this file need to be reimplemented to use Supabase.
// Implementations for getUsers, getUserByEmail, updateUser, getTeachers, getSubjects, getTags, and getQuestions are provided.
// ALL OTHER FUNCTIONS WILL THROW ERRORS.

import { supabase } from '@/lib/supabaseClient';
import type { Question, Exam, NewsArticle, Subject, AccessCode, SubjectSection, Lesson, UserProfile, Tag, ExamAttempt, AppSettings, Announcement, Option } from '@/types';

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
  return (data?.map(s => ({
    ...s,
    iconName: s.icon_name, // map snake_case to camelCase
    imageHint: s.image_hint,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  })) as Subject[]) || [];
};

export const updateSubject = async (id: string, data: Partial<Omit<Subject, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  const dbData: any = {...data};
  if (data.iconName !== undefined) { dbData.icon_name = data.iconName; delete dbData.iconName; }
  if (data.imageHint !== undefined) { dbData.image_hint = data.imageHint; delete dbData.imageHint; }

  const { error } = await supabase.from('subjects').update(dbData).eq('id', id);
  if (error) throw error;
};
export const deleteSubject = async (subjectId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteSubject"); };
export const getSubjectById = async (id: string): Promise<Subject | null> => {
   const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
   if (error && error.code !== 'PGRST116') throw error;
   if (!data) return null;
   return {
     ...data,
     iconName: data.icon_name,
     imageHint: data.image_hint,
     createdAt: data.created_at,
     updatedAt: data.updated_at,
   } as Subject;
};
export const getSubjectsWithDetails = async (): Promise<Subject[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectsWithDetails"); };

// --- Questions ---
export const addQuestion = async (data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addQuestion"); };

export const getQuestions = async (): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('questions')
    .select('*');

  if (error) {
    console.error("Supabase error fetching questions:", error);
    throw error;
  }
  if (!data) return [];

  return data.map((q: any) => {
    const baseQuestion = {
      id: q.id,
      questionType: q.question_type,
      questionText: q.question_text,
      difficulty: q.difficulty,
      subjectId: q.subject_id,
      lessonId: q.lesson_id,
      tagIds: q.tag_ids || [], // Assuming tag_ids is an array column in DB
      isSane: q.is_sane,
      sanityExplanation: q.sanity_explanation,
      isLocked: q.is_locked,
      created_at: q.created_at,
      updated_at: q.updated_at,
      // subject field would require a join or separate fetch
    };

    switch (q.question_type) {
      case 'mcq':
        return {
          ...baseQuestion,
          options: q.options as Option[],
          correctOptionId: q.correct_option_id,
        } as Question;
      case 'true_false':
        return {
          ...baseQuestion,
          options: q.options as Option[] || [{id: 'true', text: 'صحيح'}, {id: 'false', text: 'خطأ'}], // Default options if not stored
          correctOptionId: q.correct_option_id,
        } as Question;
      case 'fill_in_the_blanks':
        return {
          ...baseQuestion,
          correctAnswers: q.correct_answers as string[],
        } as Question;
      case 'short_answer':
        return {
          ...baseQuestion,
          modelAnswer: q.model_answer,
        } as Question;
      default:
        // Handle unknown question type or return as BaseQuestion
        console.warn(`Unknown question type encountered: ${q.question_type} for question ID: ${q.id}`);
        return { ...baseQuestion } as Question; // Or throw an error
    }
  });
};
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
export const addNewsArticle = async (data: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addNewsArticle"); };
export const getNewsArticles = async (): Promise<NewsArticle[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getNewsArticles"); };
export const updateNewsArticle = async (id: string, data: Partial<Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateNewsArticle"); };
export const deleteNewsArticle = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteNewsArticle"); };
export const getNewsArticleById = async (id: string): Promise<NewsArticle | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getNewsArticleById"); };

// --- Activation Codes (QR Codes) ---
export const addAccessCode = async (data: Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  const dbData = {
    ...data,
    subject_id: data.subjectId,
    subject_name: data.subjectName,
    valid_from: data.validFrom,
    valid_until: data.validUntil,
    is_active: data.isActive,
    is_used: data.isUsed,
    used_at: data.usedAt,
    used_by_user_id: data.usedByUserId,
    encoded_value: data.encodedValue,
  };
  delete dbData.subjectId;
  delete dbData.subjectName;
  delete dbData.validFrom;
  delete dbData.validUntil;
  delete dbData.isActive;
  delete dbData.isUsed;
  delete dbData.usedAt;
  delete dbData.usedByUserId;
  delete dbData.encodedValue;


  const { data: newCode, error } = await supabase.from('activation_codes').insert(dbData).select().single();
  if (error) throw error; return newCode.id;
};
export const getAccessCodes = async (): Promise<AccessCode[]> => {
  const { data, error } = await supabase.from('activation_codes').select('*');
  if (error) throw error;
  return (data?.map(ac => ({
    ...ac,
    subjectId: ac.subject_id,
    subjectName: ac.subject_name,
    validFrom: ac.valid_from,
    validUntil: ac.valid_until,
    isActive: ac.is_active,
    isUsed: ac.is_used,
    usedAt: ac.used_at,
    usedByUserId: ac.used_by_user_id,
    encodedValue: ac.encoded_value,
    created_at: ac.created_at,
    updated_at: ac.updated_at,
  })) as AccessCode[]) || [];
};
export const updateAccessCode = async (id: string, data: Partial<Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  const dbData: any = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.encodedValue !== undefined) dbData.encoded_value = data.encodedValue;
  if (data.type !== undefined) dbData.type = data.type;
  if (data.subjectId !== undefined) dbData.subject_id = data.subjectId;
  if (data.subjectName !== undefined) dbData.subject_name = data.subjectName;
  if (data.validFrom !== undefined) dbData.valid_from = data.validFrom;
  if (data.validUntil !== undefined) dbData.valid_until = data.validUntil;
  if (data.isActive !== undefined) dbData.is_active = data.isActive;
  if (data.isUsed !== undefined) dbData.is_used = data.isUsed;
  if (data.usedAt !== undefined) dbData.used_at = data.usedAt;
  if (data.usedByUserId !== undefined) dbData.used_by_user_id = data.usedByUserId;

  const { error } = await supabase.from('activation_codes').update(dbData).eq('id', id);
  if (error) throw error;
};
export const deleteAccessCode = async (id: string): Promise<void> => {
  const { error } = await supabase.from('activation_codes').delete().eq('id', id);
  if (error) throw error;
};
export const getAccessCodeById = async (id: string): Promise<AccessCode | null> => {
  const { data: ac, error } = await supabase.from('activation_codes').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!ac) return null;
  return {
    ...ac,
    subjectId: ac.subject_id,
    subjectName: ac.subject_name,
    validFrom: ac.valid_from,
    validUntil: ac.valid_until,
    isActive: ac.is_active,
    isUsed: ac.is_used,
    usedAt: ac.used_at,
    usedByUserId: ac.used_by_user_id,
    encodedValue: ac.encoded_value,
    created_at: ac.created_at,
    updated_at: ac.updated_at,
  } as AccessCode;
};

// --- Subject Sections ---
export const addSubjectSection = async (subjectId: string, data: Omit<SubjectSection, 'id' | 'subjectId' | 'created_at' | 'updated_at'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addSubjectSection"); };
export const getSubjectSections = async (subjectId: string): Promise<SubjectSection[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectSections"); };
export const updateSubjectSection = async (subjectId: string, sectionId: string, data: Partial<Omit<SubjectSection, 'id' | 'subjectId' | 'created_at' | 'updated_at'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateSubjectSection"); };
export const deleteSubjectSection = async (subjectId: string, sectionId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteSubjectSection"); };

// --- Lessons ---
export const addLesson = async (subjectId: string, sectionId: string, data: Omit<Lesson, 'id' | 'subjectId' | 'sectionId' | 'created_at' | 'updated_at'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addLesson"); };
export const getLessonsInSection = async (subjectId: string, sectionId: string): Promise<Lesson[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getLessonsInSection"); };
export const getLessonById = async (subjectId: string, sectionId: string, lessonId: string): Promise<Lesson | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getLessonById"); };
export const updateLesson = async (subjectId: string, sectionId: string, lessonId: string, data: Partial<Omit<Lesson, 'id' | 'subjectId' | 'sectionId' | 'created_at' | 'updated_at'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateLesson"); };
export const deleteLesson = async (subjectId: string, sectionId: string, lessonId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteLesson"); };

// --- Users (Profiles) ---
const mapDbProfileToUserProfile = (dbProfile: any): UserProfile => {
  return {
    id: dbProfile.id,
    email: dbProfile.email,
    name: dbProfile.name,
    avatar_url: dbProfile.avatar_url,
    avatar_hint: dbProfile.avatar_hint,
    points: dbProfile.points,
    level: dbProfile.level,
    progress_to_next_level: dbProfile.progress_to_next_level,
    badges: dbProfile.badges,
    rewards: dbProfile.rewards,
    student_goals: dbProfile.student_goals,
    branch: dbProfile.branch,
    university: dbProfile.university,
    major: dbProfile.major,
    active_subscription: dbProfile.active_subscription,
    role: dbProfile.role,
    youtube_channel_url: dbProfile.youtube_channel_url,
    subjects_taught_id: dbProfile.subjects_taught_ids,
    created_at: dbProfile.created_at,
    updated_at: dbProfile.updated_at,
  };
};

const mapUserProfileToDbProfile = (userProfileData: Partial<UserProfile>): any => {
  const dbData: any = {};
  if (userProfileData.name !== undefined) dbData.name = userProfileData.name;
  if (userProfileData.role !== undefined) dbData.role = userProfileData.role;
  if (userProfileData.youtube_channel_url !== undefined) dbData.youtube_channel_url = userProfileData.youtube_channel_url;
  if (userProfileData.subjects_taught_id !== undefined) dbData.subjects_taught_ids = userProfileData.subjects_taught_id;
  if (userProfileData.avatar_url !== undefined) dbData.avatar_url = userProfileData.avatar_url;
  if (userProfileData.avatar_hint !== undefined) dbData.avatar_hint = userProfileData.avatar_hint;
  if (userProfileData.points !== undefined) dbData.points = userProfileData.points;
  if (userProfileData.level !== undefined) dbData.level = userProfileData.level;
  if (userProfileData.progress_to_next_level !== undefined) dbData.progress_to_next_level = userProfileData.progress_to_next_level;
  if (userProfileData.badges !== undefined) dbData.badges = userProfileData.badges;
  if (userProfileData.rewards !== undefined) dbData.rewards = userProfileData.rewards;
  if (userProfileData.student_goals !== undefined) dbData.student_goals = userProfileData.student_goals;
  if (userProfileData.branch !== undefined) dbData.branch = userProfileData.branch;
  if (userProfileData.university !== undefined) dbData.university = userProfileData.university;
  if (userProfileData.major !== undefined) dbData.major = userProfileData.major;
  if (userProfileData.active_subscription !== undefined) dbData.active_subscription = userProfileData.active_subscription;
  // email and id are typically not updated directly this way.
  return dbData;
};


export const getUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error("Supabase error fetching users:", error);
    throw error;
  }
  return data ? data.map(mapDbProfileToUserProfile) : [];
};

export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
  if (error && error.code !== 'PGRST116') {
    console.error("Supabase error fetching user by email:", error);
    throw error;
  }
  return data ? mapDbProfileToUserProfile(data) : null;
};

export const updateUser = async (id: string, data: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  const dbData = mapUserProfileToDbProfile(data);
  if (Object.keys(dbData).length === 0) {
    console.warn("updateUser called with no data to update for id:", id);
    return;
  }
  const { error } = await supabase.from('profiles').update(dbData).eq('id', id);
  if (error) {
    console.error("Supabase error updating user:", error);
    throw error;
  }
};

export const getTeachers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'teacher');
  if (error) {
    console.error("Supabase error fetching teachers:", error);
    throw error;
  }
  return data ? data.map(mapDbProfileToUserProfile) : [];
};
export const updateTeacherSubjects = async (teacherId: string, subjectId: string | null): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ subjects_taught_ids: subjectId }) // DB column is subjects_taught_ids
    .eq('id', teacherId)
    .eq('role', 'teacher');

  if (error) {
    console.error("Supabase error updating teacher subjects:", error);
    throw error;
  }
};


// --- Questions for Lesson ---
export const getQuestionsForLesson = async (lessonId: string): Promise<Question[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getQuestionsForLesson"); };
export const unlinkQuestionFromLesson = async (questionId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": unlinkQuestionFromLesson"); };
export const getSubjectNameById = async (subjectId: string): Promise<string | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectNameById"); };

// --- Tags ---
export const addTag = async (data: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  const { data: newTag, error } = await supabase.from('tags').insert(data).select().single();
  if (error) throw error;
  return newTag.id;
};
export const getTags = async (): Promise<Tag[]> => {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching tags from Supabase:", error);
    throw error;
  }
  return (data?.map(t => ({
    ...t,
    createdAt: t.created_at, // map snake_case to camelCase
    updatedAt: t.updated_at,
  })) as Tag[]) || [];
};
export const updateTag = async (id: string, data: Partial<Omit<Tag, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateTag"); };
export const deleteTag = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteTag"); };

// --- Exam Attempts ---
export const getExamAttempts = async (examId?: string): Promise<ExamAttempt[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getExamAttempts"); };

// --- App Settings ---
export const getAppSettings = async (): Promise<AppSettings | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getAppSettings"); };
export const updateAppSettings = async (settings: Partial<Omit<AppSettings, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateAppSettings"); };

// --- Exam Titles (Helper) ---
export const getExamTitleById = async (examId: string): Promise<string | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getExamTitleById"); };

// --- Announcements ---
export const addAnnouncement = async (data: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<string> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addAnnouncement"); };
export const getAnnouncements = async (): Promise<Announcement[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getAnnouncements"); };
export const updateAnnouncement = async (id: string, data: Partial<Omit<Announcement, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateAnnouncement"); };
export const deleteAnnouncement = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteAnnouncement"); };
export const getAnnouncementById = async (id: string): Promise<Announcement | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getAnnouncementById"); };

// --- Batch Imports ---
export const addExamsBatch = async (exams: Omit<Exam, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addExamsBatch"); };
export const addNewsArticlesBatch = async (articles: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addNewsArticlesBatch"); };
export const addAccessCodesBatch = async (codes: Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> => {
  const codesToInsert = codes.map(c => {
    const dbCode: any = { ...c };
    dbCode.subject_id = c.subjectId;
    dbCode.subject_name = c.subjectName;
    dbCode.valid_from = c.validFrom;
    dbCode.valid_until = c.validUntil;
    dbCode.is_active = c.isActive;
    dbCode.is_used = c.isUsed;
    dbCode.used_at = c.usedAt;
    dbCode.used_by_user_id = c.usedByUserId;
    dbCode.encoded_value = c.encodedValue;

    delete dbCode.subjectId;
    delete dbCode.subjectName;
    delete dbCode.validFrom;
    delete dbCode.validUntil;
    delete dbCode.isActive;
    delete dbCode.isUsed;
    delete dbCode.usedAt;
    delete dbCode.usedByUserId;
    delete dbCode.encodedValue;
    return dbCode;
  });
  const { error } = await supabase.from('activation_codes').insert(codesToInsert);
  if (error) throw error;
};
export const addUsersBatch = async (users: Partial<UserProfile>[]): Promise<void> => {
    const usersToInsert = users.map(user => mapUserProfileToDbProfile(user));
    const { error } = await supabase.from('profiles').insert(usersToInsert);
    if (error) {
        console.error("Supabase error batch inserting users:", error);
        throw error;
    }
};
export const addSubjectsBatch = async (subjectsData: Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'sections'>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": addSubjectsBatch"); };

