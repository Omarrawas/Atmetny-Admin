// src/app/dashboard/subjects/edit/[id]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSubjectById, updateSubject } from '@/lib/firestore';
import { uploadFile, deleteFileByUrl } from '@/lib/storage';
import { Loader2, BookUser, Save, Trash2, Upload } from 'lucide-react';
import type { Subject, SubjectBranch } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';

const subjectSchema = z.object({
  name: z.string().min(3, "اسم المادة يجب أن يكون 3 أحرف على الأقل.").max(100, "اسم المادة طويل جدًا (100 حرف كحد أقصى)."),
  description: z.string().max(500, "وصف المادة طويل جدًا (500 حرف كحد أقصى).").optional(),
  branch: z.enum(['scientific', 'literary', 'general'], { required_error: "الرجاء اختيار الفرع." }),
  iconName: z.string().max(50, "اسم الأيقونة طويل جدًا.").optional().nullable(),
  imageHint: z.string().max(100, "تلميح الصورة طويل جدًا.").optional().nullable(),
  image: z.string().url({ message: "الرجاء إدخال رابط صورة صحيح أو اتركه فارغًا." }).optional().or(z.literal('')),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

const branchOptions: { label: string; value: SubjectBranch }[] = [
  { label: "عام", value: "general" },
  { label: "علمي", value: "scientific" },
  { label: "أدبي", value: "literary" },
];

const isValidUrl = (urlString?: string | null): boolean => {
  if (!urlString || urlString.trim() === '') return false;
  try {
    if (urlString.startsWith('data:image/')) return true;
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};


export default function EditSubjectPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null | undefined>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null | undefined>(null);

  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
      branch: 'general',
      iconName: '',
      imageHint: '',
      image: '',
    },
  });

  const watchedImage = form.watch("image");

  useEffect(() => {
    setCurrentImageUrl(watchedImage);
  }, [watchedImage]);

  useEffect(() => {
    const subjectIdFromParams = params?.id as string;
    if (!subjectIdFromParams) {
        setIsFetching(false);
        toast({ variant: "destructive", title: "خطأ", description: "معرّف المادة غير موجود." });
        router.push('/dashboard/subjects');
        return;
    };
    
    const fetchSubjectData = async () => {
      setIsFetching(true);
      try {
        const subjectData = await getSubjectById(subjectIdFromParams);
        if (subjectData) {
          const imageUrl = subjectData.image || '';
          form.reset({
            name: subjectData.name,
            description: subjectData.description || '',
            branch: subjectData.branch,
            iconName: subjectData.iconName || '',
            imageHint: subjectData.imageHint || '',
            image: imageUrl, 
          });
          setOriginalImageUrl(imageUrl);
        } else {
          toast({ variant: "destructive", title: "خطأ", description: "المادة غير موجودة." });
          router.push('/dashboard/subjects');
        }
      } catch (error) {
        console.error("Error fetching subject:", error);
        toast({ variant: "destructive", title: "خطأ", description: "فشل في جلب بيانات المادة." });
      } finally {
        setIsFetching(false);
      }
    };
    fetchSubjectData();
  }, [params, form, router, toast]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await uploadFile(file, 'subjectimages', 'subjects');
      form.setValue('image', publicUrl, { shouldValidate: true, shouldDirty: true });
      toast({ title: "نجاح", description: "تم رفع الصورة الجديدة بنجاح." });
    } catch (error) {
      console.error("Error uploading new subject image:", error);
      toast({ variant: "destructive", title: "خطأ في الرفع", description: "فشلت عملية رفع الصورة. يرجى المحاولة مرة أخرى." });
    } finally {
      setIsUploading(false);
    }
  };


  const handleRemoveCurrentImage = async () => {
    form.setValue('image', ''); 
    toast({ title: "تم", description: "تم مسح رابط الصورة. سيتم حفظ التغيير عند الضغط على 'حفظ التغييرات'." });
  };


  const onSubmit = async (data: SubjectFormValues) => {
    const subjectIdFromParams = params?.id as string;
    if (!subjectIdFromParams) return;
    setIsLoading(true);
    
    try {
       // If the image URL has changed from the original and the original was not empty, delete the old file
      if (originalImageUrl && data.image !== originalImageUrl) {
        await deleteFileByUrl(originalImageUrl);
        toast({ title: "تنظيف", description: "تم حذف الصورة القديمة من المخزن." });
      }

      await updateSubject(subjectIdFromParams, {
        name: data.name,
        description: data.description || '',
        branch: data.branch,
        iconName: data.iconName || null,
        imageHint: data.imageHint || null,
        image: data.image || null, 
      });
      toast({
        title: "نجاح!",
        description: `تم تحديث المادة "${data.name}" بنجاح.`,
      });
      router.push('/dashboard/subjects'); 
    } catch (error) {
      console.error("Error updating subject:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت عملية تحديث المادة. يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 mb-2 rtl:space-x-reverse">
          <BookUser className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">تعديل المادة الدراسية</CardTitle>
        </div>
        <CardDescription>قم بتحديث تفاصيل المادة الدراسية الحالية.</CardDescription>
      </CardHeader>
      <CardContent>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

             <FormItem>
              <FormLabel>صورة المادة الحالية</FormLabel>
              {isValidUrl(currentImageUrl) ? (
                <div className="mt-2">
                  <NextImage key={currentImageUrl || 'no-image-key'} src={currentImageUrl!} alt="الصورة الحالية للمادة" width={128} height={128} className="h-32 w-auto rounded-md object-cover border" data-ai-hint={form.getValues("imageHint") || "subject education"} />
                </div>
              ) : <p className="text-sm text-muted-foreground mt-1">لا يوجد صورة حالية.</p>}
            </FormItem>

            <div className="space-y-2">
                <FormField
                control={form.control}
                name="image"
                render={({ field }) => ( 
                    <FormItem>
                    <FormLabel>{isValidUrl(currentImageUrl) ? 'تغيير صورة المادة' : 'إضافة صورة للمادة'}</FormLabel>
                    <FormControl>
                        <Input 
                        type="url" 
                        placeholder="https://example.com/image.png" 
                        {...field} 
                        value={field.value ?? ''}
                        />
                    </FormControl>
                     <FormDescription>
                        أدخل رابط URL مباشر أو ارفع صورة جديدة باستخدام الزر أدناه.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="relative flex gap-2">
                    <Button type="button" variant="outline" disabled={isUploading} onClick={() => document.getElementById('subject-image-upload-edit')?.click()}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploading ? 'جاري الرفع...' : 'رفع صورة جديدة'}
                    </Button>
                    {isValidUrl(currentImageUrl) && (
                        <Button type="button" variant="destructive" size="sm" onClick={handleRemoveCurrentImage} disabled={isLoading || isUploading}>
                            <Trash2 className="mr-2 h-4 w-4" /> مسح الصورة الحالية
                        </Button>
                    )}
                    <input
                        type="file"
                        id="subject-image-upload-edit"
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
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading || isUploading}>
                    إلغاء
                </Button>
                <Button type="submit" disabled={isLoading || isUploading}>
                {isLoading || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" /> }
                حفظ التغييرات
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
