'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Subject } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, Save } from 'lucide-react';

const subjectSchema = z.object({
  name: z.string().min(2, { message: 'اسم المادة يجب أن يكون حرفين على الأقل.' }),
  branch: z.enum(['scientific', 'literary', 'general'], { required_error: 'يجب اختيار الفرع.' }),
  description: z.string().min(10, { message: 'الوصف يجب أن يكون 10 أحرف على الأقل.' }),
  imageUrl: z.string().url({ message: 'الرجاء إدخال رابط صورة صحيح.' }).optional().or(z.literal('')),
  icon: z.string().min(1, {message: "اسم أيقونة Lucide مطلوب"}).optional().or(z.literal('')), // Example: 'BookOpen'
  imageHint: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectFormProps {
  initialData?: Subject | null;
  onSubmit: (data: SubjectFormValues) => Promise<{ success: boolean; error?: string, id?: string }>;
}

export function SubjectForm({ initialData, onSubmit }: SubjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          branch: initialData.branch,
          description: initialData.description,
          imageUrl: initialData.imageUrl || '',
          icon: initialData.icon || '',
          imageHint: initialData.imageHint || '',
        }
      : {
          name: '',
          branch: 'general',
          description: '',
          imageUrl: '',
          icon: 'BookOpen', // Default icon
          imageHint: '',
        },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: SubjectFormValues) {
    setIsSubmitting(true);
    const result = await onSubmit(data);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: 'تم الحفظ بنجاح!', description: initialData ? 'تم تحديث المادة.' : 'تم إنشاء المادة الجديدة.'});
      router.push('/dashboard/subjects');
      router.refresh(); // To show the new/updated data
    } else {
      toast({ variant: 'destructive', title: 'حدث خطأ!', description: result.error || 'فشل حفظ المادة.' });
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <BookCopy className="h-7 w-7 text-primary" />
          {initialData ? 'تعديل المادة الدراسية' : 'إضافة مادة دراسية جديدة'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المادة</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: الرياضيات" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الفرع</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفرع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scientific">علمي</SelectItem>
                      <SelectItem value="literary">أدبي</SelectItem>
                      <SelectItem value="general">عام</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Textarea placeholder="وصف موجز للمادة..." {...field} />
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
                  <FormLabel>رابط الصورة</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/image.png" {...field} dir="ltr" />
                  </FormControl>
                  <FormDescription>رابط لصورة تمثل المادة.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الأيقونة (Lucide)</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: BookOpen" {...field} dir="ltr" />
                  </FormControl>
                  <FormDescription>اسم أيقونة من مكتبة Lucide Icons. (مثال: Film, Atom, Globe).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="imageHint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تلميح الصورة (لـ AI)</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: كتاب مفتوح, معادلة كيميائية" {...field} />
                  </FormControl>
                  <FormDescription>كلمات مفتاحية (1-2 كلمة) لوصف الصورة. تستخدم للبحث عن صور بديلة.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 rtl:space-x-reverse">
               <Button type="button" variant="outline" onClick={() => router.back()}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                {isSubmitting ? (initialData ? 'جاري التحديث...' : 'جاري الإنشاء...') : (initialData ? 'حفظ التغييرات' : 'إنشاء المادة')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
