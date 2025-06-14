import { SubjectForm } from '@/components/subjects/SubjectForm';
import { getSubject, updateSubject } from '@/lib/firestore';
import type { Subject } from '@/types';
import { notFound } from 'next/navigation';

interface EditSubjectPageProps {
  params: { id: string };
}

export default async function EditSubjectPage({ params }: EditSubjectPageProps) {
  const subjectId = params.id;
  const subject = await getSubject(subjectId);

  if (!subject) {
    notFound();
  }
  
  async function handleUpdateSubject(data: Partial<Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>>) {
    'use server';
    try {
      await updateSubject(subjectId, data);
      return { success: true, id: subjectId };
    } catch (error) {
      console.error('Failed to update subject:', error);
      return { success: false, error: 'فشل تحديث المادة.' };
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <SubjectForm initialData={subject} onSubmit={handleUpdateSubject} />
    </div>
  );
}
