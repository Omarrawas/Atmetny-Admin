
// src/app/dashboard/exams/page.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import NextImage from 'next/image'; // Use NextImage
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { ClipboardList, PlusCircle, Loader2, Edit3, Trash2, BookOpen, Eye, EyeOff, Image as ImageIconLucide, User, Clock } from 'lucide-react';
import { getExams, deleteExam as deleteExamFromDb, getSubjects, updateExam } from '@/lib/firestore';
import type { Exam, Subject } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [togglingPublishExamId, setTogglingPublishExamId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPageData = async () => {
      setIsLoading(true);
      try {
        const [fetchedExams, fetchedSubjects] = await Promise.all([
          getExams(),
          getSubjects()
        ]);
        setExams(fetchedExams);
        setSubjects(fetchedSubjects);
      } catch (error) {
        console.error("Error fetching exams or subjects:", error);
        toast({ variant: "destructive", title: "خطأ", description: "فشل في جلب الامتحانات أو المواد." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPageData();
  }, [toast]);

  const subjectsMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach(subject => {
      if (subject.id) {
        map.set(subject.id, subject.name);
      }
    });
    return map;
  }, [subjects]);

  const handleDeleteExam = async () => {
    if (!deletingExamId) return;
    try {
      await deleteExamFromDb(deletingExamId);
      setExams(prevExams => prevExams.filter(exam => exam.id !== deletingExamId));
      toast({
        title: "نجاح",
        description: "تم حذف الامتحان بنجاح.",
      });
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل حذف الامتحان.",
      });
    } finally {
      setDeletingExamId(null);
    }
  };

  const handleTogglePublish = async (exam: Exam) => {
    if (!exam.id) return;
    setTogglingPublishExamId(exam.id);
    try {
      const newPublishedStatus = !(exam.published || false);
      await updateExam(exam.id, { published: newPublishedStatus });
      setExams(prevExams =>
        prevExams.map(e =>
          e.id === exam.id ? { ...e, published: newPublishedStatus } : e
        )
      );
      toast({
        title: "تم تحديث حالة النشر",
        description: `الامتحان "${exam.title}" هو الآن ${newPublishedStatus ? "منشور" : "غير منشور"}.`,
      });
    } catch (error) {
      console.error("Error toggling publish status:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في تحديث حالة نشر الامتحان.",
      });
    } finally {
      setTogglingPublishExamId(null);
    }
  };

  const getQuestionCountText = (count: number) => {
    if (count === 0) return '0 أسئلة';
    if (count === 1) return 'سؤال واحد';
    if (count === 2) return 'سؤالان';
    if (count >= 3 && count <= 10) return `${count} أسئلة`;
    return `${count} سؤالاً`;
  };

  const getQuestionCount = (exam: Exam) => {
    return Array.isArray(exam.questionIds) ? exam.questionIds.length : 0;
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 mb-2 rtl:space-x-reverse">
              <ClipboardList className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold tracking-tight">إدارة الامتحانات</CardTitle>
            </div>
            <Link href="/dashboard/exams/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> إضافة امتحان جديد
              </Button>
            </Link>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            قم بإنشاء وإدارة الامتحانات الخاصة بك من هنا.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-lg text-muted-foreground rtl:mr-3 rtl:ml-0">جاري تحميل الامتحانات...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 min-h-[300px]">
              <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">لا توجد امتحانات بعد</h2>
              <p className="text-muted-foreground max-w-md">
                ابدأ بإضافة امتحان جديد ليظهر هنا.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => {
                const questionCount = getQuestionCount(exam);
                return (
                  <Card key={exam.id} className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 overflow-hidden">
                    {exam.image && exam.image.trim() !== '' ? (
                        <div className="relative w-full h-40">
                          <NextImage 
                            src={exam.image} 
                            alt={`صورة لامتحان ${exam.title}`} 
                            layout="fill"
                            objectFit="cover"
                            data-ai-hint={exam.imageHint || 'test exam education'}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-muted flex items-center justify-center">
                          <ImageIconLucide className="h-16 w-16 text-muted-foreground/50" />
                        </div>
                      )}
                    <CardHeader className="pt-4">
                      <div className="flex justify-between items-start">
                          <CardTitle className="text-xl">{exam.title}</CardTitle>
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {getQuestionCountText(questionCount)}
                          </Badge>
                      </div>
                      {exam.description && (
                        <CardDescription className="mt-1 text-sm line-clamp-2">{exam.description}</CardDescription>
                      )}
                       <div className="text-sm text-muted-foreground mt-2 flex items-center">
                          <BookOpen className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                          المادة: {subjectsMap.get(exam.subjectId) || 'غير محدد'}
                      </div>
                      {exam.teacherName && (
                        <div className="text-sm text-muted-foreground mt-1 flex items-center">
                          <User className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                          الأستاذ: {exam.teacherName}
                        </div>
                      )}
                      {exam.durationInMinutes && (
                        <div className="text-sm text-muted-foreground mt-1 flex items-center">
                          <Clock className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                          المدة: {exam.durationInMinutes} دقيقة
                        </div>
                      )}
                      <div className="mt-2 flex items-center space-x-2 rtl:space-x-reverse">
                        <Switch
                          id={`publish-switch-${exam.id}`}
                          checked={exam.published || false}
                          onCheckedChange={() => handleTogglePublish(exam)}
                          disabled={togglingPublishExamId === exam.id}
                          aria-label={`Toggle publish status for ${exam.title}`}
                        />
                        <Label htmlFor={`publish-switch-${exam.id}`} className="text-sm">
                          {togglingPublishExamId === exam.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : exam.published ? (
                            <span className="flex items-center text-green-600"><Eye className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0"/> منشور</span>
                          ) : (
                            <span className="flex items-center text-red-600"><EyeOff className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0"/> غير منشور</span>
                          )}
                        </Label>
                      </div>
                    </CardHeader>
                    <CardFooter className="border-t p-4 flex justify-end space-x-2 rtl:space-x-reverse">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/exams/edit/${exam.id}`}>
                          <span className="inline-flex items-center">
                            <Edit3 className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" /> تعديل
                          </span>
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => setDeletingExamId(exam.id!)}>
                            <span className="inline-flex items-center">
                              <Trash2 className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" /> حذف
                            </span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader className="text-right">
                            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف الامتحان "{exam.title}" بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse">
                            <AlertDialogCancel onClick={() => setDeletingExamId(null)}>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteExam} className="bg-destructive hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
