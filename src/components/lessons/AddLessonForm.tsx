
// src/components/lessons/AddLessonForm.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addLesson, getExams } from '@/lib/firestore';
import { Loader2, PlusCircle, Trash2, LinkIcon, Sigma, ListChecks, Eye, EyeOff, Lock, Unlock, Copy, Code2 } from 'lucide-react';
import type { LessonFile, LessonTeacher, Exam } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as UiDialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BlockMath } from 'react-katex';
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";


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
  isLocked: z.boolean().optional().default(true),
  interactiveAppContent: z.string().optional().nullable(), // Consolidated field
});
type LessonFormValues = z.infer<typeof lessonFormSchema>;

interface AddLessonFormProps {
  subjectId: string;
  sectionId: string;
  onLessonAdded?: () => void;
}

export default function AddLessonForm({ subjectId, sectionId, onLessonAdded }: AddLessonFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [showEquationModal, setShowEquationModal] = useState(false);
  const [currentEquation, setCurrentEquation] = useState('');

  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [isFetchingExams, setIsFetchingExams] = useState(true);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: '',
      videoUrl: '',
      content: '',
      teachers: [{ name: '', youtubeUrl: '' }],
      files: [{ name: '', url: '', type: '' }],
      order: undefined,
      linkedExamIds: [],
      notes: '',
      isLocked: true,
      interactiveAppContent: '',
    },
  });

  useEffect(() => {
    const fetchExamsData = async () => {
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
  }, [toast]);


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
    if (!data.title.trim()) {
        form.setError("title", { type: "manual", message: "عنوان الدرس مطلوب." });
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

      await addLesson(subjectId, sectionId, {
        title: data.title,
        videoUrl: data.videoUrl || null,
        content: data.content || null,
        teachers: validTeachers,
        files: validFiles,
        order: data.order ?? undefined,
        linkedExamIds: data.linkedExamIds || [],
        notes: data.notes || null,
        isLocked: data.isLocked,
        interactiveAppContent: data.interactiveAppContent || null,
      });

      toast({
        title: "نجاح!",
        description: `تمت إضافة درس "${data.title}" بنجاح.`,
      });
      form.reset();
      onLessonAdded?.();
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت إضافة الدرس.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-3 mb-4 shadow-sm border border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-md">إضافة درس جديد للقسم</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
              <Label>إسناد المدرسين (اختياري)</Label>
              {teacherFields.map((item, index) => (
                <Card key={item.id} className="p-3 bg-muted/50">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-grow space-y-1">
                       <FormField
                        control={form.control}
                        name={`teachers.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor={`teachers.${index}.name`} className="text-xs">اسم المدرس</FormLabel>
                            <FormControl><Input placeholder="اسم المدرس (مثال: أ. فلان الفلاني)" {...field} /></FormControl>
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
                            <FormLabel htmlFor={`teachers.${index}.youtubeUrl`} className="text-xs">رابط يوتيوب للمدرس (اختياري)</FormLabel>
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
                        disabled={teacherFields.length <= 1 && !form.getValues(`teachers.${index}.name`) && !form.getValues(`teachers.${index}.youtubeUrl`) }
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
                id="lesson-content-editor"
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
              <Label>روابط ملفات الدرس (اختياري)</Label>
              {fileFields.map((item, index) => (
                <Card key={item.id} className="p-3 bg-muted/50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                     <FormField
                        control={form.control}
                        name={`files.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel htmlFor={`files.${index}.name`} className="text-xs">اسم الملف/الرابط</FormLabel>
                            <FormControl><Input placeholder="مثال: ملخص الفصل الأول" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     <FormField
                        control={form.control}
                        name={`files.${index}.url`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel htmlFor={`files.${index}.url`} className="text-xs">رابط الملف (URL)</FormLabel>
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
                            <FormLabel htmlFor={`files.${index}.type`} className="text-xs">نوع الملف</FormLabel>
                            <FormControl><Input placeholder="مثال: PDF, صورة, فيديو" {...field} /></FormControl>
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
                    <CardTitle className="text-md flex items-center"><Code2 className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary"/> تطبيق تفاعلي (اختياري)</CardTitle>
                    <FormDescription>أضف كود HTML كامل (بما في ذلك وسوم style و script إذا لزم الأمر) لإنشاء تطبيق تفاعلي ضمن الدرس.</FormDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                    <FormField
                    control={form.control}
                    name="interactiveAppContent"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm sr-only">محتوى التطبيق التفاعلي</FormLabel>
                        <FormControl><Textarea placeholder="<style>...</style><div>...</div><script>...</script>" {...field} value={field.value ?? ''} rows={10} className="font-mono text-xs" /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
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
                                id={`linked-exam-${exam.id}`}
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
                                <Label htmlFor={`linked-exam-${exam.id}`} className="font-normal text-sm cursor-pointer">
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
                      {field.value ? "مبدئيًا مغلق" : "مبدئيًا مفتوح"}
                    </FormLabel>
                    <FormDescription className="text-xs">
                      {field.value ? "سيكون هذا الدرس مقفلاً بشكل افتراضي (سيتم فتح الدرس الأول في القسم تلقائيًا)." : "سيكون هذا الدرس متاحًا للجميع بشكل افتراضي."}
                    </FormDescription>
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


            <Button type="submit" disabled={isSubmitting || isFetchingExams} size="sm">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              إضافة الدرس
            </Button>
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

      </CardContent>
    </Card>
  );
}
