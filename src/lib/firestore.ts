// src/lib/firestore.ts
// IMPORTANT: Most functions in this file need to be reimplemented to use Supabase.
// Implementations for getUsers, getUserByEmail, updateUser, getTeachers, getSubjects, getTags, getQuestions, getExams, getNewsArticles are provided.
// ALL OTHER FUNCTIONS WILL THROW ERRORS.

import { supabase } from '@/lib/supabaseClient';
import type { Question, Exam, NewsArticle, Subject, AccessCode, SubjectSection, Lesson, UserProfile, Tag, ExamAttempt, AppSettings, Announcement, Option, QuestionType, MCQQuestion, TrueFalseQuestion, FillInTheBlanksQuestion, ShortAnswerQuestion, ExamQuestionLink, AnnouncementType } from '@/types';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

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

// Helper function to map a raw DB question object to the correct Question subtype
const mapDbQuestionToQuestionType = (q: any): Question | null => {
  if (!q || !q.id) return null; // Return null if q is null or has no id

  const baseQuestion = {
    id: String(q.id),
    questionType: q.question_type as QuestionType,
    questionText: q.question_text,
    difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
    subjectId: q.subject_id,
    subject: q.subject, // Assuming subject name is denormalized or joined
    lessonId: q.lesson_id,
    tagIds: q.tag_ids || [],
    isSane: q.is_sane,
    sanityExplanation: q.sanity_explanation,
    isLocked: q.is_locked,
    created_at: q.created_at,
    updated_at: q.updated_at,
  };

  switch (q.question_type as QuestionType) {
    case 'mcq':
      return {
        ...baseQuestion,
        options: q.options as Option[],
        correctOptionId: q.correct_option_id,
      } as MCQQuestion;
    case 'true_false':
      return {
        ...baseQuestion,
        options: q.options as Option[] || [{id: 'true', text: 'صحيح'}, {id: 'false', text: 'خطأ'}],
        correctOptionId: q.correct_option_id as 'true' | 'false',
      } as TrueFalseQuestion;
    case 'fill_in_the_blanks':
      return {
        ...baseQuestion,
        correctAnswers: q.correct_answers as string[],
      } as FillInTheBlanksQuestion;
    case 'short_answer':
      return {
        ...baseQuestion,
        modelAnswer: q.model_answer,
      } as ShortAnswerQuestion;
    default:
      console.warn(`mapDbQuestionToQuestionType: Unknown question type encountered: ${q.question_type} for question ID: ${q.id}`);
      return { ...baseQuestion } as Question; // Fallback, should be reviewed
  }
};


// --- Subjects ---
export const addSubject = async (data: Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'sections'>): Promise<string> => {
  const dbData: any = {
    name: data.name,
    description: data.description || null,
    branch: data.branch,
    image: data.image || null,
    icon_name: data.iconName || null,
    image_hint: data.imageHint || null,
  };

  if (data.order !== undefined && data.order !== null) {
    dbData.order = data.order;
  } else {
    dbData.order = null;
  }

  const { data: newSubject, error } = await supabase
    .from('subjects')
    .insert(dbData)
    .select('id')
    .single();

  if (error) {
    console.info("Supabase error details for addSubject will follow on the next line(s).");
    console.error(error);
    try {
      console.error("Stringified Supabase error in addSubject:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error("Could not stringify Supabase error in addSubject:", e);
    }
    console.error("Parsed Supabase error details in addSubject (if available):", {
      message: (error as any).message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: (error as any).code,
      status: (error as any).status,
    });
    throw error;
  }
  if (!newSubject || !newSubject.id) {
    console.error("Supabase addSubject did not return a new subject with an ID. Response:", newSubject);
    throw new Error("Failed to add subject: No ID returned from database.");
  }
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
    id: String(s.id), // Ensure ID is string
    iconName: s.icon_name,
    imageHint: s.image_hint,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  })) as Subject[]) || [];
};

