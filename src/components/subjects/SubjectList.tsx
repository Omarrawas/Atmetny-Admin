// src/components/subjects/SubjectList.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { getSubjects } from '@/lib/firestore'; 
import type { Subject, SubjectBranch } from '@/types'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, ImageIcon, HelpCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

const branchTranslations: Record<SubjectBranch, string> = {
  general: "عام",
  scientific: "علمي",
  literary: "أدبي",
};

const IconComponent = ({ iconName, ...props }: { iconName: string } & LucideIcons.LucideProps) => {
  const Icon = (LucideIcons as any)[iconName];
  if (Icon) {
    return <Icon {...props} />;
  }
  return <HelpCircle {...props} />;
};

export default function SubjectList() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSubjects = await getSubjects();
      setSubjects(fetchedSubjects);
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setError("فشل في تحميل قائمة المواد.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  return (
    <Card className="mt-6 shadow-md">
      <CardHeader>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <BookOpen className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">قائمة المواد الدراسية</CardTitle>
        </div>
        <CardDescription>تصفح المواد المضافة حاليًا مع فروعها وصورها وأيقوناتها.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground rtl:mr-2 rtl:ml-0">جاري تحميل المواد...</p>
          </div>
        ) : error ? (
           <p className="text-center text-destructive py-6">{error}</p>
        ) : subjects.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">لا توجد مواد دراسية مضافة حاليًا.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(subject => (
              <Card key={subject.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                {subject.image && subject.image.trim() !== '' ? (
                  <div className="relative w-full h-36">
                    <Image 
                      src={subject.image} 
                      alt={`صورة لمادة ${subject.name}`} 
                      layout="fill" 
                      objectFit="cover"
                      data-ai-hint={subject.imageHint || 'education study'}
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
                <CardHeader className="flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center">
                      {subject.iconName && (
                        <IconComponent iconName={subject.iconName} className="mr-2 h-5 w-5 text-primary rtl:ml-2 rtl:mr-0" />
                      )}
                      <h3 className="text-lg font-semibold text-foreground">{subject.name}</h3>
                    </div>
                    <Badge variant="secondary" className="whitespace-nowrap">{branchTranslations[subject.branch] || subject.branch}</Badge>
                  </div>
                  {subject.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{subject.description}</p>
                  )}
                </CardHeader>
                {/* Potential CardFooter for actions if this component were to have them */}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
