import { ExamForm } from '@/components/exams/ExamForm';
import { getExam, updateExam, getSubjects } from '@/lib/firestore';
import type { Exam, Subject } from '@/types';
import { notFound } from 'next/navigation';

interface EditExamPageProps {
  params: { id: string };
}

export default async function EditExamPage({ params }: EditExamPageProps) {
  const examId = params.id;
  const exam = await getExam(examId);
  const subjects: Subject[] = await getSubjects();

  if (!exam) {
    notFound();
  }
  
  async function handleUpdateExam(data: Partial<Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>>) {
    'use server';
    try {
      await updateExam(examId, data);
      return { success: true, id: examId };
    } catch (error) {
      console.error('Failed to update exam:', error);
      return { success: false, error: 'فشل تحديث الامتحان.' };
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <ExamForm initialData={exam} onSubmit={handleUpdateExam} subjects={subjects} />
    </div>
  );
}
