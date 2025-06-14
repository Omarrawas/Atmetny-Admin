import { QuestionForm } from '@/components/questions/QuestionForm';
import { createQuestion, getSubjects, getTags } from '@/lib/firestore';
import type { Question, Subject, Tag } from '@/types';

export default async function NewQuestionPage() {
  const subjects: Subject[] = await getSubjects();
  const allTags: Tag[] = await getTags(); // You'll need to implement getTags
  
  async function handleCreateQuestion(data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) {
    'use server';
    try {
      const newQuestionId = await createQuestion(data);
      return { success: true, id: newQuestionId };
    } catch (error) {
      console.error('Failed to create question:', error);
      return { success: false, error: 'فشل إنشاء السؤال.' };
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <QuestionForm onSubmit={handleCreateQuestion} subjects={subjects} allTags={allTags} />
    </div>
  );
}
