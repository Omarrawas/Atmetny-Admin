// src/app/dashboard/subjects/new/page.tsx
"use client";

import React from 'react';
import AddSubjectForm from '@/components/subjects/AddSubjectForm';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookPlus } from 'lucide-react';

export default function NewSubjectPage() {
  const router = useRouter();

  const handleSubjectAdded = (subjectId: string) => {
    // After subject is added, redirect to the main subjects list page
    router.push('/dashboard/subjects');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
            <BookPlus className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">إضافة مادة جديدة</CardTitle>
          </div>
          <CardDescription>املأ تفاصيل المادة الدراسية الجديدة.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddSubjectForm onSubjectAdded={handleSubjectAdded} />
        </CardContent>
      </Card>
    </div>
  );
}
