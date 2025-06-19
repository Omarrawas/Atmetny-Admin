// src/components/lessons/EditLessonForm.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog as UiDialog, // Renamed Dialog to UiDialog
  DialogContent as UiDialogContent,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
  DialogDescription as UiDialogDescription,
  DialogFooter as UiDialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent as UiCardContent } from '@/components/ui/card'; // Renamed CardContent
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as UiFormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/hooks/use-toast';
import { updateLesson, getExams } from '@/lib/firestore';
import { Loader2, Save, Trash2, PlusCircle, LinkIcon, Sigma, ListChecks, Eye, EyeOff, Lock, Unlock, Copy, Code2 } from 'lucide-react'; // Added Code2
import type { Lesson, LessonFile, LessonTeacher, Exam } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Used for LaTeX modal
import { BlockMath } from 'react-katex';
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';


const lessonTeacherSchema = z.object({
  name: z.string().min(1, "اسم المدرس مطلوب.").trim(),
  youtubeUrl: z.string().url({ message: "الرجاء إدخال رابط يوتيوب صحيح أو اتركه فارغًا." }).optional().or(z.literal('')),
});

const lessonFileSchema = z.object({
  name: z.string().min(1, "اسم الملف مطلوب.").trim(),
  url: z.string().url({ message: "الرجاء إدخال رابط URL صحيح للملف." }),
  type: z.string().min(1, "نوع الملف مطلوب (مثال: PDF, صورة).").trim(),
});

const lessonFormSchema = z.object({
  title: z.string().min(3, "عنوان الدرس يجب أن يكون 3 أحرف على الأقل."),
  videoUrl: z.string().url({ message: "الرجاء إدخال رابط فيديو صحيح أو اتركه فارغًا." }).optional().or(z.literal('')),
  content: z.string().optional(),
  teachers: z.array(lessonTeacherSchema).optional(),
  files: z.array(lessonFileSchema).optional(),
  order: z.coerce.number().int().min(0, "الترتيب يجب أن يكون رقمًا موجبًا أو صفرًا.").optional().nullable(),
  linkedExamIds: z.array(z.string()).optional().default([]),
  notes: z.string().optional().nullable(),
  isLocked: z.boolean().optional(), // No default, will be set from lessonToEdit
  interactiveAppHtml: z.string().optional().nullable(),
  interactiveAppCss: z.string().optional().nullable(),
  interactiveAppJs: z.string().optional().nullable(),
});
type LessonFormValues = z.infer<typeof lessonFormSchema>;

interface EditLessonFormProps {
  subjectId: string;
  sectionId: string;
  lessonToEdit: Lesson;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLessonUpdated: () => void;
}

