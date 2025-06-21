
// src/components/questions/AddLessonQuestionForm.tsx
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addQuestion, getSubjectById, getTags, addTag as createTagInDb } from '@/lib/firestore'; // Updated to use createTagInDb alias
import { uploadFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, TagsIcon, Search, Image as ImageIcon, Upload } from 'lucide-react'; // Added Search and ImageIcon icons
import type { Option, Question, QuestionType, MCQQuestion, TrueFalseQuestion, FillInTheBlanksQuestion, ShortAnswerQuestion, Tag } from '@/types';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  imageUrl: z.string().url({ message: "الرجاء إدخال رابط URL صحيح." }).optional().or(z.literal('')),
  imageHint: z.string().max(50, "تلميح الصورة لا يمكن أن يتجاوز 50 حرفًا.").optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'], { required_error: "الرجاء اختيار مستوى الصعوبة." }),
  tagIds: z.array(z.string()).optional().default([]),
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
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isFetchingTags, setIsFetchingTags] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LessonQuestionFormValues>({
    resolver: zodResolver(lessonQuestionSchema),
    defaultValues: {
      questionText: '',
      imageUrl: '',
      imageHint: '',
      difficulty: 'medium',
      questionType: 'mcq',
      tagIds: [],
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

  const fetchTagsData = async () => {
    setIsFetchingTags(true);
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

  useEffect(() => {
    const fetchInitialSubjectData = async () => {
      if (subjectId) {
        try {
            const subjectData = await getSubjectById(subjectId);
            setSubjectName(subjectData?.name || 'مادة غير معروفة');
        } catch (error) {
            console.error("Error fetching subject name:", error);
            setSubjectName('خطأ في تحميل اسم المادة');
        }
      }
    };
    fetchInitialSubjectData();
    fetchTagsData();
  }, [subjectId, toast]);

  useEffect(() => {
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await uploadFile(file, 'questionimages', 'questions');
      form.setValue('imageUrl', publicUrl, { shouldValidate: true, shouldDirty: true });
      toast({ title: "نجاح", description: "تم رفع صورة السؤال بنجاح." });
    } catch (error) {
      console.error("Error uploading question image:", error);
      toast({ variant: "destructive", title: "خطأ في الرفع", description: "فشلت عملية رفع الصورة. يرجى المحاولة مرة أخرى." });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (formData: LessonQuestionFormValues) => {
    setIsLoading(true);
    try {
      let questionPayload: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>;

      if (formData.questionType === 'mcq') {
        const mcqData = formData as Extract<LessonQuestionFormValues, { questionType: 'mcq' }>;
        const optionsWithIds: Option[] = mcqData.options.map((opt, index) => ({ id: `option-${index + 1}-${Date.now()}`, text: opt.text }));
        const correctOptionId = optionsWithIds[parseInt(mcqData.correctOptionIndex)].id;
        questionPayload = {
          questionType: 'mcq', questionText: mcqData.questionText, imageUrl: mcqData.imageUrl || null, imageHint: mcqData.imageHint || null, options: optionsWithIds, correctOptionId: correctOptionId,
          difficulty: mcqData.difficulty, subjectId: subjectId, subject: subjectName || subjectId,
          lessonId: lessonId, isSane: null, sanityExplanation: null, tagIds: formData.tagIds || [],
        };
      } else if (formData.questionType === 'true_false') {
        const tfData = formData as Extract<LessonQuestionFormValues, { questionType: 'true_false' }>;
        questionPayload = {
          questionType: 'true_false', questionText: tfData.questionText, imageUrl: tfData.imageUrl || null, imageHint: tfData.imageHint || null, options: [ { id: 'true', text: 'صحيح' }, { id: 'false', text: 'خطأ' } ],
          correctOptionId: tfData.correctBooleanAnswer, difficulty: tfData.difficulty, subjectId: subjectId, subject: subjectName || subjectId,
          lessonId: lessonId, isSane: null, sanityExplanation: null, tagIds: formData.tagIds || [],
        };
      } else if (formData.questionType === 'fill_in_the_blanks') {
        const fitbData = formData as Extract<LessonQuestionFormValues, { questionType: 'fill_in_the_blanks' }>;
        questionPayload = {
          questionType: 'fill_in_the_blanks', questionText: fitbData.questionText, imageUrl: fitbData.imageUrl || null, imageHint: fitbData.imageHint || null, correctAnswers: fitbData.correctAnswers.map(ans => ans.text),
          difficulty: fitbData.difficulty, subjectId: subjectId, subject: subjectName || subjectId,
          lessonId: lessonId, isSane: null, sanityExplanation: null, tagIds: formData.tagIds || [],
        };
      } else if (formData.questionType === 'short_answer') {
        const saData = formData as Extract<LessonQuestionFormValues, { questionType: 'short_answer' }>;
        questionPayload = {
          questionType: 'short_answer', questionText: saData.questionText, imageUrl: saData.imageUrl || null, imageHint: saData.imageHint || null, modelAnswer: saData.modelAnswer || undefined,
          difficulty: saData.difficulty, subjectId: subjectId, subject: subjectName || subjectId,
          lessonId: lessonId, isSane: null, sanityExplanation: null, tagIds: formData.tagIds || [],
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
      form.reset({
        questionText: '',
        imageUrl: '',
        imageHint: '',
        difficulty: 'medium',
        questionType: 'mcq',
        tagIds: [],
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

            <div className="space-y-1">
              <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel className="text-xs flex items-center"><ImageIcon className="h-3.5 w-3.5 mr-1"/> رابط صورة</FormLabel>
                      <FormControl>
                          <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} className="text-sm h-8"/>
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <div className="relative">
                <Button type="button" variant="outline" size="xs" disabled={isUploading || isLoading} onClick={() => document.getElementById('lesson-question-image-upload')?.click()}>
                    {isUploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
                    {isUploading ? 'جاري الرفع...' : 'رفع صورة'}
                </Button>
                <input
                    type="file"
                    id="lesson-question-image-upload"
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleImageUpload}
                    disabled={isUploading || isLoading}
                />
              </div>
            </div>
            
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

            <FormField
              control={form.control}
              name="tagIds"
              render={() => (
                <FormItem>
                  <div className="mb-1">
                    <FormLabel className="text-xs flex items-center">
                      <TagsIcon className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0 text-primary" />
                      التصنيفات (اختياري)
                    </FormLabel>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <div className="flex-grow">
                      <Label htmlFor="new-tag-name-lesson-q" className="sr-only">اسم التصنيف الجديد</Label>
                      <Input
                        id="new-tag-name-lesson-q"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="أو أضف تصنيفًا جديدًا..."
                        className="text-sm h-8"
                        disabled={isAddingNewTag}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewTag}
                      disabled={isAddingNewTag || !newTagName.trim()}
                      className="h-8"
                    >
                      {isAddingNewTag ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="mr-1 h-3.5 w-3.5" />}
                      إضافة
                    </Button>
                  </div>
                  <div className="relative mb-2">
                    <Input
                      type="text"
                      placeholder="ابحث عن تصنيف..."
                      value={tagSearchTerm}
                      onChange={(e) => setTagSearchTerm(e.target.value)}
                      className="text-sm h-8 pl-8 rtl:pr-8"
                    />
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground rtl:right-2 rtl:left-auto" />
                  </div>

                  {isFetchingTags ? (
                    <div className="flex items-center justify-center p-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-1 rtl:mr-1 text-xs text-muted-foreground">جاري تحميل التصنيفات...</span>
                    </div>
                  ) : filteredAvailableTags.length === 0 && !tagSearchTerm ? (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      لا توجد تصنيفات. أضف تصنيفًا جديدًا أعلاه أو من <a href="/dashboard/tags" className="text-primary hover:underline">صفحة التصنيفات</a>.
                    </p>
                  ) : filteredAvailableTags.length === 0 && tagSearchTerm ? (
                     <p className="text-xs text-muted-foreground text-center py-1">لا توجد تصنيفات تطابق بحثك.</p>
                  ) : (
                    <ScrollArea className="h-28 rounded-md border p-2">
                      <div className="space-y-1">
                        {filteredAvailableTags.map((tag) => (
                          <FormField
                            key={tag.id}
                            control={form.control}
                            name="tagIds"
                            render={({ field }) => {
                              return (
                                <FormItem key={tag.id} className="flex flex-row items-center space-x-1.5 space-y-0 rtl:space-x-reverse">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(tag.id!)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), tag.id!])
                                          : field.onChange((field.value || []).filter((value) => value !== tag.id));
                                      }}
                                      className="h-3.5 w-3.5"
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-xs cursor-pointer">{tag.name}</FormLabel>
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

            <p className="text-xs text-muted-foreground">
              المادة: {subjectName || 'جاري التحميل...'} (سيتم ربط السؤال بهذه المادة والدرس الحالي).
            </p>
            <Button type="submit" disabled={isLoading || isFetchingTags || isAddingNewTag || isUploading} size="sm">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              إضافة السؤال للدرس
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
