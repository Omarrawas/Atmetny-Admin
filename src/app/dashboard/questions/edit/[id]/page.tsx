import { QuestionForm } from '@/components/questions/QuestionForm';
import { getQuestion, updateQuestion, getSubjects, getTags } from '@/lib/firestore';
import type { Question, Subject, Tag } from '@/types';
import { notFound } from 'next/navigation';

interface EditQuestionPageProps {
  params: { id: string };
}

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
  const questionId = params.id;
  const question = await getQuestion(questionId);
  const subjects: Subject[] = await getSubjects();
  const allTags: Tag[] = await getTags();

  if (!question) {
    notFound();
  }
  
  async function handleUpdateQuestion(data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) {
    'use server';
    try {
      await updateQuestion(questionId, data);
      return { success: true, id: questionId };
    } catch (error) {
      console.error('Failed to update question:', error);
      return { success: false, error: 'فشل تحديث السؤال.' };
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <QuestionForm initialData={question} onSubmit={handleUpdateQuestion} subjects={subjects} allTags={allTags} />
    </div>
  );
}
