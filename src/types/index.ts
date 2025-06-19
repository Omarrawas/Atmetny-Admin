// src/types/index.ts
import type { Database as SupabaseDatabase } from './supabase'; // Import the generated Supabase types

// Enum based on your SQL: public.subject_branch_enum null default 'undetermined'::subject_branch_enum
export type SubjectBranchEnum = 'scientific' | 'literary' | 'general' | 'undetermined';

// Placeholder types for JSONB fields - refine these based on your actual data structure
export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon_url?: string; // Assuming snake_case from DB potentially
  achieved_at: string; // ISO date string
}

export interface Reward {
  id: string;
  title: string;
  description?: string;
  claimed_at?: string; // ISO date string
  // Add other fields as per your JSON structure
}

export interface ActiveSubscription {
    plan_id: string; // Assuming snake_case
    status: 'active' | 'past_due' | 'canceled' | 'trialing'; // Add other statuses if any
    current_period_end: string; // ISO date string
    // Add other fields as per your JSON structure like price, currency etc.
}

// Supabase uses string for user ID (usually UUID)
export interface UserProfile {
  id: string;
  email: string | null;
  name?: string | null; // Changed from displayName, matches SQL 'name'
  avatar_url?: string | null; // From SQL
  avatar_hint?: string | null; // From SQL
  points?: number; // From SQL
  level?: number; // From SQL
  progress_to_next_level?: number; // From SQL
  badges?: Badge[]; // From SQL (jsonb) - maps to 'badges' column
  rewards?: Reward[]; // From SQL (jsonb) - maps to 'rewards' column
  student_goals?: string | null; // From SQL
  branch?: SubjectBranchEnum | null; // From SQL - maps to 'branch' column
  university?: string | null; // From SQL
  major?: string | null; // From SQL
  active_subscription?: ActiveSubscription | null; // From SQL (jsonb) - maps to 'active_subscription' column
  role?: 'admin' | 'user' | 'student' | 'teacher' | null; // From SQL
  youtube_channel_url?: string | null; // From SQL
  subjects_taught_ids?: string[] | null; // Changed to array for multiple subjects
  created_at?: string; // Supabase uses snake_case ISO date strings
  updated_at?: string;
}

export interface Option {
  id: string;
  text: string;
}

export interface Tag {
  id?: string;
  name: string;
  created_at?: string; 
  updated_at?: string;
}

export type QuestionType = 'mcq' | 'true_false' | 'fill_in_the_blanks' | 'short_answer';

export interface BaseQuestion {
  id?: string;
  questionType: QuestionType;
  questionText: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  subjectId?: string | null;
  subject?: string; // This might be denormalized or come from a join
  lessonId?: string | null;
  tagIds?: string[];
  created_at?: string;
  updated_at?: string;
  isSane?: boolean | null;
  sanityExplanation?: string | null;
  isLocked?: boolean;
}

export interface MCQQuestion extends BaseQuestion {
  questionType: 'mcq';
  options: Option[];
  correctOptionId: string;
  correctAnswers?: never;
  modelAnswer?: never;
}

export interface TrueFalseQuestion extends BaseQuestion {
  questionType: 'true_false';
  options: Option[]; // Should be [{id: 'true', text: '...'}, {id: 'false', text: '...'}]
  correctOptionId: 'true' | 'false';
  correctAnswers?: never;
  modelAnswer?: never;
}

export interface FillInTheBlanksQuestion extends BaseQuestion {
  questionType: 'fill_in_the_blanks';
  correctAnswers: string[];
  options?: never;
  correctOptionId?: never;
  modelAnswer?: never;
}

export interface ShortAnswerQuestion extends BaseQuestion {
  questionType: 'short_answer';
  modelAnswer?: string;
  options?: never;
  correctOptionId?: never;
  correctAnswers?: never;
}

export type Question = MCQQuestion | TrueFalseQuestion | FillInTheBlanksQuestion | ShortAnswerQuestion;

// Interface for the data linking an exam to a question via the junction table
export interface ExamQuestionLink {
  question_id: string;
  order_number?: number | null;
  points?: number | null;
  question: Question; // The fully populated question object
}

export interface Exam {
  id?: string;
  title: string;
  description?: string | null;
  subjectId: string;
  // questionIds: string[]; // Removed this
  published?: boolean;
  image?: string | null;
  imageHint?: string | null;
  teacherName?: string | null;
  teacherId?: string | null;
  durationInMinutes?: number | null;
  duration?: number | null; // Stored in DB as 'duration' (minutes)
  created_at?: string;
  updated_at?: string;

  // New fields related to the exam_questions junction table
  questionCount?: number; // For list views, total count of questions linked to this exam
  questions?: ExamQuestionLink[]; // For detail/edit views, array of linked questions with their order and points
}


