// src/app/dashboard/questions/edit/[id]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
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
import { getQuestionById, updateQuestion, getSubjects, getTags, addTag as createTagInDb } from '@/lib/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Sparkles, AlertTriangle, CheckCircle2, BookCopy, SaveIcon, TagsIcon } from 'lucide-react';
import type { Question, Option, Subject, Tag, QuestionType, MCQQuestion, TrueFalseQuestion, FillInTheBlanksQuestion, ShortAnswerQuestion } from '@/types';
import { arabicQuestionSanityCheck, ArabicQuestionSanityCheckOutput } from '@/ai/flows/arabic-question-sanity-check';
import { suggestQuestionTags } from '@/ai/flows/suggest-question-tags-flow'; // Import the new flow
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const optionSchema = z.object({
  text: z.string().min(1, "Option text cannot be empty."),
});

const correctAnswerSchema = z.object({
  text: z.string().min(1, "Correct answer text cannot be empty."),
});

// Base schema for common fields
const baseQuestionSchema = z.object({
  subjectId: z.string({ required_error: "Please select a subject." }).min(1, "Subject cannot be empty."),
  questionText: z.string().min(10, "Question text must be at least 10 characters."),
  difficulty: z.enum(['easy', 'medium', 'hard'], { required_error: "Please select a difficulty." }),
  tagIds: z.array(z.string()).optional().default([]),
});

// Schema for Multiple Choice Questions (MCQ)
const mcqQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('mcq'),
  options: z.array(optionSchema).min(2, "Must have at least two options.").max(6, "Cannot have more than 6 options."),
  correctOptionIndex: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >=0 , { message: "Please select a correct answer."}),
});

// Schema for True/False Questions
const trueFalseQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('true_false'),
  correctBooleanAnswer: z.enum(['true', 'false'], { required_error: "Please select True or False as the correct answer."}),
});

// Schema for Fill in the Blanks Questions
const fillInTheBlanksQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('fill_in_the_blanks'),
  correctAnswers: z.array(correctAnswerSchema).min(1, "Must have at least one correct answer for the blanks."),
});

// Schema for Short Answer Questions
const shortAnswerQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('short_answer'),
  modelAnswer: z.string().optional(),
});


// Discriminated union schema
const questionSchema = z.discriminatedUnion("questionType", [
  mcqQuestionSchema,
  trueFalseQuestionSchema,
  fillInTheBlanksQuestionSchema,
  shortAnswerQuestionSchema,
]);

type QuestionFormValues = z.infer<typeof questionSchema>;