export const updateSubject = async (id: string, data: Partial<Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'sections'>>): Promise<void> => {
  const dbData: any = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.description !== undefined) dbData.description = data.description;
  if (data.branch !== undefined) dbData.branch = data.branch;
  if (data.image !== undefined) dbData.image = data.image;
  if (data.iconName !== undefined) dbData.icon_name = data.iconName;
  if (data.imageHint !== undefined) dbData.image_hint = data.imageHint;
  if (data.order !== undefined) {
    dbData.order = data.order;
  } else if (data.hasOwnProperty('order') && data.order === null) {
    dbData.order = null;
  }

  const { error } = await supabase.from('subjects').update(dbData).eq('id', id);
  if (error) throw error;
};
export const deleteSubject = async (subjectId: string): Promise<void> => {
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
    if (error) {
        console.error("Supabase error deleting subject:", error);
        throw error;
    }
};
export const getSubjectById = async (id: string): Promise<Subject | null> => {
   const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
   if (error && error.code !== 'PGRST116') throw error; // Allow 'PGRST116' (single row not found)
   if (!data) return null;
   return {
     ...data,
     id: String(data.id), // Ensure ID is string
     iconName: data.icon_name,
     imageHint: data.image_hint,
     createdAt: data.created_at,
     updatedAt: data.updated_at,
   } as Subject;
};
export const getSubjectsWithDetails = async (): Promise<Subject[]> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectsWithDetails"); };

// --- Questions ---
export const addQuestion = async (data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const dbData: any = {
    question_type: data.questionType,
    question_text: data.questionText,
    difficulty: data.difficulty,
    subject_id: (typeof data.subjectId === 'string' && data.subjectId.trim() !== '') ? data.subjectId : null,
    lesson_id: (typeof data.lessonId === 'string' && data.lessonId.trim() !== '') ? data.lessonId : null,
    tag_ids: Array.isArray(data.tagIds) ? data.tagIds : [],
    is_sane: data.isSane ?? null,
    sanity_explanation: data.sanityExplanation ?? null,
    is_locked: data.isLocked ?? true,
  };

  switch (data.questionType) {
    case 'mcq':
      dbData.options = (data as MCQQuestion).options;
      dbData.correct_option_id = (data as MCQQuestion).correctOptionId;
      break;
    case 'true_false':
      dbData.options = (data as TrueFalseQuestion).options;
      dbData.correct_option_id = (data as TrueFalseQuestion).correctOptionId;
      break;
    case 'fill_in_the_blanks':
      dbData.correct_answers = (data as FillInTheBlanksQuestion).correctAnswers;
      break;
    case 'short_answer':
      dbData.model_answer = (data as ShortAnswerQuestion).modelAnswer ?? null;
      break;
    default:
      console.warn(`addQuestion: Unknown question type encountered: ${(data as any).questionType}`);
      break;
  }

  const { data: newQuestion, error } = await supabase
    .from('questions')
    .insert(dbData)
    .select('id')
    .single();

  if (error) {
    console.info("Supabase error details for addQuestion will follow on the next line(s).");
    console.error(error); // Log the raw error object
    try {
      console.error("Stringified Supabase error in addQuestion:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error("Could not stringify Supabase error in addQuestion:", e);
    }
    throw error;
  }
  if (!newQuestion || !newQuestion.id) {
    throw new Error("Failed to add question: No ID returned from database.");
  }
  return String(newQuestion.id);
};


export const getQuestions = async (): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('questions')
    .select('*');

  if (error) {
    console.error("Supabase error fetching questions:", error);
    throw error;
  }
  if (!data) return [];

  return data.map((q: any) => mapDbQuestionToQuestionType(q)).filter(q => q !== null) as Question[];
};

