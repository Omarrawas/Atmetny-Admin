
// src/components/teachers/AssignTeacherRoleForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'; 
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/hooks/use-toast';
import { getSubjects, getUserByEmail, updateUser } from '@/lib/firestore';
import type { Subject, UserProfile } from '@/types';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const assignTeacherSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صحيح." }),
  name: z.string().optional(), 
  subjects_taught_ids: z.array(z.string()).optional().default([]), 
  youtubeChannelUrl: z.string().url({ message: "الرجاء إدخال رابط URL صحيح لقناة يوتيوب." }).optional().or(z.literal('')),
});

type AssignTeacherFormValues = z.infer<typeof assignTeacherSchema>;

interface AssignTeacherRoleFormProps {
  onTeacherAssigned?: () => void;
}

export default function AssignTeacherRoleForm({ onTeacherAssigned }: AssignTeacherRoleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AssignTeacherFormValues>({
    resolver: zodResolver(assignTeacherSchema),
    defaultValues: {
      email: '',
      name: '', 
      subjects_taught_ids: [],
      youtubeChannelUrl: '',
    },
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsFetchingSubjects(true);
      try {
        const subjects = await getSubjects();
        setAllSubjects(subjects);
      } catch (error) {
        console.error("Error fetching subjects for assignment form:", error);
        toast({ variant: "destructive", title: "خطأ", description: "فشل جلب قائمة المواد." });
      } finally {
        setIsFetchingSubjects(false);
      }
    };
    fetchInitialData();
  }, [toast]);

  const onSubmit = async (data: AssignTeacherFormValues) => {
    setIsLoading(true);
    setFormError(null);
    try {
      const existingUser = await getUserByEmail(data.email);

      if (!existingUser || !existingUser.id) { 
        setFormError("لم يتم العثور على مستخدم بهذا البريد الإلكتروني. يرجى التأكد من وجود المستخدم في نظام المصادقة ولديه ملف شخصي.");
        setIsLoading(false);
        return;
      }

      const updatePayload: Partial<UserProfile> = {
        role: 'teacher',
        subjects_taught_ids: data.subjects_taught_ids && data.subjects_taught_ids.length > 0 ? data.subjects_taught_ids : null, 
        youtube_channel_url: data.youtubeChannelUrl || null,
      };

      if (data.name && data.name.trim() !== '') {
        updatePayload.name = data.name.trim(); 
      }

      await updateUser(existingUser.id, updatePayload); 

      toast({
        title: "نجاح!",
        description: `تم تعيين المستخدم ${existingUser.email} كمدرس بنجاح.`,
      });
      form.reset();
      onTeacherAssigned?.();
    } catch (error) {
      console.error("Error assigning teacher role:", error);
      setFormError("حدث خطأ أثناء محاولة تعيين دور المدرس. يرجى المحاولة مرة أخرى.");
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل تعيين دور المدرس.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-md mb-6">
      <CardHeader>
        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-1">
          <UserPlus className="h-7 w-7 text-primary" />
          <CardTitle className="text-xl font-bold">تعيين مستخدم كمدرس</CardTitle>
        </div>
        <CardDescription>أدخل بريد المستخدم الموجود لتعيينه كمدرس وإسناد المواد ورابط يوتيوب له.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني للمستخدم</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    يجب أن يكون هذا المستخدم موجودًا بالفعل في نظام المصادقة.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم العرض (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="اسم المدرس" {...field} />
                  </FormControl>
                  <FormDescription>
                    إذا ترك فارغًا، سيتم استخدام الاسم الحالي للمستخدم (إن وجد).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="youtubeChannelUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رابط قناة يوتيوب (اختياري)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://www.youtube.com/channel/..." {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormDescription>
                    أضف رابط قناة يوتيوب الخاصة بالمدرس إن وجدت.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subjects_taught_ids"
              render={() => ( 
                <FormItem>
                  <FormLabel>المواد التي سيدرسها</FormLabel>
                  <FormDescription>
                    اختر المواد التي سيتم ربطها بالمدرس.
                  </FormDescription>
                  {isFetchingSubjects ? (
                     <div className="flex items-center justify-center p-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> <span className="text-sm text-muted-foreground ml-2 rtl:mr-2">جاري تحميل المواد...</span></div>
                  ) : allSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">لا توجد مواد مضافة بعد. يرجى إضافة مواد أولاً.</p>
                  ) : (
                    <ScrollArea className="h-40 rounded-md border p-2">
                      <div className="space-y-1">
                        {allSubjects.map((subject) => (
                          <FormField
                            key={subject.id}
                            control={form.control}
                            name="subjects_taught_ids"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={subject.id}
                                  className="flex flex-row items-center space-x-2 rtl:space-x-reverse"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(subject.id!)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), subject.id!])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== subject.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <Label className="font-normal text-sm cursor-pointer">
                                    {subject.name} ({subject.branch})
                                  </Label>
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
            {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>خطأ في التعيين</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
            <Button type="submit" disabled={isLoading || isFetchingSubjects} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              )}
              تعيين كمدرس وحفظ
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
