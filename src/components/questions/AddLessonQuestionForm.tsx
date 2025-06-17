
// src/components/questions/AddLessonQuestionForm.tsx
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Added RadioGroupItem
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addQuestion, getSubjectById } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import type { Option, Question, QuestionType, MCQQuestion, TrueFalseQuestion, FillInTheBlanksQuestion, ShortAnswerQuestion } from '@/types';

// Schemas for different parts of the lesson question form
const lessonOptionSchema = z.object({
  text: z.string().min(1, "نص الخيار لا يمكن أن يكون فارغًا."),
});

const lessonCorrectAnswerSchema = z.object({
  text: z.string().min(1, "نص الإجابة الصحيحة لا يمكن أن يكون فارغًا."),
});

// Base schema for common fields shared across all question types within a lesson context
const lessonBaseQuestionSchema = z.object({
  questionText: z.string().min(10, "نص السؤال يجب أن يكون 10 أحرف على الأقل."),
  difficulty: z.enum(['easy', 'medium', 'hard'], { required_error: "الرجاء اختيار مستوى الصعوبة." }),
  // subjectId and lessonId are passed as props, not part of form data directly
});

// Schema for Multiple Choice Questions (MCQ) within a lesson
const lessonMcqQuestionSchema = lessonBaseQuestionSchema.extend({
  questionType: z.literal('mcq'),
  options: z.array(lessonOptionSchema).min(2, "يجب أن يكون هناك خياران على الأقل.").max(6, "لا يمكن أن يكون هناك أكثر من 6 خيارات."),
  correctOptionIndex: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >=0 , { message: "الرجاء اختيار إجابة صحيحة."}),
});

// Schema for True/False Questions within a lesson
const lessonTrueFalseQuestionSchema = lessonBaseQuestionSchema.extend({
  questionType: z.literal('true_false'),
  correctBooleanAnswer: z.enum(['true', 'false'], { required_error: "الرجاء تحديد إذا كانت الإجابة صحيحة أم خاطئة."}),
});

// Schema for Fill in the Blanks Questions within a lesson
const lessonFillInTheBlanksQuestionSchema = lessonBaseQuestionSchema.extend({
  questionType: z.literal('fill_in_the_blanks'),
  correctAnswers: z.array(lessonCorrectAnswerSchema).min(1, "يجب أن يكون هناك إجابة واحدة صحيحة على الأقل للفراغات."),
});

// Schema for Short Answer Questions within a lesson
const lessonShortAnswerQuestionSchema = lessonBaseQuestionSchema.extend({
  questionType: z.literal('short_answer'),
  modelAnswer: z.string().optional(),
});

// Discriminated union schema for all lesson question types
const lessonQuestionSchema = z.discriminatedUnion("questionType", [
  lessonMcqQuestionSchema,
  lessonTrueFalseQuestionSchema,
  lessonFillInTheBlanksQuestionSchema,
  lessonShortAnswerQuestionSchema,
]);

type LessonQuestionFormValues = z.infer<typeof lessonQuestionSchema>;

interface AddLessonQuestionFormProps {
  subjectId: string;
  lessonId: string;
  onQuestionAdded?: () => void;
}