export const updateQuestion = async (id: string, data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const dbData: any = {};

  // Map common fields
  if (data.questionType !== undefined) dbData.question_type = data.questionType;
  if (data.questionText !== undefined) dbData.question_text = data.questionText;
  if (data.difficulty !== undefined) dbData.difficulty = data.difficulty;
  if (data.subjectId !== undefined) dbData.subject_id = (typeof data.subjectId === 'string' && data.subjectId.trim() !== '') ? data.subjectId : null;
  if (data.lessonId !== undefined) dbData.lesson_id = (typeof data.lessonId === 'string' && data.lessonId.trim() !== '') ? data.lessonId : null;
  if (data.tagIds !== undefined) dbData.tag_ids = Array.isArray(data.tagIds) ? data.tagIds : [];
  if (data.hasOwnProperty('isSane')) dbData.is_sane = data.isSane;
  if (data.hasOwnProperty('sanityExplanation')) dbData.sanity_explanation = data.sanityExplanation;
  if (data.isLocked !== undefined) dbData.is_locked = data.isLocked;


  const currentQuestionType = data.questionType || (await getQuestionById(id))?.questionType;

  if (currentQuestionType === 'mcq') {
    const mcqData = data as Partial<MCQQuestion>;
    if (mcqData.options !== undefined) dbData.options = mcqData.options;
    if (mcqData.correctOptionId !== undefined) dbData.correct_option_id = mcqData.correctOptionId;
  } else if (currentQuestionType === 'true_false') {
    const tfData = data as Partial<TrueFalseQuestion>;
    if (tfData.options !== undefined) dbData.options = tfData.options;
    if (tfData.correctOptionId !== undefined) dbData.correct_option_id = tfData.correctOptionId;
  } else if (currentQuestionType === 'fill_in_the_blanks') {
    const fitbData = data as Partial<FillInTheBlanksQuestion>;
    if (fitbData.correctAnswers !== undefined) dbData.correct_answers = fitbData.correctAnswers;
  } else if (currentQuestionType === 'short_answer') {
    const saData = data as Partial<ShortAnswerQuestion>;
    if (saData.hasOwnProperty('modelAnswer')) {
        dbData.model_answer = saData.modelAnswer === undefined || saData.modelAnswer === '' ? null : saData.modelAnswer;
    }
  }


  if (Object.keys(dbData).length === 0) {
    console.warn("updateQuestion called with no data to update for id:", id);
    return;
  }

  const { error } = await supabase
    .from('questions')
    .update(dbData)
    .eq('id', id);

  if (error) {
    console.info(`Supabase error details for updateQuestion (ID: ${id}) will follow on the next line(s).`);
    console.error(error);
    try {
      console.error("Stringified Supabase error in updateQuestion:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error("Could not stringify Supabase error in updateQuestion:", e);
    }
    throw error;
  }
};
export const deleteQuestion = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteQuestion"); };
export const getQuestionById = async (id: string): Promise<Question | null> => {
  const { data: q, error } = await supabase.from('questions').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return mapDbQuestionToQuestionType(q);
};
export const importQuestionsBatch = async (questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": importQuestionsBatch"); };

// --- Exams ---
export const addExam = async (data: Omit<Exam, 'id' | 'created_at' | 'updated_at' | 'questionCount' | 'questions'> & { questionIds?: string[] }): Promise<string> => {
  const examDbData: any = {
    title: data.title,
    description: data.description || null,
    subject_id: (typeof data.subjectId === 'string' && data.subjectId.trim() !== '') ? data.subjectId : null,
    published: data.published || false,
    image: data.image || null,
    image_hint: data.imageHint || null,
    teacher_name: data.teacherName || null,
    teacher_id: (typeof data.teacherId === 'string' && data.teacherId.trim() !== '') ? data.teacherId : null,
    duration: data.durationInMinutes ?? data.duration ?? null,
  };

  // Insert into exams table
  const { data: newExam, error: examError } = await supabase
    .from('exams')
    .insert(examDbData)
    .select('id')
    .single();

  if (examError) {
    console.error("Supabase error adding exam:", examError);
    try {
        console.error("Stringified Supabase error in addExam:", JSON.stringify(examError, Object.getOwnPropertyNames(examError)));
    } catch (e) {
        console.error("Could not stringify Supabase error in addExam:", e);
    }
    throw examError;
  }
  if (!newExam || !newExam.id) {
    throw new Error("Failed to add exam: No ID returned from database.");
  }

  // Insert into exam_questions junction table
  if (data.questionIds && data.questionIds.length > 0) {
    const examQuestionsToInsert = data.questionIds.map((questionId, index) => ({
      exam_id: newExam.id,
      question_id: questionId,
      order_number: index + 1, // Or however order is determined
      // points: 1, // Default points as per your schema, or get from form
    }));

    const { error: eqError } = await supabase
      .from('exam_questions')
      .insert(examQuestionsToInsert);

    if (eqError) {
      console.error("Supabase error adding exam questions links:", eqError);
      // Optionally, you might want to delete the exam if linking questions fails
      await supabase.from('exams').delete().eq('id', newExam.id);
      throw eqError;
    }
  }
  return String(newExam.id);
};


