
// src/app/dashboard/subjects/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSubjects, deleteSubject } from '@/lib/firestore';
import type { Subject } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import SubjectDetails from '@/components/subjects/SubjectDetails';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger as AlertDialogTriggerComponent,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2, BookOpenCheck, Edit3, Trash2, PlusCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const branchTranslations: Record<Subject['branch'], string> = {
  general: "عام",
  scientific: "علمي",
  literary: "أدبي",
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);

  const { user, userProfile, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchSubjects = useCallback(async () => {
    if (!user || !userProfile) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSubjects = await getSubjects(user.id, userProfile.role);
      setSubjects(fetchedSubjects);
    } catch (err: any) {
      console.error("Error fetching subjects:", err);
      setError("فشل في تحميل قائمة المواد.");
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (user && userProfile) {
        fetchSubjects();
    }
  }, [fetchSubjects, user, userProfile]);

  const handleDeleteSubject = async () => {
    if (!deletingSubjectId || !isAdmin) {
      toast({ variant: "destructive", title: "غير مصرح به", description: "ليس لديك صلاحية حذف المواد." });
      return;
    };
    try {
      await deleteSubject(deletingSubjectId, user?.id, userProfile?.role);
      toast({ title: "نجاح", description: "تم حذف المادة بنجاح." });
      setSubjects(prev => prev.filter(s => s.id !== deletingSubjectId));
    } catch (err: any) {
      console.error("Error deleting subject:", err);
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل حذف المادة." });
    } finally {
      setDeletingSubjectId(null);
    }
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
              <BookOpenCheck className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold tracking-tight">إدارة المواد الدراسية</CardTitle>
            </div>
            {isAdmin && (
              <Link href="/dashboard/subjects/new">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> إضافة مادة جديدة
                </Button>
              </Link>
            )}
          </div>
           <CardDescription className="text-lg text-muted-foreground">
            تصفح، عدّل، وأدر الأقسام والدروس لكل مادة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 rtl:mr-3 text-lg text-muted-foreground">جاري تحميل المواد...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : subjects.length === 0 ? (
             <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 min-h-[300px]">
              <BookOpenCheck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">لا توجد مواد دراسية</h2>
              <p className="text-muted-foreground max-w-md">
                {isAdmin ? 'ابدأ بإضافة مادة جديدة لتظهر هنا.' : 'لم يتم تعيين أي مواد لك حتى الآن.'}
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>
              {subjects.map((subject) => (
                <AccordionItem value={subject.id!} key={subject.id!} className="border-b-0 mb-3 rounded-lg border bg-card overflow-hidden group">
                  <div className="flex items-center w-full p-4 hover:bg-muted/50 transition-colors group-data-[state=open]:border-b">
                    <AccordionTrigger className="p-0 flex-1 flex justify-between text-right hover:no-underline">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold">{subject.name}</h3>
                        <Badge variant="secondary">{branchTranslations[subject.branch] || subject.branch}</Badge>
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-2 pl-4 rtl:pr-4 rtl:pl-0 flex-shrink-0">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/subjects/edit/${subject.id}`}>
                          <Edit3 className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/> تعديل
                        </Link>
                      </Button>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTriggerComponent asChild>
                             <Button variant="destructive" size="sm" onClick={() => setDeletingSubjectId(subject.id!)}>
                                <Trash2 className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/> حذف
                            </Button>
                          </AlertDialogTriggerComponent>
                          <AlertDialogContent>
                            <AlertDialogHeader className="text-right">
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم حذف المادة "{subject.name}" وكل الأقسام والدروس والأسئلة المرتبطة بها بشكل دائم.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse">
                              <AlertDialogCancel onClick={() => setDeletingSubjectId(null)}>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <AccordionContent className="p-0">
                    <div className="bg-muted/20 p-4">
                        <SubjectDetails subjectId={subject.id!} subjectName={subject.name}/>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
