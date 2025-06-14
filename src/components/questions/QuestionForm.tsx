'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Question, QuestionOption, Subject, Tag } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Save, PlusCircle, Trash2, Sparkles, Wand2, CheckCircle, AlertTriangle } from 'lucide-react';
import { arabicQuestionSanityCheck, type ArabicQuestionSanityCheckOutput } from '@/ai/flows/arabic-question-sanity-check';
import { suggestQuestionTags, type SuggestQuestionTagsOutput } from '@/ai/flows/suggest-question-tags-flow';
import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect } from 'react';

const optionSchema = z.object({
  text: z.string().min(1, { message: 'نص الخيار مطلوب.' }),
  isCorrect: z.boolean().default(false),
});

const questionSchema = z.object({
  text: z.string().min(5, { message: 'نص السؤال يجب أن يكون 5 أحرف على الأقل.' }),
  subjectId: z.string({ required_error: 'يجب اختيار المادة.' }),
  type: z.enum(['mcq', 'true_false', 'fill_blanks', 'short_answer'], { required_error: 'يجب اختيار نوع السؤال.' }),
  options: z.array(optionSchema).optional(), // For MCQ
  correctAnswer: z.union([z.string(), z.boolean()]).optional(), // For True/False, Fill in the Blanks, Short Answer
  difficulty: z.enum(['easy', 'medium', 'hard'], { required_error: 'يجب اختيار مستوى الصعوبة.' }),
  tags: z.array(z.string()).optional(),
  aiSanityCheck: z.object({
    isGrammaticallyCorrect: z.boolean(),
    suggestedCorrections: z.string(),
  }).optional(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  initialData?: Question | null;
  subjects: Subject[];
  allTags: Tag[]; // All available tags for selection
  onSubmit: (data: QuestionFormValues) => Promise<{ success: boolean; error?: string, id?: string }>;
}

export function QuestionForm({ initialData, subjects, allTags, onSubmit }: QuestionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSanityResult, setAiSanityResult] = useState<ArabicQuestionSanityCheckOutput | null>(null);
  const [suggestedAiTags, setSuggestedAiTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          options: initialData.options?.map(opt => ({...opt, id: opt.id || crypto.randomUUID()})), // ensure options have id
          correctAnswer: initialData.correctAnswer, // this needs to be handled based on type
        }
      : {
          text: '',
          type: 'mcq',
          difficulty: 'medium',
          options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
          tags: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const questionType = form.watch('type');

  useEffect(() => {
    if (initialData?.tags) {
      setSelectedTags(initialData.tags);
    }
  }, [initialData]);

  const handleAiSanityCheck = async () => {
    const questionText = form.getValues('text');
    if (!questionText) {
      toast({ variant: 'destructive', title: 'نص السؤال فارغ', description: 'الرجاء كتابة نص السؤال أولاً.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await arabicQuestionSanityCheck({ question: questionText });
      setAiSanityResult(result);
      form.setValue('aiSanityCheck', result); // Store it with the form data potentially
      toast({ title: 'فحص السلامة اللغوية', description: result.isGrammaticallyCorrect ? 'السؤال سليم لغوياً.' : 'يوجد اقتراحات للتصحيح.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'خطأ في الفحص اللغوي', description: 'فشل الاتصال بخدمة الذكاء الاصطناعي.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestTags = async () => {
    const questionText = form.getValues('text');
    if (!questionText) {
      toast({ variant: 'destructive', title: 'نص السؤال فارغ', description: 'الرجاء كتابة نص السؤال أولاً.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await suggestQuestionTags({ questionText });
      setSuggestedAiTags(result.suggestedTags);
      toast({ title: 'اقتراح التصنيفات', description: 'تم اقتراح تصنيفات جديدة.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'خطأ في اقتراح التصنيفات', description: 'فشل الاتصال بخدمة الذكاء الاصطناعي.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  useEffect(() => {
    form.setValue('tags', selectedTags);
  }, [selectedTags, form]);


  async function handleSubmit(data: QuestionFormValues) {
    setIsSubmitting(true);
    
    // Ensure correctAnswer is set correctly for non-MCQ types
    if (data.type === 'true_false') {
      // Assuming 'true' or 'false' string from select
      data.correctAnswer = data.correctAnswer === 'true';
    }
    // For fill_blanks or short_answer, correctAnswer is already a string

    const result = await onSubmit(data);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: 'تم الحفظ بنجاح!', description: initialData ? 'تم تحديث السؤال.' : 'تم إنشاء السؤال الجديد.'});
      router.push('/dashboard/questions');
      router.refresh();
    } else {
      toast({ variant: 'destructive', title: 'حدث خطأ!', description: result.error || 'فشل حفظ السؤال.' });
    }
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <HelpCircle className="h-7 w-7 text-primary" />
          {initialData ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نص السؤال</FormLabel>
                  <FormControl>
                    <Textarea placeholder="اكتب نص السؤال هنا..." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Button type="button" variant="outline" onClick={handleAiSanityCheck} disabled={isSubmitting}>
                <Wand2 className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                فحص السلامة اللغوية (AI)
              </Button>
              {aiSanityResult && (
                <div className={`p-3 rounded-md border ${aiSanityResult.isGrammaticallyCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                  <div className="flex items-center">
                    {aiSanityResult.isGrammaticallyCorrect ? <CheckCircle className="h-5 w-5 text-green-600 ml-2 rtl:mr-2 rtl:ml-0" /> : <AlertTriangle className="h-5 w-5 text-red-600 ml-2 rtl:mr-2 rtl:ml-0" />}
                    <p className="font-semibold">{aiSanityResult.isGrammaticallyCorrect ? 'السؤال سليم لغوياً.' : 'السؤال قد يحتاج إلى مراجعة:'}</p>
                  </div>
                  {!aiSanityResult.isGrammaticallyCorrect && aiSanityResult.suggestedCorrections && (
                    <p className="text-sm mt-1 text-gray-700">الاقتراحات: {aiSanityResult.suggestedCorrections}</p>
                  )}
                </div>
              )}
            </div>


            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المادة الدراسية</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المادة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع السؤال</FormLabel>
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Reset options/correctAnswer when type changes
                      form.setValue('options', value === 'mcq' ? [{text: '', isCorrect: false}, {text: '', isCorrect: false}] : undefined);
                      form.setValue('correctAnswer', value === 'true_false' ? 'true' : '');
                    }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mcq">اختيار من متعدد</SelectItem>
                      <SelectItem value="true_false">صح / خطأ</SelectItem>
                      <SelectItem value="fill_blanks">املأ الفراغات</SelectItem>
                      <SelectItem value="short_answer">إجابة قصيرة</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {questionType === 'mcq' && (
              <div className="space-y-4">
                <FormLabel>الخيارات (MCQ)</FormLabel>
                {fields.map((item, index) => (
                  <div key={item.id} className="flex items-center space-x-2 rtl:space-x-reverse p-3 border rounded-md">
                    <FormField
                      control={form.control}
                      name={`options.${index}.text`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                           <FormControl><Input placeholder={`نص الخيار ${index + 1}`} {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`options.${index}.isCorrect`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-2 rtl:space-x-reverse space-y-0">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <FormLabel className="text-sm font-normal mt-0!">صحيح؟</FormLabel>
                        </FormItem>
                      )}
                    />
                    {fields.length > 2 && <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ text: '', isCorrect: false })}>
                  <PlusCircle className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> إضافة خيار
                </Button>
                 <FormDescription>حدد الخيار (الخيارات) الصحيحة. يمكن أن يكون هناك أكثر من إجابة صحيحة.</FormDescription>
              </div>
            )}

            {questionType === 'true_false' && (
              <FormField
                control={form.control}
                name="correctAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الإجابة الصحيحة</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'true')} defaultValue={String(field.value === true || field.value === 'true')}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الإجابة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">صح</SelectItem>
                        <SelectItem value="false">خطأ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {(questionType === 'fill_blanks' || questionType === 'short_answer') && (
              <FormField
                control={form.control}
                name="correctAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الإجابة الصحيحة</FormLabel>
                    <FormControl>
                      <Input placeholder="اكتب الإجابة الصحيحة هنا" {...field} value={typeof field.value === 'boolean' ? '' : field.value} />
                    </FormControl>
                     {questionType === 'fill_blanks' && <FormDescription>إذا كان هناك عدة فراغات, افصل بين الإجابات بفاصلة (,).</FormDescription>}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الصعوبة" />
                      </SelectTrigger>
                    </FormControl>
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
            
            <div className="space-y-2">
              <FormLabel>التصنيفات (Tags)</FormLabel>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    onClick={() => toggleTag(tag.id)}
                    className="cursor-pointer"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
               <Button type="button" variant="outline" onClick={handleSuggestTags} disabled={isSubmitting}>
                <Sparkles className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                اقتراح تصنيفات (AI)
              </Button>
              {suggestedAiTags.length > 0 && (
                <div className="p-3 rounded-md border border-blue-500 bg-blue-50">
                  <p className="font-semibold">تصنيفات مقترحة من AI:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {suggestedAiTags.map(tagText => {
                      const existingTag = allTags.find(t => t.name === tagText);
                      return (
                        <Badge
                          key={tagText}
                          variant={existingTag && selectedTags.includes(existingTag.id) ? "default" : "secondary"}
                          onClick={() => {
                            if (existingTag) toggleTag(existingTag.id);
                            else toast({title: "تصنيف غير موجود", description: `التصنيف "${tagText}" غير موجود. يرجى إضافته أولاً.`})
                          }}
                          className="cursor-pointer"
                        >
                          {tagText} {existingTag ? '' : '(جديد؟)'}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              <FormDescription>اختر التصنيفات الموجودة أو استخدم AI لاقتراح تصنيفات. يمكن إضافة تصنيفات جديدة من صفحة إدارة التصنيفات.</FormDescription>
            </div>


            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                {isSubmitting ? (initialData ? 'جاري التحديث...' : 'جاري الإنشاء...') : (initialData ? 'حفظ التغييرات' : 'إنشاء السؤال')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
