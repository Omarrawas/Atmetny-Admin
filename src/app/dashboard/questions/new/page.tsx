
// src/app/dashboard/questions/new/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addQuestion, getSubjects, getTags, addTag as createTagInDb, getSubjectSections, getLessonsInSection } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Sparkles, AlertTriangle, CheckCircle2, BookCopy, TagsIcon, HelpCircle, BookText, Book, Search, Image as ImageIcon } from 'lucide-react';
import type { Question, Option, Subject, Tag, QuestionType, MCQQuestion, TrueFalseQuestion, FillInTheBlanksQuestion, ShortAnswerQuestion, SubjectSection, Lesson, ArabicQuestionSanityCheckOutput } from '@/types';
import { arabicQuestionSanityCheck } from '@/ai/flows/arabic-question-sanity-check';
import { suggestQuestionTags } from '@/ai/flows/suggest-question-tags-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const optionSchema = z.object({
  text: z.string().min(1, "نص الخيار لا يمكن أن يكون فارغًا."),
});

const correctAnswerSchema = z.object({
  text: z.string().min(1, "نص الإجابة لا يمكن أن يكون فارغًا."),
});

const baseQuestionSchema = z.object({
  subjectId: z.string({ required_error: "الرجاء اختيار المادة." }).min(1, "المادة لا يمكن أن تكون فارغة."),
  sectionId: z.string().optional().nullable(),
  lessonId: z.string().optional().nullable(),
  questionText: z.string().min(10, "نص السؤال يجب أن يكون 10 أحرف على الأقل."),
  imageUrl: z.string().url({ message: "الرجاء إدخال رابط URL صحيح." }).optional().or(z.literal('')),
  imageHint: z.string().max(50, "تلميح الصورة لا يمكن أن يتجاوز 50 حرفًا.").optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'], { required_error: "الرجاء اختيار مستوى الصعوبة." }),
  tagIds: z.array(z.string()).optional().default([]),
});

const mcqQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('mcq'),
  options: z.array(optionSchema).min(2, "يجب أن يكون هناك خياران على الأقل.").max(6, "لا يمكن أن يكون هناك أكثر من 6 خيارات."),
  correctOptionIndex: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >=0 , { message: "الرجاء اختيار إجابة صحيحة."}),
});

const trueFalseQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('true_false'),
  correctBooleanAnswer: z.enum(['true', 'false'], { required_error: "الرجاء تحديد إذا كانت الإجابة صحيحة أم خاطئة."}),
});

const fillInTheBlanksQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('fill_in_the_blanks'),
  correctAnswers: z.array(correctAnswerSchema).min(1, "يجب أن يكون هناك إجابة واحدة صحيحة على الأقل للفراغات."),
});

const shortAnswerQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('short_answer'),
  modelAnswer: z.string().optional(),
});

const questionSchema = z.discriminatedUnion("questionType", [
  mcqQuestionSchema,
  trueFalseQuestionSchema,
  fillInTheBlanksQuestionSchema,
  shortAnswerQuestionSchema,
]);

type QuestionFormValues = z.infer<typeof questionSchema>;