export default function EditLessonForm({
  subjectId,
  sectionId,
  lessonToEdit,
  isOpen,
  onOpenChange,
  onLessonUpdated,
}: EditLessonFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [showEquationModal, setShowEquationModal] = useState(false);
  const [currentEquation, setCurrentEquation] = useState('');

  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [isFetchingExams, setIsFetchingExams] = useState(true);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {}
  });

  useEffect(() => {
    if (isOpen && lessonToEdit) {
      const initialFormValues = {
        title: lessonToEdit.title || '',
        videoUrl: lessonToEdit.videoUrl || '',
        content: lessonToEdit.content || '',
        teachers: lessonToEdit.teachers && lessonToEdit.teachers.length > 0 ? lessonToEdit.teachers : [{ name: '', youtubeUrl: '' }],
        files: lessonToEdit.files && lessonToEdit.files.length > 0 ? lessonToEdit.files : [{ name: '', url: '', type: '' }],
        order: lessonToEdit.order ?? undefined,
        linkedExamIds: lessonToEdit.linkedExamIds || [],
        notes: lessonToEdit.notes || '',
        isLocked: lessonToEdit.isLocked ?? true, // Default to locked if undefined
        interactiveAppHtml: lessonToEdit.interactiveAppHtml || '',
        interactiveAppCss: lessonToEdit.interactiveAppCss || '',
        interactiveAppJs: lessonToEdit.interactiveAppJs || '',
      };
      form.reset(initialFormValues);
    }
  }, [lessonToEdit, form, isOpen]);

  useEffect(() => {
    const fetchExamsData = async () => {
      if (!isOpen) return;
      setIsFetchingExams(true);
      try {
        const exams = await getExams();
        setAvailableExams(exams);
      } catch (error) {
        console.error("Error fetching exams:", error);
        toast({ variant: "destructive", title: "خطأ", description: "فشل في جلب قائمة الامتحانات." });
      } finally {
        setIsFetchingExams(false);
      }
    };
    fetchExamsData();
  }, [isOpen, toast]);


  const { fields: teacherFields, append: appendTeacher, remove: removeTeacher } = useFieldArray({
    control: form.control,
    name: "teachers",
  });

  const { fields: fileFields, append: appendFile, remove: removeFile } = useFieldArray({
    control: form.control,
    name: "files",
  });

  const handleCopyFormattedEquation = async () => {
    if (!currentEquation.trim()) {
      toast({
        variant: "destructive",
        title: "المعادلة فارغة",
        description: "الرجاء إدخال نص LaTeX للمعادلة أولاً.",
      });
      return;
    }
    const formattedEquation = `$$${currentEquation.trim()}$$`;
    try {
      await navigator.clipboard.writeText(formattedEquation);
      toast({
        title: "تم نسخ المعادلة",
        description: "تم نسخ المعادلة بصيغة LaTeX ($$...$$). يمكنك الآن لصقها في حقل محتوى الدرس.",
      });
      setShowEquationModal(false);
    } catch (err) {
      console.error("Failed to copy equation: ", err);
      toast({
        variant: "destructive",
        title: "فشل النسخ",
        description: "لم نتمكن من نسخ المعادلة إلى الحافظة. يمكنك نسخها يدويًا بالصيغة: $$معادلتك$$",
      });
    }
  };

  const onSubmit = async (data: LessonFormValues) => {
    if (!lessonToEdit.id) {
        toast({ variant: "destructive", title: "خطأ", description: "معرف الدرس غير موجود." });
        return;
    }
    setIsSubmitting(true);

    try {
      const validTeachers = (data.teachers || [])
        .filter(teacher => teacher.name && teacher.name.trim() !== '')
        .map(teacher => ({
          name: teacher.name.trim(),
          youtubeUrl: teacher.youtubeUrl && teacher.youtubeUrl.trim() !== '' ? teacher.youtubeUrl.trim() : null,
        }));

      const validFiles = (data.files || [])
        .filter(file => file.name && file.name.trim() !== '' && file.url && file.url.trim() !== '' && file.type && file.type.trim() !== '')
        .map(file => ({
            name: file.name.trim(),
            url: file.url.trim(),
            type: file.type.trim(),
        }));

      await updateLesson(subjectId, sectionId, lessonToEdit.id, {
        title: data.title,
        videoUrl: data.videoUrl || null,
        content: data.content || null,
        teachers: validTeachers,
        files: validFiles,
        order: data.order ?? undefined,
        linkedExamIds: data.linkedExamIds || [],
        notes: data.notes || null,
        isLocked: data.isLocked, // Pass the updated isLocked status
        interactiveAppHtml: data.interactiveAppHtml || null,
        interactiveAppCss: data.interactiveAppCss || null,
        interactiveAppJs: data.interactiveAppJs || null,
      });

      toast({
        title: "نجاح!",
        description: `تم تحديث درس "${data.title}" بنجاح.`,
      });
      onLessonUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت عملية تحديث الدرس.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <UiDialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
    }}>
      <UiDialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col bg-card p-4" dir="rtl">
        <UiDialogHeader className="text-right pt-4 pb-3 px-4 border-b">
          <UiDialogTitle>تعديل الدرس: {lessonToEdit.title}</UiDialogTitle>
          <UiDialogDescription>
            قم بتحديث تفاصيل الدرس وروابط ملفاته وإسنادات المدرسين وحالة القفل.
          </UiDialogDescription>
        </UiDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 flex-grow overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان الدرس <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="مثال: مقدمة في الهيدروكربونات" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>إسناد المدرسين (اختياري)</FormLabel>
              {teacherFields.map((item, index) => (
                <Card key={item.id} className="p-3 bg-muted/50">
                   <div className="flex flex-col sm:flex-row gap-2">
                     <div className="flex-grow space-y-1">
                        <FormField
                            control={form.control}
                            name={`teachers.${index}.name`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor={`teachers-edit.${index}.name`} className="text-xs">اسم المدرس</FormLabel>
                                <FormControl><Input placeholder="اسم المدرس" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                     </div>
                     <div className="flex-grow space-y-1">
                        <FormField
                            control={form.control}
                            name={`teachers.${index}.youtubeUrl`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor={`teachers-edit.${index}.youtubeUrl`} className="text-xs">رابط يوتيوب للمدرس (اختياري)</FormLabel>
                                <FormControl><Input type="url" placeholder="https://youtube.com/channel/..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                     </div>
                     <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTeacher(index)}
                        className="self-end mt-1 sm:mt-0"
                        disabled={teacherFields.length <=1 && !form.getValues(`teachers.${index}.name`) && !form.getValues(`teachers.${index}.youtubeUrl`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
                </Card>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendTeacher({ name: '', youtubeUrl: '' })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> إضافة إسناد مدرس آخر
              </Button>
            </div>

            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رابط فيديو الدرس الأساسي (اختياري)</FormLabel>
                  <FormControl><Input type="url" placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>محتوى الدرس (اختياري)</FormLabel>
                 <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEquationModal(true)}
                >
                  <Sigma className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> إضافة معادلة (LaTeX)
                </Button>
              </div>
                <Textarea
                  id="edit-lesson-content-editor"
                  value={form.watch('content') || ''}
                  onChange={(e) => form.setValue('content', e.target.value, { shouldValidate: true, shouldDirty: true })}
                  placeholder="اكتب شرحًا تفصيليًا للدرس هنا. لإضافة معادلات، استخدم صيغة LaTeX مثل: $$ \text{H}_2\text{O} $$"
                  rows={6}
                  className="min-h-[150px]"
                  style={{ direction: 'rtl' }}
                />
              {form.formState.errors.content && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.content.message}
                </p>
              )}
            </div>


            <div className="space-y-3">
              <FormLabel>روابط ملفات الدرس (اختياري)</FormLabel>
              {fileFields.map((item, index) => (
                <Card key={item.id} className="p-3 bg-muted/50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                     <FormField
                        control={form.control}
                        name={`files.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel htmlFor={`files-edit.${index}.name`} className="text-xs">اسم الملف/الرابط</FormLabel>
                            <FormControl><Input placeholder="مثال: ملخص الفصل" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     <FormField
                        control={form.control}
                        name={`files.${index}.url`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel htmlFor={`files-edit.${index}.url`} className="text-xs">رابط الملف (URL)</FormLabel>
                            <FormControl><Input type="url" placeholder="https://example.com/file.pdf" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <FormField
                        control={form.control}
                        name={`files.${index}.type`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel htmlFor={`files-edit.${index}.type`} className="text-xs">نوع الملف</FormLabel>
                            <FormControl><Input placeholder="مثال: PDF, صورة" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={fileFields.length <= 1 && !form.getValues(`files.${index}.name`) && !form.getValues(`files.${index}.url`) && !form.getValues(`files.${index}.type`)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendFile({ name: '', url: '', type: '' })}
              >
                <LinkIcon className="mr-2 h-4 w-4" /> إضافة رابط ملف آخر
              </Button>
            </div>

            <Card className="p-4 border bg-muted/30">
                <CardHeader className="p-0 pb-2">
                    <UiDialogTitle className="text-md flex items-center"><Code2 className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary"/> تطبيق تفاعلي (اختياري)</UiDialogTitle>
                    <UiFormDescription>عدّل كود HTML, CSS, و JavaScript للتطبيق التفاعلي ضمن الدرس.</UiFormDescription>
                </CardHeader>
                <UiCardContent className="p-0 space-y-3">
                    <FormField
                    control={form.control}
                    name="interactiveAppHtml"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm">HTML</FormLabel>
                        <FormControl><Textarea placeholder="<div>...</div>" {...field} value={field.value ?? ''} rows={5} className="font-mono text-xs" /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="interactiveAppCss"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm">CSS</FormLabel>
                        <FormControl><Textarea placeholder="body { background-color: #f0f0f0; }" {...field} value={field.value ?? ''} rows={5} className="font-mono text-xs" /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="interactiveAppJs"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm">JavaScript</FormLabel>
                        <FormControl><Textarea placeholder="console.log('Hello World!');" {...field} value={field.value ?? ''} rows={5} className="font-mono text-xs" /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </UiCardContent>
            </Card>

            <FormField
              control={form.control}
              name="linkedExamIds"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base flex items-center">
                      <ListChecks className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
                      ربط امتحانات بهذا الدرس (اختياري)
                    </FormLabel>
                    <FormMessage className="text-xs" />
                  </div>
                  {isFetchingExams ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 rtl:mr-2 text-sm text-muted-foreground">جاري تحميل الامتحانات...</span>
                    </div>
                  ) : availableExams.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">
                      لا توجد امتحانات متاحة لربطها. يمكنك <a href="/dashboard/exams/new" className="text-primary hover:underline">إضافة امتحان جديد</a> أولاً.
                    </p>
                  ) : (
                    <ScrollArea className="h-40 rounded-md border p-3">
                      <div className="space-y-2">
                        {availableExams.map((exam) => (
                           <div key={exam.id} className="flex items-center justify-between space-x-2 rtl:space-x-reverse p-1.5 rounded hover:bg-muted/50">
                             <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <Checkbox
                                id={`edit-linked-exam-${exam.id}`}
                                checked={field.value?.includes(exam.id!)}
                                onCheckedChange={(checked) => {
                                    const currentSelectedIds = field.value || [];
                                    if (checked) {
                                    field.onChange([...currentSelectedIds, exam.id!]);
                                    } else {
                                    field.onChange(currentSelectedIds.filter(id => id !== exam.id));
                                    }
                                }}
                                />
                                <Label htmlFor={`edit-linked-exam-${exam.id}`} className="font-normal text-sm cursor-pointer">
                                {exam.title}
                                </Label>
                            </div>
                            <Badge variant={exam.published ? "default" : "outline"} className={`text-xs ${exam.published ? 'bg-green-500 hover:bg-green-600' : 'border-destructive text-destructive'}`}>
                              {exam.published ? <Eye className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/> : <EyeOff className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/>}
                              {exam.published ? "منشور" : "غير منشور"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات على الدرس (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أضف أي ملاحظات إضافية حول هذا الدرس..." {...field} value={field.value ?? ''} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ترتيب الدرس (اختياري)</FormLabel>
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
                  <UiFormDescription>
                    لتحديد ترتيب ظهور هذا الدرس ضمن القسم. الأرقام الأصغر تظهر أولاً.
                    الدروس بدون ترتيب محدد قد تظهر في النهاية.
                  </UiFormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isLocked"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium flex items-center">
                      {field.value ? <Lock className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-orange-500" /> : <Unlock className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-green-500" />}
                      {field.value ? "الدرس مغلق حاليًا" : "الدرس مفتوح حاليًا"}
                    </FormLabel>
                    <UiFormDescription className="text-xs">
                      {field.value ? "لن يتمكن الطلاب من الوصول لهذا الدرس إلا بعد تفعيل المادة (ما لم يكن الدرس الأول في القسم)." : "هذا الدرس متاح حاليًا للطلاب (أو إذا كان الدرس الأول في القسم)."}
                    </UiFormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Toggle lesson lock status"
                    />
                  </FormControl>
                </FormItem>
              )}
            />


            <UiDialogFooter className="flex-row-reverse pt-4">
              <Button type="submit" disabled={isSubmitting || isFetchingExams}>
                {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                حفظ التغييرات
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  إلغاء
                </Button>
              </DialogClose>
            </UiDialogFooter>
          </form>
        </Form>

        {showEquationModal && (
          <Dialog open={showEquationModal} onOpenChange={setShowEquationModal}>
            <DialogContent dir="rtl">
              <DialogHeader className="text-right">
                <DialogTitle>إضافة معادلة LaTeX</DialogTitle>
                <UiDialogDescription>
                  أدخل صيغة LaTeX للمعادلة. سيتم عرض معاينة أدناه. انقر "نسخ" ثم الصقها في محرر محتوى الدرس.
                </UiDialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Input
                  value={currentEquation}
                  onChange={(e) => setCurrentEquation(e.target.value)}
                  placeholder="مثال: \\text{H}_2\\text{O} + \\text{CO}_2 \\rightarrow \\text{H}_2\\text{CO}_3"
                  className="text-left ltr"
                />
                <Label>معاينة:</Label>
                <div className="mt-1 p-2 border rounded min-h-[40px] bg-muted/50 flex items-center justify-center">
                  {currentEquation.trim() ? (
                    <BlockMath math={String.raw`${currentEquation.trim()}`} errorColor={'#EF4444'} />
                  ) : (
                    <span className="text-xs text-muted-foreground">أدخل LaTeX للمعاينة</span>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-row-reverse">
                 <Button onClick={handleCopyFormattedEquation}>
                    <Copy className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> نسخ المعادلة المنسقة
                 </Button>
                 <Button variant="outline" onClick={() => setShowEquationModal(false)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      </UiDialogContent>
    </UiDialog>
  );
}
