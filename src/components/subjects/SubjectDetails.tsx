
// src/components/subjects/SubjectDetails.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import 'katex/dist/katex.min.css';
import NextImage from 'next/image';

import {
    getSubjectSections,
    deleteLesson,
    getQuestionsForLesson,
    updateSubjectSection,
    deleteSubjectSection,
    updateLesson,
    unlinkQuestionFromLesson,
    getLessonsInSection,
    getExams, 
    getExamById, 
} from '@/lib/firestore';
import type { SubjectSection, Lesson, LessonFile, Question, LessonTeacher, Exam } from '@/types'; 
import AddSectionForm from '@/components/sections/AddSectionForm';
import AddLessonForm from '@/components/lessons/AddLessonForm';
import EditLessonForm from '@/components/lessons/EditLessonForm';
import AddLessonQuestionForm from '@/components/questions/AddLessonQuestionForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Loader2, Film, FileText, Info, UserCircle, Trash2, Edit, ChevronDown, ChevronUp, AlertTriangle, ExternalLink, Download, Paperclip, ImageIcon, ListChecks, Link2Off, Save, SortAsc, Youtube, Sigma, CheckSquare } from 'lucide-react'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
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
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
  DialogDescription as UiDialogDescription,
  DialogFooter as UiDialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as UiFormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BlockMath } from 'react-katex';
import Link from 'next/link';


interface SubjectDetailsProps {
  subjectId: string;
  subjectName: string;
}

const editSectionSchema = z.object({
  title: z.string().min(3, "عنوان القسم يجب أن يكون 3 أحرف على الأقل."),
  type: z.enum(['theory', 'practical'], { required_error: "الرجاء اختيار نوع القسم." }),
  order: z.coerce.number().int().min(0, "الترتيب يجب أن يكون رقمًا موجبًا أو صفرًا.").optional().nullable(),
});
type EditSectionFormValues = z.infer<typeof editSectionSchema>;

const LessonContentRenderer = ({ content }: { content: string | null | undefined }) => {
  if (!content) return null;
  const parts = content.split(/(\$\$[^$]+\$\$)/g);

  return (
    <div className="text-sm text-muted-foreground space-y-1 prose prose-sm max-w-none" style={{ direction: 'rtl' }}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          try {
            const latexContent = part.slice(2, -2).trim();
            if (!latexContent) return <span key={index}>$$$$</span>;
            return <BlockMath key={index} math={latexContent} />;
          } catch (error) {
            console.error("KaTeX rendering error:", error);
            return <pre key={index} className="text-red-500 text-xs whitespace-pre-wrap">Error rendering: {part.trim()}</pre>;
          }
        } else {
          return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
        }
      })}
    </div>
  );
};