export default function NewQuestionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiCheckResult, setAiCheckResult] = useState<ArabicQuestionSanityCheckOutput | null>(null);
  
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(true);
  const [availableSections, setAvailableSections] = useState<SubjectSection[]>([]);
  const [isFetchingSections, setIsFetchingSections] = useState(false);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [isFetchingLessons, setIsFetchingLessons] = useState(false);
  
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isFetchingTags, setIsFetchingTags] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      subjectId: undefined,
      sectionId: undefined,
      lessonId: undefined,
      questionText: '',
      imageUrl: '',
      imageHint: '',
      difficulty: undefined,
      tagIds: [],
      questionType: 'mcq',
      options: [{ text: '' }, { text: '' }],
      correctOptionIndex: undefined,
      correctAnswers: [{ text: '' }],
      modelAnswer: '',
    },
  });

  const watchedQuestionType = form.watch("questionType");
  const watchedSubjectId = form.watch("subjectId");
  const watchedSectionId = form.watch("sectionId");

  useEffect(() => {
    if (watchedQuestionType === 'mcq') {
      form.setValue('options', form.getValues('options')?.length >= 2 ? form.getValues('options') : [{ text: '' }, { text: '' }]);
      // @ts-ignore
      form.setValue('correctBooleanAnswer', undefined);
      form.setValue('correctAnswers', undefined);
      form.setValue('modelAnswer', undefined);
    } else if (watchedQuestionType === 'true_false') {
      // @ts-ignore
      form.setValue('options', undefined);
      // @ts-ignore
      form.setValue('correctOptionIndex', undefined);
      // @ts-ignore
      form.setValue('correctBooleanAnswer', undefined);
      form.setValue('correctAnswers', undefined);
      form.setValue('modelAnswer', undefined);
    } else if (watchedQuestionType === 'fill_in_the_blanks') {
      form.setValue('correctAnswers', form.getValues('correctAnswers')?.length >= 1 ? form.getValues('correctAnswers') : [{ text: '' }]);
      // @ts-ignore
      form.setValue('options', undefined);
      // @ts-ignore
      form.setValue('correctOptionIndex', undefined);
      // @ts-ignore
      form.setValue('correctBooleanAnswer', undefined);
      form.setValue('modelAnswer', undefined);
    } else if (watchedQuestionType === 'short_answer') {
      form.setValue('modelAnswer', form.getValues('modelAnswer') || '');
      // @ts-ignore
      form.setValue('options', undefined);
      // @ts-ignore
      form.setValue('correctOptionIndex', undefined);
      // @ts-ignore
      form.setValue('correctBooleanAnswer', undefined);
      form.setValue('correctAnswers', undefined);
    }
  }, [watchedQuestionType, form]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsFetchingSubjects(true);
      setIsFetchingTags(true);
      try {
        const subjects = await getSubjects();
        setAvailableSubjects(subjects);
      } catch (error) {
        console.error("Error fetching subjects:", error);
        toast({ variant: "destructive", title: "خطأ في جلب المواد" });
      } finally {
        setIsFetchingSubjects(false);
      }
      try {
        const tags = await getTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error("Error fetching tags:", error);
        toast({ variant: "destructive", title: "خطأ في جلب التصنيفات" });
      } finally {
        setIsFetchingTags(false);
      }
    };
    fetchInitialData();
  }, [toast]);

  useEffect(() => {
    const fetchSections = async () => {
      if (watchedSubjectId) {
        setIsFetchingSections(true);
        setAvailableLessons([]); 
        form.setValue('sectionId', undefined);
        form.setValue('lessonId', undefined); 
        try {
          const sections = await getSubjectSections(watchedSubjectId);
          setAvailableSections(sections);
        } catch (error) {
          console.error("Error fetching sections:", error);
          toast({ variant: "destructive", title: "خطأ في جلب الأقسام" });
          setAvailableSections([]);
        } finally {
          setIsFetchingSections(false);
        }
      } else {
        setAvailableSections([]);
        setAvailableLessons([]);
        form.setValue('sectionId', undefined);
        form.setValue('lessonId', undefined);
      }
    };
    fetchSections();
  }, [watchedSubjectId, form, toast]);

  useEffect(() => {
    const fetchLessons = async () => {
      if (watchedSubjectId && watchedSectionId) {
        setIsFetchingLessons(true);
        form.setValue('lessonId', undefined); 
        try {
          const lessons = await getLessonsInSection(watchedSubjectId, watchedSectionId);
          setAvailableLessons(lessons);
        } catch (error) {
          console.error("Error fetching lessons:", error);
          toast({ variant: "destructive", title: "خطأ في جلب الدروس" });
          setAvailableLessons([]);
        } finally {
          setIsFetchingLessons(false);
        }
      } else {
        setAvailableLessons([]);
        form.setValue('lessonId', undefined); 
      }
    };
    fetchLessons();
  }, [watchedSubjectId, watchedSectionId, form, toast]);

  const { fields: mcqOptionFields, append: appendMcqOption, remove: removeMcqOption } = useFieldArray({
    control: form.control,
    name: "options", 
  });
  
  const { fields: fillBlankAnswerFields, append: appendFillBlankAnswer, remove: removeFillBlankAnswer } = useFieldArray({
    control: form.control,
    name: "correctAnswers",
  });

  const handleAiCheck = async () => {
    const questionText = form.getValues("questionText");
    if (!questionText.trim()) {
      toast({
        variant: "destructive",
        title: "نص السؤال فارغ",
        description: "الرجاء إدخال نص السؤال أولاً قبل إجراء الفحص.",
      });
      return;
    }
    setIsAiChecking(true);
    setAiCheckResult(null); // Reset previous result
    try {
      const result = await arabicQuestionSanityCheck({ question: questionText });
      setAiCheckResult(result);
      toast({
        title: "فحص سلامة اللغة العربية",
        description: result.isSane ? "السؤال يبدو سليمًا لغويًا." : "تم العثور على ملاحظات على السؤال.",
      });
    } catch (error) {
      console.error("AI Sanity Check Error:", error);
      toast({
        variant: "destructive",
        title: "فشل فحص AI",
        description: "لم نتمكن من إجراء فحص سلامة اللغة للسؤال.",
      });
    } finally {
      setIsAiChecking(false);
    }
  };

  const handleAiSuggestTags = async () => {
    const questionText = form.getValues("questionText");
    if (!questionText.trim()) {
      toast({ variant: "destructive", title: "نص السؤال فارغ", description: "الرجاء إدخال نص السؤال أولاً لاقتراح التصنيفات." });
      return;
    }
    setIsSuggestingTags(true);
    try {
      const result = await suggestQuestionTags({ questionText });
      let newTagsCreatedCount = 0;
      let existingTagsSelectedCount = 0;
      const currentSelectedTagIds = form.getValues("tagIds") || [];
      const updatedTagIds = new Set<string>(currentSelectedTagIds);
      for (const suggestedTagName of result.suggestedTags) {
        const normalizedSuggestedName = suggestedTagName.trim().toLowerCase();
        let existingTag = availableTags.find(tag => tag.name.toLowerCase() === normalizedSuggestedName);
        if (existingTag && existingTag.id) {
          if (!updatedTagIds.has(existingTag.id)) {
            updatedTagIds.add(existingTag.id);
            existingTagsSelectedCount++;
          }
        } else {
          const newTagId = await createTagInDb({ name: suggestedTagName.trim() });
          const newTag: Tag = { id: newTagId, name: suggestedTagName.trim(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          setAvailableTags(prev => [...prev, newTag]);
          updatedTagIds.add(newTagId);
          newTagsCreatedCount++;
        }
      }
      form.setValue("tagIds", Array.from(updatedTagIds));
      let toastMessage = "تم تطبيق التصنيفات المقترحة.";
      if (newTagsCreatedCount > 0) toastMessage += ` ${newTagsCreatedCount} تصنيف جديد تم إنشاؤه.`;
      if (existingTagsSelectedCount > 0) toastMessage += ` ${existingTagsSelectedCount} تصنيف موجود تم تحديده.`;
      toast({ title: "اقتراح التصنيفات", description: toastMessage });
    } catch (error) {
      console.error("AI Tag Suggestion Error:", error);
      toast({ variant: "destructive", title: "فشل اقتراح التصنيفات", description: "لم نتمكن من اقتراح تصنيفات. يرجى المحاولة مرة أخرى." });
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleAddNewTag = async () => {
    const trimmedNewTagName = newTagName.trim();
    if (!trimmedNewTagName) {
      toast({ variant: 'destructive', title: 'اسم التصنيف فارغ', description: 'الرجاء إدخال اسم للتصنيف الجديد.' });
      return;
    }
    if (availableTags.some(tag => tag.name.toLowerCase() === trimmedNewTagName.toLowerCase())) {
      toast({ variant: 'destructive', title: 'تصنيف مكرر', description: 'يوجد تصنيف بهذا الاسم بالفعل.' });
      return;
    }
    setIsAddingNewTag(true);
    try {
      const newTagId = await createTagInDb({ name: trimmedNewTagName });
      const newTagObject: Tag = { id: newTagId, name: trimmedNewTagName, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setAvailableTags(prev => [...prev, newTagObject]);
      const currentSelectedTagIds = form.getValues("tagIds") || [];
      form.setValue("tagIds", [...currentSelectedTagIds, newTagId]);
      setNewTagName('');
      toast({ title: "تم إضافة التصنيف", description: `تم إضافة التصنيف "${trimmedNewTagName}" واختياره.` });
    } catch (error) {
      console.error("Error adding new tag:", error);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إضافة التصنيف الجديد." });
    } finally {
      setIsAddingNewTag(false);
    }
  };

  const filteredAvailableTags = useMemo(() => {
    if (!tagSearchTerm.trim()) {
      return availableTags;
    }
    return availableTags.filter(tag =>
      tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
    );
  }, [availableTags, tagSearchTerm]);

  const onSubmit = async (data: QuestionFormValues) => {
    setIsLoading(true);
    try {
      const selectedSubject = availableSubjects.find(s => s.id === data.subjectId);
      if (!selectedSubject) {
        toast({ variant: "destructive", title: "Error", description: "Selected subject not found." });
        setIsLoading(false);
        return;
      }
      let questionPayload: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>;
      if (data.questionType === 'mcq') {
        const mcqData = data as Extract<QuestionFormValues, { questionType: 'mcq' }>;
        const optionsWithIds: Option[] = mcqData.options.map((opt, index) => ({ id: `option-${index + 1}-${Date.now()}`, text: opt.text }));
        const correctOptionId = optionsWithIds[parseInt(mcqData.correctOptionIndex)].id;
        questionPayload = {
          questionType: 'mcq', questionText: data.questionText, imageUrl: data.imageUrl || null, imageHint: data.imageHint || null, options: optionsWithIds, correctOptionId: correctOptionId,
          difficulty: data.difficulty, subjectId: selectedSubject.id, subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : null, 
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : null,
          tagIds: data.tagIds || [], lessonId: data.lessonId || null,
        };
      } else if (data.questionType === 'true_false') {
        const tfData = data as Extract<QuestionFormValues, { questionType: 'true_false' }>;
        questionPayload = {
          questionType: 'true_false', questionText: data.questionText, imageUrl: data.imageUrl || null, imageHint: data.imageHint || null, options: [ { id: 'true', text: 'صحيح' }, { id: 'false', text: 'خطأ' } ],
          correctOptionId: tfData.correctBooleanAnswer, difficulty: data.difficulty, subjectId: selectedSubject.id, subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : null, 
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : null,
          tagIds: data.tagIds || [], lessonId: data.lessonId || null,
        };
      } else if (data.questionType === 'fill_in_the_blanks') {
        const fitbData = data as Extract<QuestionFormValues, { questionType: 'fill_in_the_blanks' }>;
        questionPayload = {
          questionType: 'fill_in_the_blanks', questionText: data.questionText, imageUrl: data.imageUrl || null, imageHint: data.imageHint || null, correctAnswers: fitbData.correctAnswers.map(ans => ans.text),
          difficulty: data.difficulty, subjectId: selectedSubject.id, subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : null, 
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : null,
          tagIds: data.tagIds || [], lessonId: data.lessonId || null,
        };
      } else { 
         const saData = data as Extract<QuestionFormValues, { questionType: 'short_answer' }>;
         questionPayload = {
          questionType: 'short_answer', questionText: data.questionText, imageUrl: data.imageUrl || null, imageHint: data.imageHint || null, modelAnswer: saData.modelAnswer || undefined,
          difficulty: data.difficulty, subjectId: selectedSubject.id, subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : null, 
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : null,
          tagIds: data.tagIds || [], lessonId: data.lessonId || null,
        };
      }
      await addQuestion(questionPayload);
      toast({ title: "Success!", description: "New question added successfully." });
      router.push('/dashboard/questions');
    } catch (error) {
      console.error("Error adding question:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to add new question." });
    } finally {
      setIsLoading(false);
    }
  };

  const allDataFetched = !isFetchingSubjects && !isFetchingTags;

  return (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <PlusCircle className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">إضافة سؤال جديد</CardTitle>
        </div>
        <CardDescription>املأ تفاصيل السؤال الجديد.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المادة</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('sectionId', undefined);
                      form.setValue('lessonId', undefined);
                    }}
                    value={field.value}
                    disabled={isLoading || isFetchingSubjects || availableSubjects.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المادة للسؤال" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isFetchingSubjects ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 rtl:mr-2">جاري تحميل المواد...</span>
                        </div>
                      ) : availableSubjects.length === 0 ? (
                         <div className="p-4 text-center text-muted-foreground">
                            لا توجد مواد مضافة. يرجى <a href="/dashboard/subjects" className="text-primary hover:underline">إضافة مادة</a> أولاً.
                         </div>
                      ) : (
                        availableSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id!}>
                            {subject.name} ({subject.branch})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Book className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-muted-foreground"/> القسم (اختياري)</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('lessonId', undefined); 
                    }}
                    value={field.value || ''}
                    disabled={isLoading || isFetchingSections || !watchedSubjectId || availableSections.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القسم (إذا كانت المادة تحتوي أقسامًا)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isFetchingSections ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 rtl:mr-2">جاري تحميل الأقسام...</span>
                        </div>
                      ) : availableSections.length === 0 && watchedSubjectId ? (
                         <div className="p-4 text-center text-muted-foreground">لا توجد أقسام لهذه المادة.</div>
                      ) : !watchedSubjectId ? (
                        <div className="p-4 text-center text-muted-foreground">الرجاء اختيار المادة أولاً.</div>
                      ) : (
                        availableSections.map((section) => (
                          <SelectItem key={section.id} value={section.id!}>
                            {section.title} ({section.type === 'theory' ? 'نظري' : 'عملي'})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>يمكنك ربط السؤال بقسم معين من المادة.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lessonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><BookText className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-muted-foreground"/> الدرس (اختياري)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading || isFetchingLessons || !watchedSectionId || availableLessons.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الدرس (إذا كان القسم يحتوي دروسًا)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isFetchingLessons ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 rtl:mr-2">جاري تحميل الدروس...</span>
                        </div>
                      ) : availableLessons.length === 0 && watchedSectionId ? (
                         <div className="p-4 text-center text-muted-foreground">لا توجد دروس لهذا القسم.</div>
                      ) : !watchedSectionId ? (
                         <div className="p-4 text-center text-muted-foreground">الرجاء اختيار القسم أولاً.</div>
                      ): (
                        availableLessons.map((lesson) => (
                          <SelectItem key={lesson.id} value={lesson.id!}>
                            {lesson.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>يمكنك ربط السؤال بدرس معين داخل القسم.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="questionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع السؤال</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع السؤال" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mcq">اختيار من متعدد</SelectItem>
                      <SelectItem value="true_false">صح/خطأ</SelectItem>
                      <SelectItem value="fill_in_the_blanks">املأ الفراغات</SelectItem>
                      <SelectItem value="short_answer">سؤال مقالي قصير</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نص السؤال (عربي)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={
                        watchedQuestionType === 'fill_in_the_blanks' 
                        ? "اكتب نص السؤال هنا، واستخدم ____ للإشارة إلى الفراغات."
                        : "اكتب نص السؤال هنا..."
                      } 
                      {...field} 
                      rows={4} 
                    />
                  </FormControl>
                  <FormDescription>هذا هو النص الأساسي للسؤال.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/>
                        رابط صورة السؤال (اختياري)
                    </FormLabel>
                    <FormControl>
                        <Input type="url" placeholder="https://example.com/question-image.png" {...field} value={field.value ?? ''}/>
                    </FormControl>
                    <FormDescription>
                        أضف رابطًا لصورة إذا كان السؤال يتطلب ذلك (مثل مخطط أو رسم بياني).
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="imageHint"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>تلميح الصورة (اختياري)</FormLabel>
                    <FormControl>
                        <Input placeholder="مثال: 'رسم بياني كيميائي' أو 'معادلة رياضية'" {...field} value={field.value ?? ''}/>
                    </FormControl>
                    <FormDescription>
                        كلمة أو كلمتين لوصف الصورة. ستُستخدم كـ `data-ai-hint`.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="space-x-2 rtl:space-x-reverse flex items-center">
                <Button type="button" variant="outline" onClick={handleAiCheck} disabled={isAiChecking || isLoading || isSuggestingTags}>
                {isAiChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                فحص سلامة اللغة العربية
                </Button>
                 <Button type="button" variant="outline" onClick={handleAiSuggestTags} disabled={isSuggestingTags || isLoading || isAiChecking}>
                    {isSuggestingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    اقترح تصنيفات بالذكاء الاصطناعي
                </Button>
            </div>

            {aiCheckResult && (
              <Alert variant={aiCheckResult.isSane ? "default" : "destructive"} className="mt-4">
                {aiCheckResult.isSane ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertTitle>{aiCheckResult.isSane ? "فحص AI: يبدو جيدًا!" : "فحص AI: تم العثور على مشاكل محتملة"}</AlertTitle>
                <AlertDescription>{aiCheckResult.explanation}</AlertDescription>
              </Alert>
            )}

            {watchedQuestionType === 'mcq' && (
              <>
                <div>
                  <Label>الخيارات</Label>
                  <div className="space-y-4 mt-2">
                    {mcqOptionFields.map((item, index) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name={`options.${index}.text`}
                        render={({ field: optionField }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input placeholder={`الخيار ${index + 1}`} {...optionField} />
                              </FormControl>
                              {mcqOptionFields.length > 2 && (
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeMcqOption(index)} disabled={isLoading}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  {mcqOptionFields.length < 6 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => appendMcqOption({ text: '' })} className="mt-2" disabled={isLoading}>
                      <PlusCircle className="mr-2 h-4 w-4" /> أضف خيار
                    </Button>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="correctOptionIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الإجابة الصحيحة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الإجابة الصحيحة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(form.getValues("options") || []).map((option, index) => (
                            <SelectItem key={index} value={index.toString()} disabled={!option.text?.trim()}>
                              الخيار {index + 1}: {option.text?.length > 30 ? option.text.substring(0,30) + '...' : option.text}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {watchedQuestionType === 'true_false' && (
              <FormField
                control={form.control}
                name="correctBooleanAnswer"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>الإجابة الصحيحة</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1" disabled={isLoading}>
                        <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                          <FormControl><RadioGroupItem value="true" /></FormControl>
                          <FormLabel className="font-normal">صحيح</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                          <FormControl><RadioGroupItem value="false" /></FormControl>
                          <FormLabel className="font-normal">خطأ</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {watchedQuestionType === 'fill_in_the_blanks' && (
               <div>
                <Label>الإجابات الصحيحة للفراغات</Label>
                <FormDescription className="text-xs mb-2">أضف إجابة لكل فراغ (____) في نص السؤال.</FormDescription>
                <div className="space-y-4 mt-2">
                  {fillBlankAnswerFields.map((item, index) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name={`correctAnswers.${index}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl><Input placeholder={`إجابة الفراغ ${index + 1}`} {...field} /></FormControl>
                            {fillBlankAnswerFields.length > 1 && (
                              <Button type="button" variant="destructive" size="icon" onClick={() => removeFillBlankAnswer(index)} disabled={isLoading}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => appendFillBlankAnswer({ text: '' })} className="mt-2" disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" /> إضافة إجابة فراغ أخرى
                </Button>
              </div>
            )}

            {watchedQuestionType === 'short_answer' && (
              <FormField
                control={form.control}
                name="modelAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الإجابة النموذجية (اختياري)</FormLabel>
                    <FormControl><Textarea placeholder="اكتب الإجابة النموذجية هنا كمرجع..." {...field} rows={3} /></FormControl>
                    <FormDescription>هذه الإجابة للمراجعة ولن يتم استخدامها للتصحيح التلقائي.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مستوى الصعوبة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر مستوى الصعوبة" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="easy">سهل</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="hard">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tagIds"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base flex items-center">
                      <TagsIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
                      التصنيفات (اختياري)
                    </FormLabel>
                    <FormDescription>اختر التصنيفات ذات الصلة بهذا السؤال.</FormDescription>
                  </div>

                  <div className="space-y-3 my-4">
                    <div className="flex items-end gap-2">
                      <div className="flex-grow">
                        <Label htmlFor="new-tag-name-main-q" className="text-sm sr-only">إضافة تصنيف جديد</Label>
                        <Input
                          id="new-tag-name-main-q"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="أو أضف تصنيفًا جديدًا هنا..."
                          className="text-sm h-9"
                          disabled={isAddingNewTag}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddNewTag}
                        disabled={isAddingNewTag || !newTagName.trim()}
                        className="h-9"
                      >
                        {isAddingNewTag ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-1 h-4 w-4" />}
                        إضافة
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="ابحث عن تصنيف..."
                        value={tagSearchTerm}
                        onChange={(e) => setTagSearchTerm(e.target.value)}
                        className="text-sm h-9 pl-10 rtl:pr-10"
                      />
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:right-3 rtl:left-auto" />
                    </div>
                  </div>
                  
                  {isFetchingTags ? (
                    <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 rtl:mr-2">جاري تحميل التصنيفات...</span>
                    </div>
                  ) : filteredAvailableTags.length === 0 && !tagSearchTerm ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد تصنيفات متاحة. أضف تصنيفًا جديدًا أعلاه أو من <a href="/dashboard/tags" className="text-primary hover:underline">صفحة التصنيفات</a>.
                    </p>
                  ) : filteredAvailableTags.length === 0 && tagSearchTerm ? (
                     <p className="text-sm text-muted-foreground text-center py-2">لا توجد تصنيفات تطابق بحثك.</p>
                  ) : (
                    <ScrollArea className="h-40 rounded-md border p-3">
                      <div className="space-y-2">
                        {filteredAvailableTags.map((tag) => (
                          <FormField
                            key={tag.id}
                            control={form.control}
                            name="tagIds"
                            render={({ field }) => {
                              return (
                                <FormItem key={tag.id} className="flex flex-row items-center space-x-2 space-y-0 rtl:space-x-reverse">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(tag.id!)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), tag.id!])
                                          : field.onChange((field.value || []).filter((value) => value !== tag.id));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm cursor-pointer">{tag.name}</FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>إلغاء</Button>
                <Button type="submit" disabled={isLoading || isAiChecking || !allDataFetched || availableSubjects.length === 0 || isSuggestingTags || isAddingNewTag}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  إضافة السؤال
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

