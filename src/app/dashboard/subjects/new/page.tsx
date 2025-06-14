import { SubjectForm } from '@/components/subjects/SubjectForm';
import { createSubject } from '@/lib/firestore';
import type { Subject } from '@/types';

export default function NewSubjectPage() {
  
  async function handleCreateSubject(data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) {
    'use server';
    try {
      const newSubjectId = await createSubject(data);
      return { success: true, id: newSubjectId };
    } catch (error) {
      console.error('Failed to create subject:', error);
      return { success: false, error: 'فشل إنشاء المادة.' };
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <SubjectForm onSubmit={handleCreateSubject} />
    </div>
  );
}