export const getExams = async (): Promise<Exam[]> => {
  const { data, error } = await supabase
    .from('exams')
    .select('*, exam_questions(count)'); // Fetches exams and a count of related exam_questions

  if (error) {
    console.error("Supabase error fetching exams:", error);
    throw error;
  }
  if (!data) return [];

  return data.map((exam: any) => ({
    id: String(exam.id),
    title: exam.title,
    description: exam.description,
    subjectId: exam.subject_id,
    published: exam.published,
    image: exam.image,
    imageHint: exam.image_hint,
    teacherName: exam.teacher_name,
    teacherId: exam.teacher_id,
    durationInMinutes: exam.duration,
    duration: exam.duration,
    created_at: exam.created_at,
    updated_at: exam.updated_at,
    questionCount: Array.isArray(exam.exam_questions) ? exam.exam_questions[0]?.count || 0 : (exam.exam_questions?.count || 0),
  })) as Exam[];
};
export const updateExam = async (id: string, data: Partial<Omit<Exam, 'id' | 'created_at' | 'updated_at' | 'questionCount' | 'questions'> & { questionIds?: string[] }>): Promise<void> => {
  const examDbData: any = {};
  if (data.title !== undefined) examDbData.title = data.title;
  if (data.hasOwnProperty('description')) examDbData.description = data.description;
  if (data.subjectId !== undefined) examDbData.subject_id = (typeof data.subjectId === 'string' && data.subjectId.trim() !== '') ? data.subjectId : null;
  if (data.published !== undefined) examDbData.published = data.published;
  if (data.hasOwnProperty('image')) examDbData.image = data.image;
  if (data.hasOwnProperty('imageHint')) examDbData.image_hint = data.imageHint;
  if (data.hasOwnProperty('teacherName')) examDbData.teacher_name = data.teacherName;
  if (data.hasOwnProperty('teacherId')) examDbData.teacher_id = (typeof data.teacherId === 'string' && data.teacherId.trim() !== '') ? data.teacherId : null;
  if (data.durationInMinutes !== undefined) examDbData.duration = data.durationInMinutes;
  else if (data.duration !== undefined) examDbData.duration = data.duration;


  if (Object.keys(examDbData).length > 0) {
    const { error: examUpdateError } = await supabase
      .from('exams')
      .update(examDbData)
      .eq('id', id);

    if (examUpdateError) {
      console.error("Supabase error updating exam details:", examUpdateError);
      throw examUpdateError;
    }
  }

  // Handle exam_questions links if questionIds are provided
  if (data.questionIds !== undefined) {
    // Delete existing links
    const { error: deleteError } = await supabase
      .from('exam_questions')
      .delete()
      .eq('exam_id', id);

    if (deleteError) {
      console.error("Supabase error deleting old exam question links:", deleteError);
      throw deleteError;
    }

    // Insert new links if there are any
    if (data.questionIds.length > 0) {
      const examQuestionsToInsert = data.questionIds.map((questionId, index) => ({
        exam_id: id,
        question_id: questionId,
        order_number: index + 1,
        // points: 1, // Or from form data if available
      }));

      const { error: insertError } = await supabase
        .from('exam_questions')
        .insert(examQuestionsToInsert);

      if (insertError) {
        console.error("Supabase error inserting new exam question links:", insertError);
        throw insertError;
      }
    }
  }
};
export const deleteExam = async (id: string): Promise<void> => {
  // CASCADE constraint on exam_questions table should handle related deletions
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) {
    console.error("Supabase error deleting exam:", error);
    throw error;
  }
};
export const getExamById = async (id: string): Promise<Exam | null> => {
  const { data: examData, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .single();

  if (examError && examError.code !== 'PGRST116') { // Allow "single row not found"
    console.error("Supabase error fetching exam by ID:", examError);
    throw examError;
  }
  if (!examData) return null;

  // Fetch linked questions
  const { data: examQuestionsData, error: eqError } = await supabase
    .from('exam_questions')
    .select('question_id, order_number, points, questions(*)') // Fetch related question details
    .eq('exam_id', id)
    .order('order_number', { ascending: true, nullsLast: true });

  if (eqError) {
    console.error("Supabase error fetching exam_questions for exam ID:", id, eqError);
    throw eqError;
  }

  const examQuestionLinks: ExamQuestionLink[] = examQuestionsData?.map((eq: any) => {
    const question = mapDbQuestionToQuestionType(eq.questions);
    return question ? {
      question_id: eq.question_id,
      order_number: eq.order_number,
      points: eq.points,
      question: question,
    } : null;
  }).filter(link => link !== null) as ExamQuestionLink[] || [];


  return {
    id: String(examData.id),
    title: examData.title,
    description: examData.description,
    subjectId: examData.subject_id,
    published: examData.published,
    image: examData.image,
    imageHint: examData.image_hint,
    teacherName: examData.teacher_name,
    teacherId: examData.teacher_id,
    durationInMinutes: examData.duration,
    duration: examData.duration,
    created_at: examData.created_at,
    updated_at: examData.updated_at,
    questions: examQuestionLinks,
    questionCount: examQuestionLinks.length,
  } as Exam;
};

// --- News Articles ---
export const addNewsArticle = async (data: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  const dbData = {
    title: data.title,
    content: data.content,
    image_url: data.imageUrl || null,
  };
  const { data: newArticle, error } = await supabase
    .from('news_items')
    .insert(dbData)
    .select('id')
    .single();

  if (error) {
    console.error("Supabase error adding news article to news_items:", error);
    throw error;
  }
  if (!newArticle || !newArticle.id) {
    throw new Error("Failed to add news article: No ID returned from database.");
  }
  return String(newArticle.id);
};

export const getNewsArticles = async (): Promise<NewsArticle[]> => {
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase error fetching news articles from news_items:", error);
    throw error;
  }
  if (!data) return [];

  return data.map((article: any) => ({
    id: String(article.id),
    title: article.title,
    content: article.content,
    imageUrl: article.image_url,
    created_at: article.created_at,
    updated_at: article.updated_at,
  })) as NewsArticle[];
};
export const updateNewsArticle = async (id: string, data: Partial<Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  const dbData: any = {};
  if (data.title !== undefined) dbData.title = data.title;
  if (data.content !== undefined) dbData.content = data.content;
  if (data.imageUrl !== undefined) dbData.image_url = data.imageUrl;
  else if (data.hasOwnProperty('imageUrl') && data.imageUrl === null) dbData.image_url = null;


  const { error } = await supabase.from('news_items').update(dbData).eq('id', id);
  if (error) throw error;
};
export const deleteNewsArticle = async (id: string): Promise<void> => {
  const { error } = await supabase.from('news_items').delete().eq('id', id);
  if (error) throw error;
};
export const getNewsArticleById = async (id: string): Promise<NewsArticle | null> => {
  const { data: article, error } = await supabase.from('news_items').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!article) return null;
  return {
    id: String(article.id),
    title: article.title,
    content: article.content,
    imageUrl: article.image_url,
    created_at: article.created_at,
    updated_at: article.updated_at,
  } as NewsArticle;
};