export default function AddLessonQuestionForm({
  subjectId,
  lessonId,
  onQuestionAdded,
}: AddLessonQuestionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [subjectName, setSubjectName] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<LessonQuestionFormValues>({
    resolver: zodResolver(lessonQuestionSchema),
    defaultValues: {
      questionText: '',
      difficulty: 'medium',
      questionType: 'mcq', // Default to MCQ
      // @ts-ignore
      options: [{ text: '' }, { text: '' }], // Default for MCQ
      // @ts-ignore
      correctOptionIndex: undefined, // Default for MCQ
      // @ts-ignore
      correctBooleanAnswer: undefined, // Default for True/False
      // @ts-ignore
      correctAnswers: [{ text: '' }], // Default for Fill in the Blanks
      // @ts-ignore
      modelAnswer: '', // Default for Short Answer
    },
  });

  const watchedQuestionType = form.watch("questionType");

  const { fields: mcqOptionFields, append: appendMcqOption, remove: removeMcqOption } = useFieldArray({
    control: form.control,
    // @ts-ignore
    name: "options",
  });

  const { fields: fillBlankAnswerFields, append: appendFillBlankAnswer, remove: removeFillBlankAnswer } = useFieldArray({
    control: form.control,
    // @ts-ignore
    name: "correctAnswers",
  });

  useEffect(() => {
    const fetchSubjectName = async () => {
      if (subjectId) {
        const subjectData = await getSubjectById(subjectId);
        setSubjectName(subjectData?.name || 'مادة غير معروفة');
      }
    };
    fetchSubjectName();
  }, [subjectId]);

  useEffect(() => {
    // Reset specific fields when questionType changes to ensure clean state
    if (watchedQuestionType === 'mcq') {
      // @ts-ignore
      if (!form.getValues('options') || form.getValues('options')?.length < 2) {
        // @ts-ignore
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
      form.setValue('correctBooleanAnswer', form.getValues('correctBooleanAnswer') || undefined);
      form.setValue('correctAnswers', undefined);
      form.setValue('modelAnswer', undefined);
    } else if (watchedQuestionType === 'fill_in_the_blanks') {
      // @ts-ignore
      if (!form.getValues('correctAnswers') || form.getValues('correctAnswers')?.length < 1) {
        // @ts-ignore
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
      // @ts-ignore
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

  const onSubmit = async (formData: LessonQuestionFormValues) => {
    setIsLoading(true);
    try {
      let questionPayload: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>;

      if (formData.questionType === 'mcq') {
        const mcqData = formData as Extract<LessonQuestionFormValues, { questionType: 'mcq' }>;
        const optionsWithIds: Option[] = mcqData.options.map((opt, index) => ({ id: `option-${index + 1}-${Date.now()}`, text: opt.text }));
        const correctOptionId = optionsWithIds[parseInt(mcqData.correctOptionIndex)].id;
        questionPayload = {
          questionType: 'mcq', questionText: mcqData.questionText, options: optionsWithIds, correctOptionId: correctOptionId,
          difficulty: mcqData.difficulty, subjectId: subjectId, subject: subjectName || subjectId,
          lessonId: lessonId, isSane: null, sanityExplanation: null, tagIds: [],
        };
      } else if (formData.questionType === 'true_false') {
        const tfData = formData as Extract<LessonQuestionFormValues, { questionType: 'true_false' }>;
        questionPayload = {
          questionType: 'true_false', questionText: tfData.questionText, options: [ { id: 'true', text: 'صحيح' }, { id: 'false', text: 'خطأ' } ],
          correctOptionId: tfData.correctBooleanAnswer, difficulty: tfData.difficulty, subjectId: subjectId, subject: subjectName || subjectId,
          lessonId: lessonId, isSane: null, sanityExplanation: null, tagIds: [],
        };
      } else if (formData.questionType === 'fill_in_the_blanks') {
        const fitbData = formData as Extract<LessonQuestionFormValues, { questionType: 'fill_in_the_blanks' }>;
        questionPayload = {
          questionType: 'fill_in_the_blanks', questionText: fitbData.questionText, correctAnswers: fitbData.correctAnswers.map(ans => ans.text),
          difficulty: fitbData.difficulty, subjectId: subjectId, subject: subjectName || subjectId,
          lessonId: lessonId, isSane: null, sanityExplanation: null, tagIds: [],
        };
      } else if (formData.questionType === 'short_answer') {
        const saData = formData as Extract<LessonQuestionFormValues, { questionType: 'short_answer' }>;
        questionPayload = {
          questionType: 'short_answer', questionText: saData.questionText, modelAnswer: saData.modelAnswer || undefined,
          difficulty: saData.difficulty, subjectId: subjectId, subject: subjectName || subjectId,
          lessonId: lessonId, isSane: null, sanityExplanation: null, tagIds: [],
        };
      } else {
        console.error("Invalid question type in form data:", formData);
        toast({ variant: "destructive", title: "خطأ", description: "نوع سؤال غير صالح." });
        setIsLoading(false);
        return;
      }
      
      await addQuestion(questionPayload);

      toast({
        title: "نجاح!",
        description: "تمت إضافة السؤال الجديد وربطه بالدرس بنجاح.",
      });
      form.reset({ // Reset with default type
        questionText: '',
        difficulty: 'medium',
        questionType: 'mcq',
        // @ts-ignore
        options: [{ text: '' }, { text: '' }],
        // @ts-ignore
        correctOptionIndex: undefined,
        // @ts-ignore
        correctBooleanAnswer: undefined,
        // @ts-ignore
        correctAnswers: [{ text: '' }],
        // @ts-ignore
        modelAnswer: '',
      });
      onQuestionAdded?.();
    } catch (error: any) {
      console.error("Error adding question to lesson (raw object follows):");
      console.error(error);
      try {
        console.error("Stringified Supabase error in AddLessonQuestionForm:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e) {
        console.error("Could not stringify Supabase error in AddLessonQuestionForm:", e);
      }
      
      let toastDescription = `فشلت إضافة السؤال.`;
      if (error.message) {
        if (error.message.toLowerCase().includes('failed to fetch')) {
          toastDescription = `فشل في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت وإعدادات Supabase الصحيحة. (تفاصيل: ${error.message})`;
        } else {
          toastDescription += ` (${error.message})`;
        }
      }

      toast({
        variant: "destructive",
        title: "خطأ في إضافة السؤال",
        description: toastDescription,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-3 mb-2 shadow-xs border border-border/50 bg-muted/20">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-sm font-medium">اضف اختيار نوع السؤال هنا</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-3 px-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="questionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">نوع السؤال</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue placeholder="اختر نوع السؤال" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mcq" className="text-sm">اختيار من متعدد</SelectItem>
                      <SelectItem value="true_false" className="text-sm">صح/خطأ</SelectItem>
                      <SelectItem value="fill_in_the_blanks" className="text-sm">املأ الفراغات</SelectItem>
                      <SelectItem value="short_answer" className="text-sm">سؤال مقالي قصير</SelectItem>
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
                  <FormLabel className="text-xs">نص السؤال (عربي)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={
                        watchedQuestionType === 'fill_in_the_blanks' 
                        ? "اكتب نص السؤال هنا، واستخدم ____ للإشارة إلى الفراغات."
                        : "اكتب نص السؤال هنا..."
                      } 
                      {...field} 
                      rows={2} 
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchedQuestionType === 'mcq' && (
              <>
                <div>
                  <Label className="text-xs">الخيارات</Label>
                  <div className="space-y-1.5 mt-1">
                    {mcqOptionFields.map((item, index) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        // @ts-ignore
                        name={`options.${index}.text`}
                        render={({ field: optionField }) => (
                          <FormItem>
                            <div className="flex items-center gap-1">
                              <FormControl>
                                <Input placeholder={`الخيار ${index + 1}`} {...optionField} className="text-sm h-8"/>
                              </FormControl>
                              {mcqOptionFields.length > 2 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeMcqOption(index)} disabled={isLoading} className="h-8 w-8">
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
                      size="xs"
                      onClick={() => appendMcqOption({ text: '' })}
                      className="mt-1.5"
                      disabled={isLoading}
                    >
                      <PlusCircle className="mr-1 h-3.5 w-3.5" /> إضافة خيار
                    </Button>
                  )}
                </div>

                <FormField
                  control={form.control}
                  // @ts-ignore
                  name="correctOptionIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">الإجابة الصحيحة</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value ?? '')} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="text-sm h-8">
                            <SelectValue placeholder="اختر الإجابة الصحيحة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* @ts-ignore */}
                          {(form.getValues("options") || []).map((option, index) => (
                            <SelectItem key={index} value={index.toString()} disabled={!option.text?.trim()} className="text-sm">
                              الخيار {index + 1}{option.text?.trim() ? `: ${option.text.substring(0,20)}...` : ''}
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">الإجابة الصحيحة</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-row space-x-3 rtl:space-x-reverse space-y-0 items-center"
                        disabled={isLoading}
                      >
                        <FormItem className="flex items-center space-x-1.5 rtl:space-x-reverse space-y-0">
                          <FormControl><RadioGroupItem value="true" /></FormControl>
                          <FormLabel className="font-normal text-sm">صحيح</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1.5 rtl:space-x-reverse space-y-0">
                          <FormControl><RadioGroupItem value="false" /></FormControl>
                          <FormLabel className="font-normal text-sm">خطأ</FormLabel>
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
                <Label className="text-xs">الإجابات الصحيحة للفراغات</Label>
                <div className="text-xs text-muted-foreground mb-1">أضف إجابة لكل فراغ (____) في نص السؤال.</div>
                <div className="space-y-1.5 mt-1">
                  {fillBlankAnswerFields.map((item, index) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      // @ts-ignore
                      name={`correctAnswers.${index}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-1">
                            <FormControl>
                              <Input placeholder={`إجابة الفراغ ${index + 1}`} {...field} className="text-sm h-8"/>
                            </FormControl>
                            {fillBlankAnswerFields.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeFillBlankAnswer(index)} disabled={isLoading} className="h-8 w-8">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
                  size="xs"
                  onClick={() => appendFillBlankAnswer({ text: '' })}
                  className="mt-1.5"
                  disabled={isLoading}
                >
                  <PlusCircle className="mr-1 h-3.5 w-3.5" /> إضافة إجابة فراغ أخرى
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
                    <FormLabel className="text-xs">الإجابة النموذجية (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="اكتب الإجابة النموذجية هنا كمرجع..." {...field} rows={2} className="text-sm"/>
                    </FormControl>
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
                  <FormLabel className="text-xs">مستوى الصعوبة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue placeholder="اختر مستوى الصعوبة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="easy" className="text-sm">سهل</SelectItem>
                      <SelectItem value="medium" className="text-sm">متوسط</SelectItem>
                      <SelectItem value="hard" className="text-sm">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">
              المادة: {subjectName || 'جاري التحميل...'} (سيتم ربط السؤال بهذه المادة والدرس الحالي).
            </p>
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              إضافة السؤال للدرس
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
