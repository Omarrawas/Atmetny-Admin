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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addQuestion, getSubjectById } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import type { Option, Question, MCQQuestion } from '@/types'; // Updated type import

// Schema for a single MCQ question being added within a lesson context
const lessonMcqQuestionSchema = z.object({
  questionText: z.string().min(10, "نص السؤال يجب أن يكون 10 أحرف على الأقل."),
  options: z.array(z.object({ text: z.string().min(1, "نص الخيار لا يمكن أن يكون فارغًا.") })).min(2, "يجب أن يكون هناك خياران على الأقل.").max(6, "لا يمكن أن يكون هناك أكثر من 6 خيارات."),
  correctOptionIndex: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >=0 , { message: "الرجاء اختيار إجابة صحيحة."}),
  difficulty: z.enum(['easy', 'medium', 'hard'], { required_error: "الرجاء اختيار مستوى الصعوبة." }),
});

type LessonMcqQuestionFormValues = z.infer<typeof lessonMcqQuestionSchema>;

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

  const form = useForm<LessonMcqQuestionFormValues>({
    resolver: zodResolver(lessonMcqQuestionSchema),
    defaultValues: {
      questionText: '',
      options: [{ text: '' }, { text: '' }],
      correctOptionIndex: undefined,
      difficulty: 'medium',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  useEffect(() => {
    const fetchSubjectName = async () => {
      if (subjectId) {
        const subjectData = await getSubjectById(subjectId);
        setSubjectName(subjectData?.name || 'Unknown Subject');
      }
    };
    fetchSubjectName();
  }, [subjectId]);

  const onSubmit = async (data: LessonMcqQuestionFormValues) => {
    setIsLoading(true);
    try {
      const optionsWithIds: Option[] = data.options.map((opt, index) => ({ id: `option-${index + 1}-${Date.now()}`, text: opt.text }));
      const correctOptionId = optionsWithIds[parseInt(data.correctOptionIndex)].id;

      const questionPayload: Omit<MCQQuestion, 'id' | 'createdAt' | 'updatedAt'> = {
        questionType: 'mcq', // Set question type to mcq
        questionText: data.questionText,
        options: optionsWithIds,
        correctOptionId: correctOptionId,
        difficulty: data.difficulty,
        subjectId: subjectId,
        subject: subjectName || subjectId,
        lessonId: lessonId,
        isSane: null, 
        sanityExplanation: null,
        tagIds: [], // Default to empty array for tags
      };
      
      await addQuestion(questionPayload as Omit<Question, 'id' | 'createdAt' | 'updatedAt'>);


      toast({
        title: "نجاح!",
        description: "تمت إضافة السؤال الجديد وربطه بالدرس بنجاح.",
      });
      form.reset();
      onQuestionAdded?.();
    } catch (error) {
      console.error("Error adding question to lesson:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت إضافة السؤال.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-3 mb-2 shadow-xs border border-border/50 bg-muted/20">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-sm font-medium">إضافة سؤال (اختيار من متعدد) لهذا الدرس</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-3 px-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">نص السؤال (عربي)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="اكتب نص السؤال هنا..." {...field} rows={2} className="text-sm"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label className="text-xs">الخيارات</Label>
              <div className="space-y-1.5 mt-1">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`options.${index}.text`}
                    render={({ field: optionField }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormControl>
                            <Input placeholder={`الخيار ${index + 1}`} {...optionField} className="text-sm h-8"/>
                          </FormControl>
                          {fields.length > 2 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isLoading} className="h-8 w-8">
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
              {fields.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => append({ text: '' })}
                  className="mt-1.5"
                  disabled={isLoading}
                >
                  <PlusCircle className="mr-1 h-3.5 w-3.5" /> إضافة خيار
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="correctOptionIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">الإجابة الصحيحة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue placeholder="اختر الإجابة الصحيحة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {form.getValues("options").map((option, index) => (
                        <SelectItem key={index} value={index.toString()} disabled={!option.text.trim()} className="text-sm">
                          الخيار {index + 1}{option.text.trim() ? `: ${option.text.substring(0,20)}...` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