// --- Activation Codes (QR Codes) ---
export const addAccessCode = async (data: Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  const dbData = {
    name: data.name,
    encoded_value: data.encodedValue,
    type: data.type,
    subject_id: data.subjectId,
    subject_name: data.subjectName,
    valid_from: data.validFrom,
    valid_until: data.validUntil,
    is_active: data.isActive,
    is_used: data.isUsed,
    used_at: data.usedAt,
    used_by_user_id: data.usedByUserId,
  };

  const { data: newCode, error } = await supabase.from('activation_codes').insert(dbData).select('id').single();
  if (error) throw error; return String(newCode.id);
};
export const getAccessCodes = async (): Promise<AccessCode[]> => {
  const { data, error } = await supabase.from('activation_codes').select('*');
  if (error) throw error;
  return (data?.map(ac => ({
    id: String(ac.id), // Ensure ID is string
    name: ac.name,
    encodedValue: ac.encoded_value,
    type: ac.type as AccessCodeType,
    subjectId: ac.subject_id,
    subjectName: ac.subject_name,
    validFrom: ac.valid_from,
    validUntil: ac.valid_until,
    isActive: ac.is_active,
    isUsed: ac.is_used,
    usedAt: ac.used_at,
    usedByUserId: ac.used_by_user_id,
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
    id: String(ac.id), // Ensure ID is string
    name: ac.name,
    encodedValue: ac.encoded_value,
    type: ac.type as AccessCodeType,
    subjectId: ac.subject_id,
    subjectName: ac.subject_name,
    validFrom: ac.valid_from,
    validUntil: ac.valid_until,
    isActive: ac.is_active,
    isUsed: ac.is_used,
    usedAt: ac.used_at,
    usedByUserId: ac.used_by_user_id,
    created_at: ac.created_at,
    updated_at: ac.updated_at,
  } as AccessCode;
};

// --- Subject Sections ---
export const addSubjectSection = async (subjectId: string, data: Omit<SubjectSection, 'id' | 'subjectId' | 'created_at' | 'updated_at' | 'lessons' | 'isLocked'>): Promise<string> => {
  const sectionDataToInsert: any = {
    subject_id: subjectId,
    title: data.title,
    type: data.type,
  };

  if (data.order !== undefined && data.order !== null) {
    sectionDataToInsert.order = data.order;
  } else {
    sectionDataToInsert.order = null;
  }
  if (data.hasOwnProperty('isLocked')) {
      sectionDataToInsert.is_locked = data.isLocked;
  }


  const { data: insertedData, error } = await supabase
    .from('subject_sections')
    .insert(sectionDataToInsert)
    .select('id')
    .single();

  if (error) {
    console.info("Supabase error details for addSubjectSection will follow on the next line(s).");
    console.error(error);
    try {
      console.error("Stringified Supabase error in addSubjectSection:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error("Could not stringify Supabase error in addSubjectSection:", e);
    }
    console.error("Parsed Supabase error details in addSubjectSection (if available):", {
      message: (error as any).message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: (error as any).code,
      status: (error as any).status,
    });
    throw error;
  }

  if (!insertedData || insertedData.id === null || insertedData.id === undefined) {
    console.error("Supabase addSubjectSection did not return the expected 'id'. Response:", insertedData);
    throw new Error("Failed to add subject section: No 'id' returned from database or unexpected response.");
  }
  return String(insertedData.id);
};


export const getSubjectSections = async (subjectId: string): Promise<SubjectSection[]> => {
  const { data, error } = await supabase
    .from('subject_sections')
    .select('id, subject_id, title, type, order, is_locked, created_at, updated_at')
    .eq('subject_id', subjectId)
    .order('order', { ascending: true, nullsLast: true })
    .order('title', { ascending: true });

  if (error) {
    console.info(`Supabase error details for getSubjectSections (subject: ${subjectId}) will follow on the next line(s).`);
    console.error(error);
    try {
      console.error("Stringified Supabase error in getSubjectSections:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error("Could not stringify Supabase error in getSubjectSections:", e);
    }
    throw error;
  }
  if (!data) return [];

  return data.map((section: any) => ({
    id: String(section.id),
    subjectId: section.subject_id,
    title: section.title,
    type: section.type as 'theory' | 'practical',
    order: section.order,
    isLocked: section.is_locked,
    created_at: section.created_at,
    updated_at: section.updated_at,
  })) as SubjectSection[];
};
export const updateSubjectSection = async (subjectId: string, sectionId: string, data: Partial<Omit<SubjectSection, 'id' | 'subjectId' | 'created_at' | 'updated_at' | 'lessons'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateSubjectSection"); };

export const deleteSubjectSection = async (subjectId: string, sectionId: string): Promise<void> => {
  const { error } = await supabase
    .from('subject_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    console.error(`Supabase error deleting section ${sectionId} (for subject ${subjectId}):`, error);
    throw error;
  }
};


// --- Lessons ---
export const addLesson = async (subjectId: string, sectionId: string, data: Omit<Lesson, 'id' | 'subjectId' | 'sectionId' | 'created_at' | 'updated_at' | 'questions'>): Promise<string> => {
  const lessonDataToInsert: any = {
    subject_id: subjectId,
    section_id: sectionId,
    title: data.title,
    video_url: data.videoUrl || null,
    content: data.content || null,
    teachers: data.teachers && data.teachers.length > 0 ? data.teachers : null,
    files: data.files && data.files.length > 0 ? data.files : null,
    order: (data.order !== undefined && data.order !== null) ? data.order : null,
    is_locked: data.isLocked !== undefined ? data.isLocked : true,
    linked_exam_ids: data.linkedExamIds && data.linkedExamIds.length > 0 ? data.linkedExamIds : null,
    notes: data.notes || null,
  };

  const { data: insertedData, error } = await supabase
    .from('lessons')
    .insert(lessonDataToInsert)
    .select('id')
    .single();

  if (error) {
    console.error("Supabase error adding lesson:", error);
    throw error;
  }
  if (!insertedData || !insertedData.id) {
    throw new Error("Failed to add lesson: No ID returned from database.");
  }
  return String(insertedData.id);
};


export const getLessonsInSection = async (subjectId: string, sectionId: string): Promise<Lesson[]> => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('section_id', sectionId)
    .order('order', { ascending: true, nullsLast: true })
    .order('title', { ascending: true });

  if (error) {
    console.error(`Supabase error fetching lessons for section ${sectionId}:`, error);
    throw error;
  }
  if (!data) return [];

  return data.map((lesson: any) => ({
    id: String(lesson.id),
    subjectId: lesson.subject_id,
    sectionId: lesson.section_id,
    title: lesson.title,
    videoUrl: lesson.video_url,
    content: lesson.content,
    teachers: lesson.teachers || [],
    files: lesson.files || [],
    order: lesson.order,
    isLocked: lesson.is_locked,
    linkedExamIds: lesson.linked_exam_ids || [],
    notes: lesson.notes,
    created_at: lesson.created_at,
    updated_at: lesson.updated_at,
  })) as Lesson[];
};
export const getLessonById = async (subjectId: string, sectionId: string, lessonId: string): Promise<Lesson | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getLessonById"); };
export const updateLesson = async (subjectId: string, sectionId: string, lessonId: string, data: Partial<Omit<Lesson, 'id' | 'subjectId' | 'sectionId' | 'created_at' | 'updated_at' | 'questions'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateLesson"); };
export const deleteLesson = async (subjectId: string, sectionId: string, lessonId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteLesson"); };

// --- Users (Profiles) ---
const mapDbProfileToUserProfile = (dbProfile: any): UserProfile => {
  return {
    id: String(dbProfile.id), // Ensure ID is string
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
    role: dbProfile.role as UserProfile['role'],
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
    console.error("Supabase error updating user:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
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
    .update({ subjects_taught_ids: subjectId })
    .eq('id', teacherId)
    .eq('role', 'teacher');

  if (error) {
    console.error("Supabase error updating teacher subjects:", error);
    throw error;
  }
};

// --- Questions for Lesson ---
export const getQuestionsForLesson = async (lessonId: string): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`Supabase error fetching questions for lesson ${lessonId}:`, error);
    throw error;
  }
  if (!data) return [];

  return data.map((q: any) => mapDbQuestionToQuestionType(q)).filter(q => q !== null) as Question[];
};
export const unlinkQuestionFromLesson = async (questionId: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": unlinkQuestionFromLesson"); };
export const getSubjectNameById = async (subjectId: string): Promise<string | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getSubjectNameById"); };

// --- Tags ---
export const addTag = async (data: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  const { data: newTag, error } = await supabase.from('tags').insert(data).select('id').single();
  if (error) throw error;
  return String(newTag.id); // Ensure ID is string
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
    id: String(t.id), // Ensure ID is string
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  })) as Tag[]) || [];
};
export const updateTag = async (id: string, data: Partial<Omit<Tag, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateTag"); };
export const deleteTag = async (id: string): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": deleteTag"); };

