// src/components/subjects/AddSubjectForm.tsx
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addSubject } from '@/lib/firestore';
import { uploadFile } from '@/lib/storage'; // Import the uploadFile function
import { Loader2, BookPlus, Upload } from 'lucide-react'; 
import type { SubjectBranch } from '@/types';


const subjectSchema = z.object({
  name: z.string().min(3, "اسم المادة يجب أن يكون 3 أحرف على الأقل.").max(100, "اسم المادة طويل جدًا (100 حرف كحد أقصى)."),
  description: z.string().max(500, "وصف المادة طويل جدًا (500 حرف كحد أقصى).").optional(),
  branch: z.enum(['scientific', 'literary', 'general'], { required_error: "الرجاء اختيار الفرع." }),
  iconName: z.string().max(50, "اسم الأيقونة طويل جدًا.").optional().nullable(),
  imageHint: z.string().max(100, "تلميح الصورة طويل جدًا.").optional().nullable(),
  image: z.string().url({ message: "الرجاء إدخال رابط صورة صحيح أو اتركه فارغًا." }).optional().or(z.literal('')),
  order: z.coerce.number().int().min(0, "الترتيب يجب أن يكون رقمًا صحيحًا موجبًا أو صفرًا.").optional().nullable(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface AddSubjectFormProps {
  onSubjectAdded?: (subjectId: string) => void;
}

const branchOptions: { label: string; value: SubjectBranch }[] = [
  { label: "عام", value: "general" },
  { label: "علمي", value: "scientific" },
  { label: "أدبي", value: "literary" },
];

export default function AddSubjectForm({ onSubjectAdded }: AddSubjectFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
      branch: 'general',
      iconName: '',
      imageHint: '',
      image: '',
      order: undefined,
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Use the 'subjectimages' bucket as defined in the policy
      const publicUrl = await uploadFile(file, 'subjectimages', 'subjects');
      form.setValue('image', publicUrl, { shouldValidate: true, shouldDirty: true });
      toast({ title: "نجاح", description: "تم رفع الصورة بنجاح." });
    } catch (error) {
      console.error("Error uploading subject image:", error);
      toast({ variant: "destructive", title: "خطأ في الرفع", description: "فشلت عملية رفع الصورة. يرجى المحاولة مرة أخرى." });
    } finally {
      setIsUploading(false);
    }
  };


  const onSubmit = async (data: SubjectFormValues) => {
    setIsLoading(true);
    
    try {
      const subjectId = await addSubject({
        name: data.name,
        description: data.description || '',
        branch: data.branch,
        image: data.image || null, 
        iconName: data.iconName || null,
        imageHint: data.imageHint || null,
        order: data.order ?? undefined,
      });
      toast({
        title: "نجاح!",
        description: `تمت إضافة المادة "${data.name}" (${data.branch}) بنجاح.`,
      });
      form.reset();
      
      if (onSubjectAdded) {
        onSubjectAdded(subjectId);
      }
    } catch (error: any) {
      let errorMessage = "فشلت إضافة المادة. يرجى المحاولة مرة أخرى.";
      if (error && typeof error === 'object') {
        console.error("Error adding subject (details):", error);
        if (error.message) errorMessage = `فشل إضافة المادة: ${error.message}`;
      } else {
        console.error("Error adding subject (unknown type):", error);
      }
      toast({
        variant: "destructive",
        title: "خطأ",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم المادة</FormLabel>
              <FormControl>
                <Input placeholder="مثال: الرياضيات، الفيزياء" {...field} />
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
                  {branchOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>وصف المادة (اختياري)</FormLabel>
              <FormControl>
                <Textarea placeholder="أدخل وصفًا موجزًا للمادة..." {...field} rows={3} />
              </FormControl>
              <FormDescription>
                سيساعد هذا الوصف الطلاب على فهم محتوى المادة.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="iconName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم الأيقونة (اختياري)</FormLabel>
              <FormControl>
                <Input placeholder="مثال: BookOpen (من Lucide Icons)" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                  اسم أيقونة من مكتبة <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Lucide Icons</a> لتمثيل المادة.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="space-y-2">
            <FormField
            control={form.control}
            name="image"
            render={({ field }) => ( 
                <FormItem>
                <FormLabel>رابط صورة المادة (اختياري)</FormLabel>
                <FormControl>
                    <Input 
                    type="url" 
                    placeholder="https://example.com/image.png" 
                    {...field} 
                    value={field.value ?? ''}
                    />
                </FormControl>
                <FormDescription>
                    أدخل رابط URL مباشر أو ارفع صورة باستخدام الزر أدناه.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="relative">
                <Button type="button" variant="outline" disabled={isUploading} onClick={() => document.getElementById('subject-image-upload-new')?.click()}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? 'جاري الرفع...' : 'رفع صورة للمادة'}
                </Button>
                <input
                    type="file"
                    id="subject-image-upload-new"
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                />
            </div>
        </div>
        <FormField
          control={form.control}
          name="imageHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>تلميح الصورة (اختياري)</FormLabel>
              <FormControl>
                <Input placeholder="مثال: 'كتاب مفتوح' أو 'معادلات كيميائية'" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                كلمات مفتاحية (1-2 كلمة) للمساعدة في البحث عن صورة مناسبة إذا لم يتم توفير رابط.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ترتيب المادة (اختياري)</FormLabel>
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
              <FormDescription>
                لتحديد ترتيب عرض هذه المادة. المواد ذات الأرقام الأصغر تظهر أولاً.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading || isUploading} className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BookPlus className="mr-2 h-4 w-4" />
          )}
          إضافة المادة
        </Button>
      </form>
    </Form>
  );
}
