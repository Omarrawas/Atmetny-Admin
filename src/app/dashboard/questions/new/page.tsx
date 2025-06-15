// src/app/dashboard/questions/new/page.tsx
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
import { addQuestion, getSubjects, getTags, addTag as createTagInDb } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Sparkles, AlertTriangle, CheckCircle2, BookCopy, TagsIcon, HelpCircle } from 'lucide-react';
import type { Question, Option, Subject, Tag, QuestionType, MCQQuestion, TrueFalseQuestion, FillInTheBlanksQuestion, ShortAnswerQuestion } from '@/types';
import { arabicQuestionSanityCheck, ArabicQuestionSanityCheckOutput } from '@/ai/flows/arabic-question-sanity-check';
import { suggestQuestionTags } from '@/ai/flows/suggest-question-tags-flow'; // Import the new flow
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const optionSchema = z.object({
  text: z.string().min(1, "نص الخيار لا يمكن أن يكون فارغًا."),
});

const correctAnswerSchema = z.object({
  text: z.string().min(1, "نص الإجابة لا يمكن أن يكون فارغًا."),
});

// Base schema for common fields
const baseQuestionSchema = z.object({
  subjectId: z.string({ required_error: "الرجاء اختيار المادة." }).min(1, "المادة لا يمكن أن تكون فارغة."),
  questionText: z.string().min(10, "نص السؤال يجب أن يكون 10 أحرف على الأقل."),
  difficulty: z.enum(['easy', 'medium', 'hard'], { required_error: "الرجاء اختيار مستوى الصعوبة." }),
  tagIds: z.array(z.string()).optional().default([]),
});

// Schema for Multiple Choice Questions (MCQ)
const mcqQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('mcq'),
  options: z.array(optionSchema).min(2, "يجب أن يكون هناك خياران على الأقل.").max(6, "لا يمكن أن يكون هناك أكثر من 6 خيارات."),
  correctOptionIndex: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >=0 , { message: "الرجاء اختيار إجابة صحيحة."}),
});

// Schema for True/False Questions
const trueFalseQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('true_false'),
  correctBooleanAnswer: z.enum(['true', 'false'], { required_error: "الرجاء تحديد إذا كانت الإجابة صحيحة أم خاطئة."}),
});