export interface NewsArticle {
  id?: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type SubjectBranch = 'scientific' | 'literary' | 'general'; // Kept for internal app logic if needed, distinct from SubjectBranchEnum if enum has more values

export interface Subject {
  id?: string;
  name: string;
  description?: string;
  branch: SubjectBranch; // This might need to align with SubjectBranchEnum if they are intended to be the same.
  image?: string | null;
  iconName?: string | null;
  imageHint?: string | null;
  order?: number;
  created_at?: string;
  updated_at?: string;
  sections?: SubjectSection[];
}

export interface LessonTeacher {
  name: string;
  youtubeUrl?: string | null;
}

export interface LessonFile {
  name: string;
  url: string;
  type: string;
}

export interface SubjectSection {
  id?: string;
  subjectId: string;
  title: string;
  type: 'theory' | 'practical';
  order?: number;
  isLocked?: boolean;
  created_at?: string;
  updated_at?: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id?: string;
  subjectId: string;
  sectionId: string;
  title: string;
  videoUrl?: string | null;
  content?: string | null;
  teachers?: LessonTeacher[];
  files?: LessonFile[];
  order?: number;
  isLocked?: boolean;
  linkedExamIds?: string[];
  notes?: string | null;
  interactiveAppContent?: string | null; 
  created_at?: string;
  updated_at?: string;
  questions?: Question[];
}

export type AccessCodeType =
  | 'subject_specific'
  | 'subject_monthly'
  | 'subject_yearly'
  | 'general_monthly'
  | 'general_6_months'
  | 'general_yearly'
  | 'choose_single_subject_monthly'
  | 'choose_single_subject_quarterly'
  | 'choose_single_subject_yearly';

export interface AccessCode {
  id?: string;
  name: string;
  encodedValue: string;
  type: AccessCodeType;
  subjectId?: string | null;
  subjectName?: string | null;
  validFrom: string; // ISO Date string
  validUntil: string; // ISO Date string
  isActive: boolean;
  isUsed?: boolean;
  usedAt?: string | null; // ISO Date string
  usedByUserId?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AnswerAttempt {
  questionId: string;
  studentAnswer: any; // Could be string, number, string[] depending on question type
  isCorrect: boolean;
}

export interface ExamAttempt {
  id?: string;
  userId: string; // Changed from studentId, maps to user_id
  user?: { name?: string | null; email?: string | null }; // For joined data from profiles
  examId: string; // maps to exam_id
  exam?: { title?: string | null }; // For joined data from exams
  subjectId?: string | null; // New, maps to subject_id
  examType: 'general_exam' | 'subject_practice' | string; // New, maps to exam_type
  score: number;
  correctAnswersCount: number; // New, maps to correct_answers_count
  totalQuestionsAttempted: number; // New, maps to total_questions_attempted
  answers: AnswerAttempt[]; // JSONB in DB
  startedAt?: string; // ISO Date string, maps to started_at
  completedAt: string; // ISO Date string, maps to completed_at
  created_at?: string;
  updated_at?: string;
}

export type AdminNotificationType = 
  | 'qr_code_expiry_warning' 
  | 'low_question_count_subject' 
  | 'new_user_registered' 
  | 'system_update'
  | 'custom_admin_message'
  | 'info'; // Added generic info type

export interface AdminNotification {
  id: string; // uuid
  type: AdminNotificationType;
  message: string;
  link_path?: string | null; // Path within the admin dashboard
  related_entity_id?: string | null; // uuid of the related entity (e.g., QR code ID, subject ID)
  related_entity_type?: string | null; // e.g., 'access_code', 'subject'
  is_read: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export type UserNotificationType = 
  | 'new_announcement'
  | 'exam_reminder'
  | 'new_lesson_available'
  | 'general_info';

export interface UserNotification {
  id: string; // uuid
  user_id: string; // uuid, FK to profiles.id (or auth.users.id)
  type: UserNotificationType;
  title: string;
  message: string;
  link_path?: string | null; // Path within the student app
  related_entity_id?: string | null;
  related_entity_type?: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}


export type SocialPlatform = 
  | 'Facebook' 
  | 'whatsapp' 
  | 'Instagram' 
  | 'Telegram' 
  | 'Twitter' 
  | 'LinkedIn' 
  | 'YouTube' 
  | 'TikTok' 
  | 'Discord'
  | ''; // Added empty string to allow for placeholder selection

export interface AppSettings {
  id?: string;
  appName?: string | null;
  appLogoUrl?: string | null;
  supportPhoneNumber?: string | null;
  supportEmail?: string | null;
  socialMediaLinks?: SocialMediaLink[];
  termsOfServiceUrl?: string | null;
  privacyPolicyUrl?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AnnouncementType = 'info' | 'warning' | 'important' | 'success';

export interface Announcement {
  id?: string;
  title: string;
  message: string;
  type: AnnouncementType;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

// Re-export the Database interface from the Supabase generated types
export type Database = SupabaseDatabase;
