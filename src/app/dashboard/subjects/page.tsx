
// src/app/dashboard/subjects/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
// AddSubjectForm is no longer imported here as adding is on a dedicated page
import SubjectDetails from '@/components/subjects/SubjectDetails'; // Import SubjectDetails
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Loader2, BookOpenCheck, Edit3, Trash2, PlusCircle, Image as ImageIcon, HelpCircle, AlertTriangle } from 'lucide-react'; // Removed ChevronDown, ChevronUp
import * as LucideIcons from 'lucide-react'; 
import { getSubjects, deleteSubject as deleteSubjectFromDb } from '@/lib/firestore';
import type { Subject, SubjectBranch } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription as UiDialogDescription, 
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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


export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSubjectsList = useCallback(async () => {
    console.log("[SubjectsPage] Fetching subjects list...");
    setIsLoading(true);
    setFetchError(null); 
    try {
      const fetchedSubjects = await getSubjects();
      console.log("[SubjectsPage] Fetched subjects:", fetchedSubjects);
      setSubjects(fetchedSubjects);
      if (fetchedSubjects.length === 0) {
        console.log("[SubjectsPage] No subjects found in database.");
      }
    } catch (error) {
      console.error("[SubjectsPage] Error fetching subjects:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching subjects.";
      setFetchError(errorMessage);
      toast({
        variant: "destructive",
        title: "خطأ في جلب المواد",
        description: "لم نتمكن من تحميل قائمة المواد الدراسية. يرجى المحاولة مرة أخرى لاحقًا.",
      });
    } finally {
      setIsLoading(false);
      console.log("[SubjectsPage] Finished fetching subjects list.");
    }
  }, [toast]); 

  useEffect(() => {
    fetchSubjectsList();
  }, [fetchSubjectsList]);
  
  const handleDeleteSubject = async () => {
    if (!deletingSubjectId) return;
    try {
      await deleteSubjectFromDb(deletingSubjectId);
      setSubjects(subjects.filter(s => s.id !== deletingSubjectId));
      toast({
        title: "نجاح",
        description: "تم حذف المادة بنجاح.",
      });
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت عملية حذف المادة.",
      });
    } finally {
      setDeletingSubjectId(null);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <BookOpenCheck className="h-8 w-8 mr-3 text-primary rtl:ml-3 rtl:mr-0" />
            إدارة المواد الدراسية
          </h1>
          <p className="text-muted-foreground mt-1">
            أضف، عدل، أو احذف المواد الدراسية ومحتواها التفصيلي.
          </p>
        </div>
        <Link href="/dashboard/subjects/new">
          <Button size="lg">
            <PlusCircle className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
            إضافة مادة جديدة
          </Button>
        </Link>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <List className="h-6 w-6 mr-2 text-primary rtl:ml-2 rtl:mr-0" />
            قائمة المواد الدراسية
          </CardTitle>
          <CardDescription>
            تصفح جميع المواد الدراسية المتاحة. انقر على "عرض التفاصيل" لإدارة الأقسام والدروس في نافذة منبثقة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-lg text-muted-foreground rtl:mr-3 rtl:ml-0">جاري تحميل المواد...</p>
            </div>
          ) : fetchError ? ( 
            <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>فشل تحميل المواد</AlertTitle>
              <AlertDescription>
                حدث خطأ أثناء محاولة جلب قائمة المواد الدراسية. يرجى التأكد من اتصالك بالإنترنت ومن صحة إعدادات Firebase وقواعد الأمان.
                <br />
                <span className="text-xs mt-1 block">تفاصيل الخطأ: {fetchError}</span>
                <Button variant="outline" size="sm" onClick={fetchSubjectsList} className="mt-2">
                  إعادة المحاولة
                </Button>
              </AlertDescription>
            </Alert>
          ) : subjects.length === 0 ? (
            <div className="text-center py-10">
              <BookOpenCheck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground">لا توجد مواد دراسية بعد</h3>
              <p className="text-muted-foreground mt-1">ابدأ بإضافة مادتك الدراسية الأولى من خلال زر "إضافة مادة جديدة" أعلاه.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {subjects.map((subject) => (
                <div key={subject.id}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {subject.image && subject.image.trim() !== '' ? (
                      <div className="relative w-full h-40">
                        <NextImage 
                          src={subject.image} 
                          alt={`صورة لمادة ${subject.name}`} 
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          data-ai-hint={subject.imageHint || 'education study'}
                          key={subject.image || 'subject-image-key'}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-muted flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl flex items-center">
                           {subject.iconName && (
                              <IconComponent iconName={subject.iconName} className="mr-2 h-5 w-5 text-primary rtl:ml-2 rtl:mr-0" />
                            )}
                          {subject.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-sm whitespace-nowrap">{branchTranslations[subject.branch] || subject.branch}</Badge>
                      </div>
                      {subject.description && (
                        <CardDescription className="mt-1 text-sm line-clamp-2">{subject.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="border-t p-4 flex justify-between items-center">
                       <Dialog>
                        <DialogTrigger asChild>
                           <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                              عرض التفاصيل
                           </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl md:max-w-3xl lg:max-w-4xl h-[90vh] flex flex-col" dir="rtl">
                           <UiDialogHeader className="text-right flex-shrink-0 px-6 pt-6 pb-4 border-b">
                            <UiDialogTitle className="text-xl">تفاصيل المادة: {subject.name}</UiDialogTitle>
                            <UiDialogDescription>
                              إدارة الأقسام والدروس والمرفقات والأسئلة لهذه المادة.
                            </UiDialogDescription>
                          </UiDialogHeader>
                          <div className="flex-grow overflow-y-auto p-6">
                            <SubjectDetails subjectId={subject.id!} subjectName={subject.name} />
                          </div>
                        </DialogContent>
                      </Dialog>

                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/subjects/edit/${subject.id}`}> 
                            <Edit3 className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" /> تعديل
                          </Link>
                        </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" onClick={() => setDeletingSubjectId(subject.id!)}>
                                <Trash2 className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" /> حذف
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader className="text-right">
                                <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم حذف المادة الدراسية "{subject.name}" وجميع أقسامها ودروسها بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse">
                                <AlertDialogCancel onClick={() => setDeletingSubjectId(null)}>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    

    