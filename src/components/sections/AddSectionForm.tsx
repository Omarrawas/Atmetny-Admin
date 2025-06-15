// src/components/sections/AddSectionForm.tsx
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addSubjectSection } from '@/lib/firestore';
import { Loader2, PlusCircle } from 'lucide-react';

const sectionSchema = z.object({
  title: z.string().min(3, "عنوان القسم يجب أن يكون 3 أحرف على الأقل."),
  type: z.enum(['theory', 'practical'], { required_error: "الرجاء اختيار نوع القسم." }),
  order: z.coerce.number().int().min(0, "الترتيب يجب أن يكون رقمًا موجبًا أو صفرًا.").optional().nullable(),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

interface AddSectionFormProps {
  subjectId: string;
  onSectionAdded?: () => void;
}

export default function AddSectionForm({ subjectId, onSectionAdded }: AddSectionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      title: '',
      type: 'theory',
      order: undefined, // Default to undefined, let placeholder show
    },
  });

  const onSubmit = async (data: SectionFormValues) => {
    setIsLoading(true);
    try {
      await addSubjectSection(subjectId, { 
        title: data.title, 
        type: data.type,
        order: data.order ?? undefined // Pass undefined if null or empty, Firestore handles this or our addDocument
      });
      toast({
        title: "نجاح!",
        description: `تمت إضافة قسم "${data.title}" بنجاح.`,
      });
      form.reset();
      onSectionAdded?.();
    } catch (error) {
      console.error("Error adding section:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت إضافة القسم.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="my-4 shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">إضافة قسم جديد للمادة</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان القسم</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: الفصل الأول - مقدمة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع القسم</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع القسم" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="theory">نظري</SelectItem>
                      <SelectItem value="practical">عملي</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ترتيب القسم (اختياري)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="مثال: 1 (للأول)، 2 (للثاني)" 
                      {...field} 
                      value={field.value === null || field.value === undefined ? '' : field.value} // Handle null/undefined for input
                      onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                      min="0"
                    />
                  </FormControl>
                  <FormDescription>
                    لتحديد ترتيب ظهور الأقسام. الأقسام بدون ترتيب قد تظهر في النهاية.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              إضافة القسم
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