export default function EditQuestionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(true);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(true);
  const [isFetchingTags, setIsFetchingTags] = useState(true);
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiCheckResult, setAiCheckResult] = useState<ArabicQuestionSanityCheckOutput | null>(null);
  const [initialQuestionData, setInitialQuestionData] = useState<Question | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    // Default values will be set in useEffect after fetching data
  });

  const watchedQuestionType = form.watch("questionType");

  useEffect(() => {
    // Reset specific fields when questionType changes to ensure clean state
    if (watchedQuestionType === 'mcq') {
      if (!form.getValues('options') || form.getValues('options')?.length < 2) {
        form.setValue('options', [{ text: '' }, { text: '' }]);
      }
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
       if (!form.getValues('correctAnswers') || form.getValues('correctAnswers')?.length < 1) {
        form.setValue('correctAnswers', [{ text: '' }]);
      }
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

  const { fields: mcqOptionFields, append: appendMcqOption, remove: removeMcqOption, replace: replaceMcqOptions } = useFieldArray({
    control: form.control,
     // @ts-ignore
    name: "options",
  });

  const { fields: fillBlankAnswerFields, append: appendFillBlankAnswer, remove: removeFillBlankAnswer, replace: replaceFillBlankAnswers } = useFieldArray({
    control: form.control,
    // @ts-ignore
    name: "correctAnswers",
  });


  useEffect(() => {
    const questionIdFromParams = params?.id as string;
    if (!questionIdFromParams) {
        toast({ variant: "destructive", title: "Error", description: "Question ID is missing." });
        router.push('/dashboard/questions');
        return;
    }

    const fetchPageData = async () => {
      let fetchedQuestionData: Question | null = null;
      let fetchedSubjects: Subject[] = [];
      let fetchedTags: Tag[] = [];

      setIsFetchingQuestion(true);
      setIsFetchingSubjects(true);
      setIsFetchingTags(true);

      try {
        fetchedQuestionData = await getQuestionById(questionIdFromParams);
        if (!fetchedQuestionData) {
          toast({ variant: "destructive", title: "Error", description: "Question not found." });
          router.push('/dashboard/questions');
          return;
        }
        setInitialQuestionData(fetchedQuestionData);
        if(fetchedQuestionData.isSane !== null && fetchedQuestionData.isSane !== undefined) {
          setAiCheckResult({ isSane: fetchedQuestionData.isSane, explanation: fetchedQuestionData.sanityExplanation || '' });
        }
      } catch (error) {
        console.error("Error fetching question:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch question data." });
      } finally {
        setIsFetchingQuestion(false);
      }

      try {
        fetchedSubjects = await getSubjects();
        setAvailableSubjects(fetchedSubjects);
      } catch (error) {
        console.error("Error fetching subjects:", error);
        toast({
          variant: "destructive",
          title: "خطأ في جلب المواد",
          description: "لم نتمكن من تحميل قائمة المواد المتاحة.",
        });
      } finally {
        setIsFetchingSubjects(false);
      }
      
      try {
        fetchedTags = await getTags();
        setAvailableTags(fetchedTags);
      } catch (error) {
        console.error("Error fetching tags:", error);
        toast({
          variant: "destructive",
          title: "خطأ في جلب التصنيفات",
          description: "لم نتمكن من تحميل قائمة التصنيفات المتاحة.",
        });
      } finally {
        setIsFetchingTags(false);
      }

      if (fetchedQuestionData) {
        // Use subjectId from question directly if available, otherwise try to find by name (less reliable)
        const subjectIdToSet = fetchedQuestionData.subjectId || fetchedSubjects.find(s => s.name === fetchedQuestionData?.subject)?.id;
        
        const defaultValues: Partial<QuestionFormValues> = {
          subjectId: subjectIdToSet || undefined,
          questionText: fetchedQuestionData.questionText,
          difficulty: fetchedQuestionData.difficulty,
          tagIds: fetchedQuestionData.tagIds || [],
          questionType: fetchedQuestionData.questionType,
        };

        if (fetchedQuestionData.questionType === 'mcq') {
          defaultValues.options = (fetchedQuestionData as MCQQuestion).options.map(opt => ({ text: opt.text }));
          const correctIndex = (fetchedQuestionData as MCQQuestion).options.findIndex(opt => opt.id === (fetchedQuestionData as MCQQuestion).correctOptionId);
          defaultValues.correctOptionIndex = correctIndex !== -1 ? correctIndex.toString() : undefined;

        } else if (fetchedQuestionData.questionType === 'true_false') {
          defaultValues.correctBooleanAnswer = (fetchedQuestionData as TrueFalseQuestion).correctOptionId as 'true' | 'false';
        } else if (fetchedQuestionData.questionType === 'fill_in_the_blanks') {
          defaultValues.correctAnswers = (fetchedQuestionData as FillInTheBlanksQuestion).correctAnswers.map(ans => ({ text: ans }));
        } else if (fetchedQuestionData.questionType === 'short_answer') {
          defaultValues.modelAnswer = (fetchedQuestionData as ShortAnswerQuestion).modelAnswer;
        }
        
        form.reset(defaultValues as QuestionFormValues);

        if (fetchedQuestionData.questionType === 'mcq') {
           replaceMcqOptions((fetchedQuestionData as MCQQuestion).options.map(opt => ({ text: opt.text })));
        } else if (fetchedQuestionData.questionType === 'fill_in_the_blanks') {
           replaceFillBlankAnswers((fetchedQuestionData as FillInTheBlanksQuestion).correctAnswers.map(ans => ({ text: ans })));
        }
      }
    };
    fetchPageData();
  }, [params, form, router, toast, replaceMcqOptions, replaceFillBlankAnswers]); 

  const handleAiCheck = async () => {
    const questionText = form.getValues("questionText");
     if (!questionText.trim()) {
      toast({ variant: "destructive", title: "Cannot Check Empty Question", description: "Please enter some text for the question." });
      return;
    }
    setIsAiChecking(true);
    setAiCheckResult(null);
    try {
      const result = await arabicQuestionSanityCheck({ question: questionText });
      setAiCheckResult(result);
      toast({ title: "AI Sanity Check Complete", description: result.isSane ? "Question seems valid." : "Question might have issues." });
    } catch (error) {
      console.error("AI Sanity Check Error:", error);
      toast({ variant: "destructive", title: "AI Check Failed", description: "Could not perform sanity check." });
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
          // Create new tag
          const newTagId = await createTagInDb({ name: suggestedTagName.trim() });
          const newTag: Tag = { id: newTagId, name: suggestedTagName.trim(), createdAt: new Date() as any, updatedAt: new Date() as any };
          setAvailableTags(prev => [...prev, newTag]); // Add to local list for immediate UI update
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

  const onSubmit = async (data: QuestionFormValues) => {
    const questionIdFromParams = params?.id as string;
    if (!questionIdFromParams || !initialQuestionData) return;
    setIsLoading(true);
    try {
      const selectedSubject = availableSubjects.find(s => s.id === data.subjectId);
      if (!selectedSubject) {
        toast({ variant: "destructive", title: "Error", description: "Selected subject not found." });
        setIsLoading(false);
        return;
      }

      let updatedQuestionPayload: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>;

      if (data.questionType === 'mcq') {
        const mcqData = data as Extract<QuestionFormValues, { questionType: 'mcq' }>;
        const optionsWithIds: Option[] = mcqData.options.map((opt, index) => ({ 
          id: initialQuestionData.questionType === 'mcq' ? ((initialQuestionData as MCQQuestion).options[index]?.id || `option-${Date.now()}-${index}`) : `option-${Date.now()}-${index}`,
          text: opt.text 
        }));
        const correctOptionIndex = parseInt(mcqData.correctOptionIndex, 10);
        if (isNaN(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex >= optionsWithIds.length) {
           toast({ variant: "destructive", title: "Error", description: "Invalid correct option selected for MCQ." });
           setIsLoading(false);
           return;
        }
        const correctOptionId = optionsWithIds[correctOptionIndex].id;
        updatedQuestionPayload = {
          questionType: 'mcq',
          questionText: mcqData.questionText,
          options: optionsWithIds,
          correctOptionId: correctOptionId,
          difficulty: mcqData.difficulty,
          subjectId: selectedSubject.id,
          subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : initialQuestionData?.isSane ?? null,
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : initialQuestionData?.sanityExplanation ?? null,
          tagIds: mcqData.tagIds || [],
          lessonId: initialQuestionData?.lessonId || null,
        };
      } else if (data.questionType === 'true_false') { 
        const tfData = data as Extract<QuestionFormValues, { questionType: 'true_false' }>;
        updatedQuestionPayload = {
          questionType: 'true_false',
          questionText: tfData.questionText,
          options: [ 
            { id: 'true', text: 'صحيح' },
            { id: 'false', text: 'خطأ' },
          ],
          correctOptionId: tfData.correctBooleanAnswer,
          difficulty: tfData.difficulty,
          subjectId: selectedSubject.id,
          subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : initialQuestionData?.isSane ?? null,
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : initialQuestionData?.sanityExplanation ?? null,
          tagIds: tfData.tagIds || [],
          lessonId: initialQuestionData?.lessonId || null,
        };
      } else if (data.questionType === 'fill_in_the_blanks') {
        const fitbData = data as Extract<QuestionFormValues, { questionType: 'fill_in_the_blanks' }>;
        updatedQuestionPayload = {
          questionType: 'fill_in_the_blanks',
          questionText: fitbData.questionText,
          correctAnswers: fitbData.correctAnswers.map(ans => ans.text),
          difficulty: fitbData.difficulty,
          subjectId: selectedSubject.id,
          subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : initialQuestionData?.isSane ?? null,
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : initialQuestionData?.sanityExplanation ?? null,
          tagIds: fitbData.tagIds || [],
          lessonId: initialQuestionData?.lessonId || null,
        };
      } else { // 'short_answer'
        const saData = data as Extract<QuestionFormValues, { questionType: 'short_answer' }>;
        updatedQuestionPayload = {
          questionType: 'short_answer',
          questionText: saData.questionText,
          modelAnswer: saData.modelAnswer || undefined,
          difficulty: saData.difficulty,
          subjectId: selectedSubject.id,
          subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : initialQuestionData?.isSane ?? null,
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : initialQuestionData?.sanityExplanation ?? null,
          tagIds: saData.tagIds || [],
          lessonId: initialQuestionData?.lessonId || null,
        };
      }


      await updateQuestion(questionIdFromParams, updatedQuestionPayload);
      toast({ title: "Success!", description: "Question updated successfully." });
      router.push('/dashboard/questions');
    } catch (error) {
      console.error("Error updating question:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update question." });
    } finally {
      setIsLoading(false);
    }
  };
  
  const isPageLoading = isFetchingQuestion || isFetchingSubjects || isFetchingTags;
  const canSubmit = !isLoading && !isAiChecking && !isPageLoading && availableSubjects.length > 0 && !isSuggestingTags;

  if (isPageLoading && !initialQuestionData) { 
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <BookCopy className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">Edit Question</CardTitle>
        </div>
        <CardDescription>Modify the details for the existing question.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                   <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    disabled={isLoading || isFetchingSubjects || availableSubjects.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the subject for the question" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isFetchingSubjects && availableSubjects.length === 0 ? ( 
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 rtl:mr-2">Loading subjects...</span>
                        </div>
                      ) : availableSubjects.length === 0 ? (
                         <div className="p-4 text-center text-muted-foreground">
                           No subjects added yet. Please <a href="/dashboard/subjects" className="text-primary hover:underline">add a subject</a> first.
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
              name="questionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع السؤال</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                  }} value={field.value} disabled={isLoading}>
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
                  <FormLabel>Question Text (Arabic)</FormLabel>
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
                  <FormDescription>This is the main text for the question.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-x-2 rtl:space-x-reverse flex items-center">
                <Button type="button" variant="outline" onClick={handleAiCheck} disabled={isAiChecking || isLoading || isSuggestingTags}>
                {isAiChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Arabic Sanity Check
                </Button>
                <Button type="button" variant="outline" onClick={handleAiSuggestTags} disabled={isSuggestingTags || isLoading || isAiChecking}>
                    {isSuggestingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Suggest Tags with AI
                </Button>
            </div>


            {aiCheckResult && (
              <Alert variant={aiCheckResult.isSane ? "default" : "destructive"} className="mt-4">
                {aiCheckResult.isSane ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertTitle>{aiCheckResult.isSane ? "AI Check: Looks Good!" : "AI Check: Potential Issues Found"}</AlertTitle>
                <AlertDescription>{aiCheckResult.explanation}</AlertDescription>
              </Alert>
            )}

            {watchedQuestionType === 'mcq' && (
              <>
                <div>
                  <Label>Options</Label>
                  <div className="space-y-4 mt-2">
                    {mcqOptionFields.map((item, index) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name={`options.${index}.text`}
                        render={({ field: optionField }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormControl><Input placeholder={`Option ${index + 1}`} {...optionField} /></FormControl>
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
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                    </Button>
                  )}
                </div>

                <FormField
                  control={form.control}
                   // @ts-ignore
                  name="correctOptionIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correct Answer</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value)} disabled={isLoading}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select the correct option" /></SelectTrigger></FormControl>
                        <SelectContent>
                           {/* @ts-ignore */}
                          {(form.getValues("options") || []).map((option, index) => (
                            <SelectItem key={index} value={index.toString()} disabled={!option.text?.trim()}>
                              Option {index + 1}: {option.text?.length > 30 ? option.text.substring(0,30) + '...' : option.text}
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
                 // @ts-ignore
                name="correctBooleanAnswer"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>الإجابة الصحيحة</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                        disabled={isLoading}
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                          <FormControl>
                            <RadioGroupItem value="true" />
                          </FormControl>
                          <FormLabel className="font-normal">صحيح</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                          <FormControl>
                            <RadioGroupItem value="false" />
                          </FormControl>
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
                 <FormDescription className="text-xs mb-2">
                  أضف إجابة لكل فراغ (____) في نص السؤال.
                </FormDescription>
                <div className="space-y-4 mt-2">
                  {fillBlankAnswerFields.map((item, index) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      // @ts-ignore
                      name={`correctAnswers.${index}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder={`إجابة الفراغ ${index + 1}`} {...field} />
                            </FormControl>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendFillBlankAnswer({ text: '' })}
                  className="mt-2"
                  disabled={isLoading}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> إضافة إجابة فراغ أخرى
                </Button>
              </div>
            )}

            {watchedQuestionType === 'short_answer' && (
              <FormField
                control={form.control}
                // @ts-ignore
                name="modelAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الإجابة النموذجية (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="اكتب الإجابة النموذجية هنا كمرجع..." {...field} rows={3} />
                    </FormControl>
                    <FormDescription>
                      هذه الإجابة للمراجعة ولن يتم استخدامها للتصحيح التلقائي.
                    </FormDescription>
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
                  <FormLabel>Difficulty</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select difficulty level" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
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
                      Tags (Optional)
                    </FormLabel>
                    <FormDescription>
                      Select relevant tags for this question.
                    </FormDescription>
                  </div>
                  {isFetchingTags ? (
                    <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 rtl:mr-2">Loading tags...</span>
                    </div>
                  ) : availableTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tags available. You can add tags on the <a href="/dashboard/tags" className="text-primary hover:underline">Tags page</a>.
                    </p>
                  ) : (
                    <ScrollArea className="h-40 rounded-md border p-3">
                      <div className="space-y-2">
                        {availableTags.map((tag) => (
                          <FormField
                            key={tag.id}
                            control={form.control}
                            name="tagIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={tag.id}
                                  className="flex flex-row items-center space-x-2 space-y-0 rtl:space-x-reverse"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(tag.id!)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), tag.id!])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== tag.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm cursor-pointer">
                                    {tag.name}
                                  </FormLabel>
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
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={!canSubmit}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SaveIcon className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
