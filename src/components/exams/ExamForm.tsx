'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Exam, Question, Subject } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText, Save, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getQuestionsBySubjectId } from '@/lib/actions/questionActions'; // Server action
import { ScrollArea } from '@/components/ui/scroll-area';

const examSchema = z.object({
  title: z.string().min(3, { message: 'عنوان الامتحان يجب أن يكون 3 أحرف على الأقل.' }),
  description: z.string().min(10, { message: 'الوصف يجب أن يكون 10 أحرف على الأقل.' }),
  subjectId: z.string({ required_error: 'يجب اختيار المادة.' }),
  questionIds: z.array(z.string()).min(1, { message: 'يجب اختيار سؤال واحد على الأقل.' }),
  published: z.boolean().default(false),
  imageUrl: z.string().url({ message: 'الرجاء إدخال رابط صورة صحيح.' }).optional().or(z.literal('')),
  imageHint: z.string().optional(),
  teacherName: z.string().optional(),
  teacherId: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive({ message: 'مدة الامتحان يجب أن تكون رقمًا موجبًا.' }),
});

type ExamFormValues = z.infer<typeof examSchema>;

interface ExamFormProps {
  initialData?: Exam | null;
  subjects: Subject[];
  onSubmit: (data: ExamFormValues) => Promise<{ success: boolean; error?: string, id?: string }>;
}

export function ExamForm({ initialData, subjects, onSubmit }: ExamFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(initialData?.questionIds || []);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          imageUrl: initialData.imageUrl || '',
          imageHint: initialData.imageHint || '',
          teacherName: initialData.teacherName || '',
          teacherId: initialData.teacherId || '',
        }
      : {
          title: '',
          description: '',
          questionIds: [],
          published: false,
          durationMinutes: 60,
          imageUrl: '',
          imageHint: '',
          teacherName: '',
          teacherId: '',
        },
  });

  const watchedSubjectId = form.watch('subjectId');

  useEffect(() => {
    if (watchedSubjectId) {
      getQuestionsBySubjectId(watchedSubjectId).then(setAvailableQuestions);
    } else {
      setAvailableQuestions([]);
    }
  }, [watchedSubjectId]);
  
  useEffect(() => {
    form.setValue('questionIds', selectedQuestionIds);
  }, [selectedQuestionIds, form]);


  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
    );
  };

  async function handleSubmit(data: ExamFormValues) {
    setIsSubmitting(true);
    const result = await onSubmit(data);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: 'تم الحفظ بنجاح!', description: initialData ? 'تم تحديث الامتحان.' : 'تم إنشاء الامتحان الجديد.'});
      router.push('/dashboard/exams');
      router.refresh();
    } else {
      toast({ variant: 'destructive', title: 'حدث خطأ!', description: result.error || 'فشل حفظ الامتحان.' });
    }
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <ScrollText className="h-7 w-7 text-primary" />
          {initialData ? 'تعديل الامتحان' : 'إنشاء امتحان جديد'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان الامتحان</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: امتحان نهاية الفصل الأول" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Textarea placeholder="وصف موجز للامتحان..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المادة الدراسية</FormLabel>
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedQuestionIds([]); // Reset selected questions when subject changes
                    }} defaultValue={field.value}>
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
              name="questionIds"
              render={() => ( // We manage selectedQuestionIds separately for UI
                <FormItem>
                  <FormLabel>أسئلة الامتحان</FormLabel>
                   <FormDescription>اختر الأسئلة التي سيتم تضمينها في هذا الامتحان من المادة المحددة.</FormDescription>
                  <ScrollArea className="h-72 w-full rounded-md border p-4">
                    {availableQuestions.length > 0 ? availableQuestions.map(q => (
                      <div key={q.id} className="flex items-center space-x-2 rtl:space-x-reverse mb-2 p-2 hover:bg-accent/50 rounded-md">
                        <Checkbox
                          id={`q-${q.id}`}
                          checked={selectedQuestionIds.includes(q.id)}
                          onCheckedChange={() => toggleQuestionSelection(q.id)}
                        />
                        <label htmlFor={`q-${q.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer truncate">
                          {q.text}
                        </label>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">الرجاء اختيار مادة أولاً لعرض الأسئلة المتاحة، أو لا توجد أسئلة لهذه المادة.</p>}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة الامتحان (بالدقائق)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="60" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رابط صورة الامتحان (اختياري)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/exam-image.png" {...field} dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageHint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تلميح صورة الامتحان (لـ AI، اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: اختبار ورقي, طلاب يدرسون" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المدرس (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: أ. محمد أحمد" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* teacherId might be a select if you have a teachers collection */}
             <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>معرّف المدرس (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="معرف المدرس من نظام آخر إن وجد" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">نشر الامتحان</FormLabel>
                    <FormDescription>
                      هل تريد نشر هذا الامتحان ليكون متاحًا للطلاب؟
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                {isSubmitting ? (initialData ? 'جاري التحديث...' : 'جاري الإنشاء...') : (initialData ? 'حفظ التغييرات' : 'إنشاء الامتحان')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