export default function SubjectDetails({ subjectId, subjectName }: SubjectDetailsProps) {
  const [sections, setSections] = useState<SubjectSection[]>([]);
  const [lessonsBySection, setLessonsBySection] = useState<Record<string, Lesson[]>>({});
  const [questionsByLesson, setQuestionsByLesson] = useState<Record<string, Question[]>>({});
  const [allExams, setAllExams] = useState<Exam[]>([]); 

  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [isLoadingLessons, setIsLoadingLessons] = useState<Record<string, boolean>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<Record<string, boolean>>({});
  const [isLoadingExams, setIsLoadingExams] = useState(true); 

  const [managingLessonsForSectionId, setManagingLessonsForSectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [activeLessonAccordion, setActiveLessonAccordion] = useState<string[]>([]);

  const [editingSection, setEditingSection] = useState<SubjectSection | null>(null);
  const [isSubmittingEditSection, setIsSubmittingEditSection] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);

  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isEditLessonDialogOpen, setIsEditLessonDialogOpen] = useState(false);


  const editSectionForm = useForm<EditSectionFormValues>({
    resolver: zodResolver(editSectionSchema),
    defaultValues: {
      title: '',
      type: 'theory',
      order: undefined,
    },
  });


  const fetchSubjectContent = useCallback(async () => {
    setIsLoadingSections(true);
    setIsLoadingExams(true);
    setError(null);
    try {
      const [fetchedSections, fetchedExams] = await Promise.all([
        getSubjectSections(subjectId),
        getExams() 
      ]);
      setSections(fetchedSections);
      setAllExams(fetchedExams);
      setIsLoadingExams(false);

      setLessonsBySection({});
      setQuestionsByLesson({});
      const initialLessonsLoading: Record<string, boolean> = {};
      fetchedSections.forEach(section => {
        if(section.id) initialLessonsLoading[section.id] = false;
      });
      setIsLoadingLessons(initialLessonsLoading);
    } catch (err) {
      console.error("Error fetching subject sections or exams:", err);
      setError("فشل في تحميل بيانات المادة أو الامتحانات.");
      setIsLoadingExams(false);
    } finally {
      setIsLoadingSections(false);
    }
  }, [subjectId]);

  useEffect(() => {
    if (subjectId) {
      fetchSubjectContent();
    }
  }, [subjectId, fetchSubjectContent]);

  const fetchLessonsForSection = async (sectionIdParam: string) => {
    setIsLoadingLessons(prev => ({ ...prev, [sectionIdParam]: true }));
    setLessonsBySection(prev => ({ ...prev, [sectionIdParam]: [] }));

    setQuestionsByLesson(prevQuestions => {
        const newQuestionsState = {...prevQuestions};
        (lessonsBySection[sectionIdParam] || []).forEach(lesson => {
            if (lesson.id) delete newQuestionsState[lesson.id];
        });
        return newQuestionsState;
    });

    try {
      const fetchedLessons = await getLessonsInSection(subjectId, sectionIdParam);
      setLessonsBySection(prev => ({ ...prev, [sectionIdParam]: fetchedLessons }));

      const initialQuestionsLoadingForSection: Record<string, boolean> = {};
      fetchedLessons.forEach(lesson => {
        if (lesson.id) initialQuestionsLoadingForSection[lesson.id] = false;
      });
      setIsLoadingQuestions(prev => ({...prev, ...initialQuestionsLoadingForSection}));

    } catch (err) {
      console.error(`Error fetching lessons for section ${sectionIdParam}:`, err);
      toast({ variant: "destructive", title: "خطأ", description: `فشل تحميل الدروس للقسم.` });
    } finally {
      setIsLoadingLessons(prev => ({ ...prev, [sectionIdParam]: false }));
    }
  };

  const handleFetchQuestionsForLesson = async (lessonId: string) => {
    if (!questionsByLesson[lessonId] || questionsByLesson[lessonId]?.length === 0) {
        setIsLoadingQuestions(prev => ({...prev, [lessonId]: true}));
        try {
            const fetchedQuestions = await getQuestionsForLesson(lessonId);
            setQuestionsByLesson(prev => ({...prev, [lessonId]: fetchedQuestions}));
        } catch (err) {
            console.error(`Error fetching questions for lesson ${lessonId}:`, err);
            toast({ variant: "destructive", title: "خطأ", description: `فشل تحميل أسئلة الدرس.`});
            setQuestionsByLesson(prev => ({...prev, [lessonId]: []}));
        } finally {
            setIsLoadingQuestions(prev => ({...prev, [lessonId]: false}));
        }
    }
  }


  const handleContentAddedOrDeleted = (type: 'section' | 'lesson' | 'question', sectionIdParam?: string, lessonIdParam?: string) => {
    if (type === 'section') {
        fetchSubjectContent();
    } else if (type === 'lesson' && sectionIdParam) {
        fetchLessonsForSection(sectionIdParam);
    } else if (type === 'question' && lessonIdParam) {
        handleFetchQuestionsForLesson(lessonIdParam);
    }
  };

  const handleDeleteExistingLesson = async (sectionId: string, lessonId: string, lessonTitle: string) => {
    try {
      await deleteLesson(subjectId, sectionId, lessonId);
      toast({ title: "نجاح", description: `تم حذف الدرس "${lessonTitle}" بنجاح.` });
      const currentLessons = lessonsBySection[sectionId] || [];
      setLessonsBySection(prev => ({ ...prev, [sectionId]: currentLessons.filter(l => l.id !== lessonId) }));
      setQuestionsByLesson(prev => {
        const newState = {...prev};
        delete newState[lessonId];
        return newState;
      });
    } catch (err) {
      console.error("Error deleting lesson:", err);
      toast({ variant: "destructive", title: "خطأ", description: "فشل حذف الدرس." });
    }
  };

  const handleOpenEditLessonDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsEditLessonDialogOpen(true);
  };

  const handleLessonUpdated = () => {
    if (editingLesson && editingLesson.sectionId) {
        fetchLessonsForSection(editingLesson.sectionId);
    }
    setIsEditLessonDialogOpen(false);
    setEditingLesson(null);
  };


  const handleUnlinkQuestionAction = async (questionId: string, lessonId: string) => {
    try {
      await unlinkQuestionFromLesson(questionId);
      toast({ title: "نجاح", description: "تم إلغاء ربط السؤال بالدرس."});
      handleContentAddedOrDeleted('question', undefined, lessonId);
    } catch (error) {
      console.error("Error unlinking question:", error);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إلغاء ربط السؤال." });
    }
  };

  const toggleManageLessons = (sectionIdParam: string) => {
    const newManagingId = managingLessonsForSectionId === sectionIdParam ? null : sectionIdParam;
    setManagingLessonsForSectionId(newManagingId);
    if (newManagingId && (!lessonsBySection[newManagingId] || lessonsBySection[newManagingId].length === 0)) {
      fetchLessonsForSection(newManagingId);
    }
  };

  const handleOpenEditSectionDialog = (section: SubjectSection) => {
    setEditingSection(section);
    editSectionForm.reset({ title: section.title, type: section.type, order: section.order ?? undefined });
  };

  const onEditSectionSubmit = async (values: EditSectionFormValues) => {
    if (!editingSection || !editingSection.id) return;
    setIsSubmittingEditSection(true);
    try {
      await updateSubjectSection(subjectId, editingSection.id, {
        title: values.title,
        type: values.type,
        order: values.order ?? undefined,
      });
      toast({ title: "نجاح", description: `تم تحديث القسم "${values.title}" بنجاح.` });
      setEditingSection(null);
      handleContentAddedOrDeleted('section');
    } catch (error) {
      console.error("Error updating section:", error);
      toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث القسم." });
    } finally {
      setIsSubmittingEditSection(false);
    }
  };

  const handleDeleteExistingSection = async () => {
    if (!deletingSectionId) return;
    const sectionToDelete = sections.find(s => s.id === deletingSectionId);
    if (!sectionToDelete) return;

    try {
      await deleteSubjectSection(subjectId, deletingSectionId);
      toast({ title: "نجاح", description: `تم حذف القسم "${sectionToDelete.title}" وجميع محتوياته بنجاح.` });
      setDeletingSectionId(null);
      fetchSubjectContent();
    } catch (err) {
      console.error("Error deleting section:", err);
      toast({ variant: "destructive", title: "خطأ", description: `فشل حذف القسم "${sectionToDelete.title}".` });
      setDeletingSectionId(null);
    }
  };


  if (isLoadingSections && sections.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 my-4 border rounded-md bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 rtl:mr-2 text-muted-foreground">جاري تحميل الأقسام...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <Info className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getFileIcon = (fileType: string) => {
    if (!fileType) return <Paperclip className="h-4 w-4 text-muted-foreground mr-2 rtl:ml-2 rtl:mr-0" />;
    const lowerType = fileType.toLowerCase();
    if (lowerType.includes('image') || lowerType.includes('jpg') || lowerType.includes('jpeg') || lowerType.includes('png') || lowerType.includes('gif') || lowerType.includes('webp')) return <ImageIcon className="h-4 w-4 text-muted-foreground mr-2 rtl:ml-2 rtl:mr-0" />;
    if (lowerType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500 mr-2 rtl:ml-2 rtl:mr-0" />;
    if (lowerType.includes('doc') || lowerType.includes('word')) return <FileText className="h-4 w-4 text-blue-500 mr-2 rtl:ml-2 rtl:mr-0" />;
    if (lowerType.includes('ppt') || lowerType.includes('powerpoint')) return <FileText className="h-4 w-4 text-orange-500 mr-2 rtl:ml-2 rtl:mr-0" />;
    return <Paperclip className="h-4 w-4 text-muted-foreground mr-2 rtl:ml-2 rtl:mr-0" />;
  };


  return (
    <Card className="mt-6 shadow-md border border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">تفاصيل المادة: {subjectName}</CardTitle>
        <CardDescription>إدارة الأقسام والدروس والمرفقات والأسئلة لهذه المادة.</CardDescription>
      </CardHeader>
      <CardContent>
        <AddSectionForm subjectId={subjectId} onSectionAdded={() => handleContentAddedOrDeleted('section')} />

        {sections.length === 0 && !isLoadingSections ? (
          <p className="text-center text-muted-foreground py-4">لا توجد أقسام مضافة لهذه المادة حتى الآن.</p>
        ) : (
          <div className="space-y-4 mt-4">
            {sections.map((section) => (
                <Card key={section.id} className="bg-card shadow-sm">
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 px-4 gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {section.order !== undefined && section.order !== null && (
                          <Badge variant="outline" className="mr-2 rtl:ml-2 rtl:mr-0 text-xs px-1.5 py-0.5">
                            <SortAsc className="h-3 w-3 mr-0.5 rtl:ml-0.5 rtl:mr-0" />
                            {section.order}
                          </Badge>
                        )}
                        القسم: {section.title}
                      </CardTitle>
                      <CardDescription>
                        النوع: <Badge variant={section.type === 'theory' ? 'secondary' : 'outline'} className="text-xs">
                          {section.type === 'theory' ? 'نظري' : 'عملي'}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <UiDialog open={editingSection?.id === section.id} onOpenChange={(open) => { if (!open) setEditingSection(null); }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditSectionDialog(section)}>
                              <Edit className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0"/> تعديل القسم
                          </Button>
                        </DialogTrigger>
                        {editingSection && editingSection.id === section.id && (
                          <UiDialogContent className="sm:max-w-[425px]" dir="rtl">
                          <UiDialogHeader className="text-right">
                              <UiDialogTitle>تعديل القسم: {editingSection.title}</UiDialogTitle>
                              <UiDialogDescription>
                              قم بتعديل عنوان ونوع وترتيب القسم المحدد. انقر على حفظ عند الانتهاء.
                              </UiDialogDescription>
                          </UiDialogHeader>
                          <Form {...editSectionForm}>
                              <form onSubmit={editSectionForm.handleSubmit(onEditSectionSubmit)} className="space-y-4 py-4">
                              <FormField
                                  control={editSectionForm.control}
                                  name="title"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>عنوان القسم</FormLabel>
                                      <FormControl>
                                      <Input placeholder="مثال: الفصل الأول - مقدمة" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                              <FormField
                                  control={editSectionForm.control}
                                  name="type"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>نوع القسم</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                          <SelectTrigger>
                                          <SelectValue placeholder="اختر نوع القسم" />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          <SelectItem value="theory">نظري</SelectItem>
                                          <SelectItem value="practical">عملي</SelectItem>
                                      </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                              <FormField
                                  control={editSectionForm.control}
                                  name="order"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>ترتيب القسم (اختياري)</FormLabel>
                                      <FormControl>
                                      <Input
                                          type="number"
                                          placeholder="مثال: 1 (للأول)، 2 (للثاني)"
                                          {...field}
                                          value={field.value === null || field.value === undefined ? '' : field.value}
                                          onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                          min="0"
                                      />
                                      </FormControl>
                                      <UiFormDescription>
                                        أدخل رقمًا لتحديد ترتيب عرض هذا القسم ضمن المادة. الأقسام ذات الأرقام الأصغر تظهر أولاً. اتركه فارغًا إذا كان الترتيب غير مهم.
                                      </UiFormDescription>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                              <UiDialogFooter className="flex-row-reverse">
                                  <Button type="submit" disabled={isSubmittingEditSection}>
                                  {isSubmittingEditSection ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                                  حفظ التغييرات
                                  </Button>
                                  <DialogClose asChild>
                                  <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>
                                      إلغاء
                                  </Button>
                                  </DialogClose>
                              </UiDialogFooter>
                              </form>
                          </Form>
                          </UiDialogContent>
                        )}
                      </UiDialog>
                      <AlertDialog>
                          <AlertDialogTriggerComponent asChild>
                            <Button variant="destructive" size="sm" onClick={() => setDeletingSectionId(section.id!)}>
                              <Trash2 className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" /> حذف القسم
                            </Button>
                          </AlertDialogTriggerComponent>
                          <AlertDialogContent>
                            <AlertDialogHeader className="text-right">
                              <AlertDialogTitle>هل أنت متأكد من حذف القسم "{section.title}"؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم حذف هذا القسم وجميع محتوياته بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse">
                              <AlertDialogCancel onClick={() => setDeletingSectionId(null)}>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteExistingSection} className="bg-destructive hover:bg-destructive/90">
                                تأكيد الحذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      <Button onClick={() => toggleManageLessons(section.id!)} size="sm" variant={managingLessonsForSectionId === section.id! ? "secondary" : "outline"}>
                        {managingLessonsForSectionId === section.id ? <ChevronUp className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0"/> : <ChevronDown className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0"/>}
                        إدارة الدروس ({(lessonsBySection[section.id!] || []).length})
                      </Button>
                    </div>
                  </CardHeader>

                  {managingLessonsForSectionId === section.id! && (
                    <CardContent className="pt-0 pb-4 px-4 space-y-3 border-t mt-2 pt-3">
                      <AddLessonForm
                        subjectId={subjectId}
                        sectionId={section.id!}
                        onLessonAdded={() => handleContentAddedOrDeleted('lesson', section.id!)}
                      />
                      {isLoadingLessons[section.id!] ? (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="ml-2 rtl:mr-2 text-sm text-muted-foreground">جاري تحميل دروس هذا القسم...</p>
                        </div>
                      ) : lessonsBySection[section.id!] && lessonsBySection[section.id!].length > 0 ? (
                        <Accordion
                            type="multiple"
                            className="w-full space-y-2"
                            value={activeLessonAccordion}
                            onValueChange={setActiveLessonAccordion}
                          >
                          {(lessonsBySection[section.id!] || []).map(lesson => (
                            <AccordionItem value={lesson.id!} key={lesson.id!} className="border rounded-md bg-background shadow-xs">
                              <AccordionTrigger
                                  className="hover:no-underline py-2.5 px-3 text-md font-medium flex items-center justify-between w-full"
                                  onClick={() => {
                                      if (lesson.id && !activeLessonAccordion.includes(lesson.id)) {
                                          handleFetchQuestionsForLesson(lesson.id);
                                      }
                                  }}
                              >
                                <div className="flex items-center">
                                  {lesson.order !== undefined && lesson.order !== null && (
                                    <Badge variant="outline" className="mr-2 rtl:ml-2 rtl:mr-0 text-xs px-1.5 py-0.5">
                                      <SortAsc className="h-3 w-3 mr-0.5 rtl:ml-0.5 rtl:mr-0" />
                                      {lesson.order}
                                    </Badge>
                                  )}
                                  {lesson.title}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-0 pb-3 px-3 space-y-2 text-sm">
                                  {lesson.teachers && lesson.teachers.length > 0 && (
                                    <div className="mt-1">
                                      <h5 className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center">
                                        <UserCircle className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                                        إسناد المدرسين:
                                      </h5>
                                      <ul className="list-none pl-0 space-y-0.5">
                                        {lesson.teachers.map((teacher: LessonTeacher, idx: number) => (
                                          <li key={idx} className="text-xs text-muted-foreground">
                                            - {teacher.name}
                                            {teacher.youtubeUrl && (
                                              <a href={teacher.youtubeUrl} target="_blank" rel="noopener noreferrer" className="ml-1 rtl:mr-1 text-red-500 hover:text-red-600" title={teacher.youtubeUrl}>
                                                <Youtube className="inline h-3.5 w-3.5"/>
                                              </a>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {lesson.videoUrl && (
                                    <a
                                      href={lesson.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline flex items-center mt-1"
                                    >
                                      <Film className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" /> مشاهدة الفيديو الأساسي <ExternalLink className="h-3 w-3 ml-1 rtl:mr-1 rtl:ml-0"/>
                                    </a>
                                  )}

                                  <LessonContentRenderer content={lesson.content} />

                                  {lesson.files && lesson.files.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-border/50">
                                      <h5 className="font-semibold text-xs text-muted-foreground mb-1.5">مرفقات الدرس:</h5>
                                      <ul className="space-y-1.5">
                                        {lesson.files.map((file, i) => (
                                          <li key={i} className="flex items-start text-xs mb-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                            {(() => {
                                                const lowerCaseType = file.type?.toLowerCase() || '';
                                                const isImage = ['image', 'jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => lowerCaseType.includes(ext));
                                                let isAllowedHostForNextImage = false;
                                                if (isImage && file.url) {
                                                    try {
                                                        const url = new URL(file.url);
                                                        const allowedHostnames = ['placehold.co', 'firebasestorage.googleapis.com', 'th.bing.com'];
                                                        if (allowedHostnames.includes(url.hostname)) {
                                                            isAllowedHostForNextImage = true;
                                                        }
                                                    } catch (e) { /* Invalid URL, won't use NextImage */ }
                                                }

                                                if (isImage && file.url) {
                                                    return (
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 sm:w-20 sm:h-20 relative mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0 group border rounded-md overflow-hidden bg-muted">
                                                            {isAllowedHostForNextImage ? (
                                                                <NextImage
                                                                    src={file.url}
                                                                    alt={file.name}
                                                                    layout="fill"
                                                                    objectFit="cover"
                                                                    className="group-hover:opacity-80 transition-opacity"
                                                                    data-ai-hint="lesson material"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={file.url}
                                                                    alt={file.name}
                                                                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                                                    data-ai-hint="lesson material"
                                                                />
                                                            )}
                                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-opacity">
                                                                <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </a>
                                                    );
                                                }
                                                return getFileIcon(file.type);
                                            })()}
                                            <div className="ml-2 rtl:mr-2 flex-grow min-w-0">
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline hover:text-primary/80 break-all" title={file.name}>
                                                    {file.name}
                                                </a>
                                                <span className="block text-muted-foreground text-xs"> النوع: {file.type}</span>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {lesson.linkedExamIds && lesson.linkedExamIds.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-border/50">
                                      <h5 className="font-semibold text-xs text-muted-foreground mb-0.5 flex items-center">
                                        <CheckSquare className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0 text-green-600" />
                                        الامتحانات المرتبطة:
                                      </h5>
                                      <ul className="list-disc list-inside pl-4 text-xs">
                                        {lesson.linkedExamIds.map(examId => {
                                          const exam = allExams.find(e => e.id === examId);
                                          return exam ? (
                                            <li key={examId}>
                                              <Link href={`/dashboard/exams/edit/${exam.id}`} className="text-primary hover:underline">
                                                {exam.title || 'امتحان غير معروف'}
                                              </Link>
                                            </li>
                                          ) : (
                                            <li key={examId} className="text-muted-foreground">امتحان محذوف أو غير موجود (ID: {examId})</li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}


                                  {lesson.notes && (
                                     <div className="mt-3 pt-2 border-t border-border/50">
                                      <h5 className="font-semibold text-xs text-muted-foreground mb-0.5 flex items-center">
                                        <Info className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                                        ملاحظات:
                                      </h5>
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{lesson.notes}</p>
                                    </div>
                                  )}


                                  <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-border/50">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditLessonDialog(lesson)}>
                                      <Edit className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" /> تعديل الدرس
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTriggerComponent asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" /> حذف الدرس
                                        </Button>
                                        </AlertDialogTriggerComponent>
                                        <AlertDialogContent>
                                        <AlertDialogHeader className="text-right">
                                            <AlertDialogTitle>هل أنت متأكد من حذف الدرس "{lesson.title}"؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                            سيتم حذف هذا الدرس بشكل دائم. الأسئلة المرتبطة به في بنك الأسئلة لن تتأثر.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-row-reverse">
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction
                                            onClick={() => handleDeleteExistingLesson(section.id!, lesson.id!, lesson.title)}
                                            className="bg-destructive hover:bg-destructive/90"
                                            >
                                            تأكيد الحذف
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                  </div>

                                  <div className="mt-4 pt-3 border-t border-dashed">
                                    <h4 className="font-semibold text-sm mb-2 text-foreground/80 flex items-center">
                                      <ListChecks className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                      أسئلة الدرس (من بنك الأسئلة):
                                    </h4>
                                    <AddLessonQuestionForm
                                      subjectId={subjectId}
                                      lessonId={lesson.id!}
                                      onQuestionAdded={() => handleContentAddedOrDeleted('question', section.id!, lesson.id!)}
                                    />
                                    {isLoadingQuestions[lesson.id!] ? (
                                      <div className="flex items-center justify-center py-2"><Loader2 className="h-4 w-4 animate-spin"/> <span className="text-xs ml-2 rtl:mr-2">جاري تحميل أسئلة الدرس...</span></div>
                                    ) : questionsByLesson[lesson.id!] && questionsByLesson[lesson.id!]!.length > 0 ? (
                                      <div className="mt-2 space-y-1">
                                        {questionsByLesson[lesson.id!]!.map((q, idx) => (
                                          <Card key={q.id!} className="p-2 bg-muted/40 shadow-xs">
                                            <p className="text-xs font-medium truncate">{idx + 1}. {q.questionText}</p>
                                            <p className="text-xs text-muted-foreground">المادة: {q.subject || 'غير محدد'} | الصعوبة: {q.difficulty || 'غير محدد'}</p>
                                            <div className="flex justify-end gap-1 mt-1">
                                                <Button variant="outline" size="xs" asChild>
                                                  <Link href={`/dashboard/questions/edit/${q.id}`}>
                                                    <Edit className="h-3 w-3 mr-1" /> تعديل
                                                  </Link>
                                                </Button>
                                                <AlertDialog>
                                                  <AlertDialogTriggerComponent asChild>
                                                    <Button variant="destructive" size="xs">
                                                      <Link2Off className="h-3 w-3 mr-1" />
                                                      إلغاء الربط
                                                    </Button>
                                                  </AlertDialogTriggerComponent>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader className="text-right">
                                                      <AlertDialogTitle>هل أنت متأكد من إلغاء ربط هذا السؤال؟</AlertDialogTitle>
                                                      <AlertDialogDescription>لن يتم حذف السؤال من البنك الرئيسي، فقط سيتم إلغاء ربطه بهذا الدرس.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="flex-row-reverse">
                                                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => handleUnlinkQuestionAction(q.id!, lesson.id!)} className="bg-destructive hover:bg-destructive/90">إلغاء الربط</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                          </Card>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-center text-muted-foreground py-2">لا توجد أسئلة مرتبطة بهذا الدرس حاليًا.</p>
                                    )}
                                  </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <p className="text-sm text-center text-muted-foreground py-3">لا توجد دروس مضافة لهذا القسم.</p>
                      )}
                    </CardContent>
                  )}
                </Card>
            ))}
          </div>
        )}

        {editingLesson && editingLesson.sectionId && (
          <EditLessonForm
            subjectId={subjectId}
            sectionId={editingLesson.sectionId}
            lessonToEdit={editingLesson}
            isOpen={isEditLessonDialogOpen}
            onOpenChange={setIsEditLessonDialogOpen}
            onLessonUpdated={handleLessonUpdated}
          />
        )}

      </CardContent>
    </Card>
  );
}
