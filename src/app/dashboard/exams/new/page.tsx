import { ExamForm } from '@/components/exams/ExamForm';
import { createExam, getSubjects } from '@/lib/firestore';
import type { Exam, Subject } from '@/types';

export default async function NewExamPage() {
  const subjects: Subject[] = await getSubjects();
  
  async function handleCreateExam(data: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) {
    'use server';
    try {
      const newExamId = await createExam(data);
      return { success: true, id: newExamId };
    } catch (error) {
      console.error('Failed to create exam:', error);
      return { success: false, error: 'فشل إنشاء الامتحان.' };
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <ExamForm onSubmit={handleCreateExam} subjects={subjects} />
    </div>
  );
}