// --- Exam Attempts ---
export const getExamAttempts = async (examId?: string): Promise<ExamAttempt[]> => {
  let query = supabase.from('exam_attempts').select(`
    id,
    student_id,
    profiles ( name, email ), 
    exam_id,
    exams ( title ),
    score,
    total_possible_score,
    percentage,
    answers,
    started_at,
    completed_at,
    created_at,
    updated_at
  `); 

  if (examId) {
    query = query.eq('exam_id', examId);
  }

  const { data, error } = await query.order('completed_at', { ascending: false });

  if (error) {
    console.error("Supabase error fetching exam attempts:", error);
    throw error;
  }
  if (!data) return [];

  return data.map((attempt: any) => ({
    id: String(attempt.id),
    studentId: attempt.student_id,
    studentName: attempt.profiles?.name || attempt.profiles?.email || 'Unknown Student', 
    examId: attempt.exam_id,
    examTitle: attempt.exams?.title || 'Unknown Exam',
    score: attempt.score,
    totalPossibleScore: attempt.total_possible_score,
    percentage: attempt.percentage,
    answers: attempt.answers, // Type assertion for answers (should be JSONB array of objects)
    startedAt: attempt.started_at,
    completedAt: attempt.completed_at,
    created_at: attempt.created_at,
    updated_at: attempt.updated_at,
  })) as ExamAttempt[];
};


// --- App Settings ---
export const getAppSettings = async (): Promise<AppSettings | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getAppSettings"); };
export const updateAppSettings = async (settings: Partial<Omit<AppSettings, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": updateAppSettings"); };

// --- Exam Titles (Helper) ---
export const getExamTitleById = async (examId: string): Promise<string | null> => { throw new Error(NOT_IMPLEMENTED_ERROR + ": getExamTitleById"); };

// --- Announcements ---
export const addAnnouncement = async (data: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  const dbData = {
    title: data.title,
    message: data.message,
    type: data.type,
    is_active: data.isActive,
  };
  const { data: newAnnouncement, error } = await supabase
    .from('announcements')
    .insert(dbData)
    .select('id')
    .single();

  if (error) {
    console.error("Supabase error adding announcement:", error);
    throw error;
  }
  if (!newAnnouncement || !newAnnouncement.id) {
    throw new Error("Failed to add announcement: No ID returned from database.");
  }
  return String(newAnnouncement.id);
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase error fetching announcements:", error);
    throw error;
  }
  if (!data) return [];

  return data.map((item: any) => ({
    id: String(item.id),
    title: item.title,
    message: item.message,
    type: item.type as AnnouncementType,
    isActive: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
  })) as Announcement[];
};
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