// Schema for Fill in the Blanks Questions
const fillInTheBlanksQuestionSchema = baseQuestionSchema.extend({
  questionType: z.literal('fill_in_the_blanks'),
  correctAnswers: z.array(correctAnswerSchema).min(1, "يجب أن يكون هناك إجابة واحدة صحيحة على الأقل للفراغات."),
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

export default function NewQuestionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiCheckResult, setAiCheckResult] = useState<ArabicQuestionSanityCheckOutput | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(true);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isFetchingTags, setIsFetchingTags] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      subjectId: undefined,
      questionText: '',
      difficulty: undefined,
      tagIds: [],
      questionType: 'mcq',
      // MCQ specific defaults
      options: [{ text: '' }, { text: '' }],
      correctOptionIndex: undefined,
      // Fill in the blanks specific defaults
      correctAnswers: [{ text: '' }],
      // Short answer specific defaults
      modelAnswer: '',
    },
  });

  const watchedQuestionType = form.watch("questionType");

  useEffect(() => {
    // Reset specific fields when questionType changes to ensure clean state
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
        toast({
          variant: "destructive",
          title: "خطأ في جلب المواد",
          description: "لم نتمكن من تحميل قائمة المواد المتاحة.",
        });
      } finally {
        setIsFetchingSubjects(false);
      }
      try {
        const tags = await getTags();
        setAvailableTags(tags);
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
    };
    fetchInitialData();
  }, [toast]);

  const { fields: mcqOptionFields, append: appendMcqOption, remove: removeMcqOption } = useFieldArray({
    control: form.control,
    // @ts-ignore
    name: "options", 
  });
  
  const { fields: fillBlankAnswerFields, append: appendFillBlankAnswer, remove: removeFillBlankAnswer } = useFieldArray({
    control: form.control,
    // @ts-ignore // Zod discriminated union makes this tricky for RHF field array typing
    name: "correctAnswers",
  });


  const handleAiCheck = async () => {
    const questionText = form.getValues("questionText");
    if (!questionText.trim()) {
      toast({
        variant: "destructive",
        title: "Cannot Check Empty Question",
        description: "Please enter some text for the question before performing a sanity check.",
      });
      return;
    }
    setIsAiChecking(true);
    setAiCheckResult(null);
    try {
      const result = await arabicQuestionSanityCheck({ question: questionText });
      setAiCheckResult(result);
      toast({
        title: "AI Sanity Check Complete",
        description: result.isSane ? "Question seems valid." : "Question might have issues.",
      });
    } catch (error) {
      console.error("AI Sanity Check Error:", error);
      toast({
        variant: "destructive",
        title: "AI Check Failed",
        description: "Could not perform sanity check. Please try again.",
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
        const optionsWithIds: Option[] = data.options.map((opt, index) => ({ id: `option-${index + 1}-${Date.now()}`, text: opt.text }));
        const correctOptionId = optionsWithIds[parseInt(data.correctOptionIndex)].id;
        questionPayload = {
          questionType: 'mcq',
          questionText: data.questionText,
          options: optionsWithIds,
          correctOptionId: correctOptionId,
          difficulty: data.difficulty,
          subjectId: selectedSubject.id,
          subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : null,
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : null,
          tagIds: data.tagIds || [],
          lessonId: null,
        };
      } else if (data.questionType === 'true_false') {
        questionPayload = {
          questionType: 'true_false',
          questionText: data.questionText,
          options: [ 
            { id: 'true', text: 'صحيح' },
            { id: 'false', text: 'خطأ' },
          ],
          correctOptionId: data.correctBooleanAnswer,
          difficulty: data.difficulty,
          subjectId: selectedSubject.id,
          subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : null,
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : null,
          tagIds: data.tagIds || [],
          lessonId: null,
        };
      } else if (data.questionType === 'fill_in_the_blanks') {
        questionPayload = {
          questionType: 'fill_in_the_blanks',
          questionText: data.questionText,
          correctAnswers: data.correctAnswers.map(ans => ans.text),
          difficulty: data.difficulty,
          subjectId: selectedSubject.id,
          subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : null,
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : null,
          tagIds: data.tagIds || [],
          lessonId: null,
        };
      } else { // 'short_answer'
         questionPayload = {
          questionType: 'short_answer',
          questionText: data.questionText,
          modelAnswer: data.modelAnswer || undefined,
          difficulty: data.difficulty,
          subjectId: selectedSubject.id,
          subject: selectedSubject.name,
          isSane: aiCheckResult ? aiCheckResult.isSane : null,
          sanityExplanation: aiCheckResult ? aiCheckResult.explanation : null,
          tagIds: data.tagIds || [],
          lessonId: null,
        };
      }


      await addQuestion(questionPayload);
      toast({
        title: "Success!",
        description: "New question added successfully.",
      });
      router.push('/dashboard/questions');
    } catch (error) {
      console.error("Error adding question:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add new question.",
      });
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
          <CardTitle className="text-2xl font-bold">Add New Question</CardTitle>
        </div>
        <CardDescription>Fill in the details for the new question.</CardDescription>
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
                      {isFetchingSubjects ? (
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
                  <FormDescription>
                    This is the main text for the question.
                  </FormDescription>
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
                              <FormControl>
                                <Input placeholder={`Option ${index + 1}`} {...optionField} />
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendMcqOption({ text: '' })}
                      className="mt-2"
                      disabled={isLoading}
                    >
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the correct option" />
                          </SelectTrigger>
                        </FormControl>
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
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty level" />
                      </SelectTrigger>
                    </FormControl>
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
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || isAiChecking || !allDataFetched || availableSubjects.length === 0 || isSuggestingTags}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add Question
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

