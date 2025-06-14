import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string | null;
  role: 'admin' | 'student' | 'teacher';
  displayName?: string | null;
  photoURL?: string | null;
}

export interface Subject {
  id: string;
  name: string;
  branch: 'scientific' | 'literary' | 'general';
  description: string;
  imageUrl: string;
  icon: string; // Lucide icon name or SVG path
  imageHint: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type QuestionType = 'mcq' | 'true_false' | 'fill_blanks' | 'short_answer';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}
export interface Question {
  id: string;
  subjectId: string;
  type: QuestionType;
  text: string;
  options?: QuestionOption[]; // For MCQ
  correctAnswer?: string | boolean; // For True/False, Fill in the Blanks (can be array for multiple blanks), Short Answer
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  aiSanityCheck?: {
    isGrammaticallyCorrect: boolean;
    suggestedCorrections: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  questionIds: string[];
  published: boolean;
  imageUrl?: string;
  imageHint?: string;
  teacherName?: string;
  teacherId?: string;
  durationMinutes: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Add other types as needed: Tag, News, Announcement, QRCode, AppSettings etc.
export interface Tag {
  id: string;
  name: string;
}
