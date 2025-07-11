// src/app/dashboard/exams/new/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { addExam, getQuestions, getSubjects, getTags } from '@/lib/firestore';
import type { Question, Subject, Tag } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, ClipboardPlus, AlertTriangle, BookCopy, TagsIcon, Search, Eye, EyeOff, Image as ImageIcon, User, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const examSchema = z.object({
  title: z.string().min(3, "عنوان الامتحان يجب أن يكون 3 أحرف على الأقل."),
  description: z.string().optional(),
  subjectId: z.string({ required_error: "الرجاء اختيار المادة الدراسية." }),
  selectedQuestionIds: z.array(z.string()).min(1, "يجب اختيار سؤال واحد على الأقل."),
  published: z.boolean().optional().default(false),
  image: z.string().url({ message: "الرجاء إدخال رابط صورة صحيح أو اتركه فارغًا." }).optional().or(z.literal('')),
  imageHint: z.string().max(50, "تلميح الصورة لا يمكن أن يتجاوز 50 حرفًا.").optional(),
  teacherName: z.string().max(100, "اسم الأستاذ طويل جدًا.").optional().nullable(),
  teacherId: z.string().max(100, "معرف الأستاذ طويل جدًا.").optional().nullable(),
  durationInMinutes: z.coerce.number().int().min(1, "مدة الاختبار يجب أن تكون دقيقة واحدة على الأقل.").optional().nullable(),
});

type ExamFormValues = z.infer<typeof examSchema>;
type TagWithCount = Tag & { questionCount?: number };

export default function NewExamPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(true);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(true);
  const [isFetchingTags, setIsFetchingTags] = useState(true);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);

  const [rawAvailableTags, setRawAvailableTags] = useState<Tag[]>([]);
  const [tagsWithCounts, setTagsWithCounts] = useState<TagWithCount[]>([]);

  const [selectedFilterTagIds, setSelectedFilterTagIds] = useState<string[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [selectAllChecked, setSelectAllChecked] = useState<boolean | "indeterminate">(false);


  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      description: '',
      subjectId: undefined,
      selectedQuestionIds: [],
      published: false,
      image: '',
      imageHint: '',
      teacherName: '',
      teacherId: '',
      durationInMinutes: null,
    },
  });

  const selectedQuestionIds = form.watch("selectedQuestionIds");
  const publishedStatus = form.watch("published");

  const fetchInitialData = useCallback(async () => {
    if (!user || !userProfile) return;
    
    setIsFetchingQuestions(true);
    setIsFetchingSubjects(true);
    setIsFetchingTags(true);
    try {
      const [questions, subjects, tags] = await Promise.all([
        getQuestions(user.id, userProfile.role),
        getSubjects(user.id, userProfile.role),
        getTags()
      ]);
      setAvailableQuestions(questions);
      setAvailableSubjects(subjects);
      setRawAvailableTags(tags);
    } catch (error) {
      console.error("Error fetching initial data for exam:", error);
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: "لم نتمكن من تحميل قائمة الأسئلة أو المواد أو التصنيفات المتاحة.",
      });
    } finally {
      setIsFetchingQuestions(false);
      setIsFetchingSubjects(false);
      setIsFetchingTags(false);
    }
  }, [toast, user, userProfile]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (availableQuestions.length > 0 && rawAvailableTags.length > 0) {
      const counts: Record<string, number> = {};
      availableQuestions.forEach(question => {
        question.tagIds?.forEach(tagId => {
          counts[tagId] = (counts[tagId] || 0) + 1;
        });
      });
      const newTagsWithCounts = rawAvailableTags.map(tag => ({
        ...tag,
        questionCount: counts[tag.id!] || 0,
      }));
      setTagsWithCounts(newTagsWithCounts);
    } else if (rawAvailableTags.length > 0) {
      // No questions, so all counts are 0
       const newTagsWithCounts = rawAvailableTags.map(tag => ({
        ...tag,
        questionCount: 0,
      }));
      setTagsWithCounts(newTagsWithCounts);
    } else {
        setTagsWithCounts([]);
    }
  }, [availableQuestions, rawAvailableTags]);


  const handleTagFilterChange = (tagId: string) => {
    setSelectedFilterTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const filteredDisplayTags = useMemo(() => {
    if (!tagSearchTerm.trim()) {
      return tagsWithCounts;
    }
    return tagsWithCounts.filter(tag =>
      tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
    );
  }, [tagsWithCounts, tagSearchTerm]);

  const filteredQuestions = useMemo(() => {
    if (selectedFilterTagIds.length === 0) {
      return availableQuestions;
    }
    return availableQuestions.filter(question =>
      question.tagIds && question.tagIds.some(tagId => selectedFilterTagIds.includes(tagId))
    );
  }, [availableQuestions, selectedFilterTagIds]);

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      setSelectAllChecked(false);
    } else if (selectedQuestionIds.length === 0) {
      setSelectAllChecked(false);
    } else if (selectedQuestionIds.length === filteredQuestions.length) {
      setSelectAllChecked(true);
    } else {
      setSelectAllChecked("indeterminate");
    }
  }, [selectedQuestionIds, filteredQuestions]);

  const handleToggleSelectAllFilteredQuestions = () => {
    if (filteredQuestions.length === 0) return;

    if (selectAllChecked === true) { // If all are selected, deselect all
      form.setValue("selectedQuestionIds", []);
    } else { // Otherwise (none or some selected), select all filtered
      form.setValue("selectedQuestionIds", filteredQuestions.map(q => q.id!));
    }
  };


  const onSubmit = async (data: ExamFormValues) => {
    setIsLoading(true);
    try {
      // The data passed to addExam now matches its new signature in firestore.ts
      await addExam({
        title: data.title,
        description: data.description || '',
        subjectId: data.subjectId,
        // 'questionIds' here is the array of selected question IDs from the form
        // The addExam function in firestore.ts will handle creating entries in 'exam_questions'
        questionIds: data.selectedQuestionIds,
        published: data.published,
        image: data.image || null,
        imageHint: data.imageHint || null,
        teacherName: data.teacherName || null,
        teacherId: data.teacherId || null,
        durationInMinutes: data.durationInMinutes ?? null,
      });
      toast({
        title: "نجاح!",
        description: "تمت إضافة الامتحان الجديد بنجاح.",
      });
      router.push('/dashboard/exams');
    } catch (error: any) {
      console.error("Error adding exam (raw):", error);
      try {
        console.error("Error adding exam (stringified):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e) {
        console.error("Could not stringify error during exam addition:", e);
      }
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message || "فشلت إضافة الامتحان الجديد. تحقق من الكونسول لمزيد من التفاصيل.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allDataFetched = !isFetchingQuestions && !isFetchingSubjects && !isFetchingTags;

  return (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <ClipboardPlus className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">إضافة امتحان جديد</CardTitle>
        </div>
        <CardDescription>املأ تفاصيل الامتحان الجديد واختر الأسئلة والمادة الدراسية وحالة النشر والصورة.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان الامتحان</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: امتحان نهاية الفصل الأول في الرياضيات" {...field} />
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
                  <FormLabel>وصف الامتحان (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أدخل وصفًا موجزًا للامتحان..." {...field} rows={3} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isFetchingSubjects || availableSubjects.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المادة الدراسية للامتحان" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isFetchingSubjects ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 rtl:mr-2">جاري تحميل المواد...</span>
                        </div>
                      ) : availableSubjects.length === 0 ? (
                         <div className="p-4 text-center text-muted-foreground">لا توجد مواد مضافة. يرجى <a href="/dashboard/subjects" className="text-primary hover:underline">إضافة مادة</a> أولاً.</div>
                      ) : (
                        availableSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id!}>
                            {subject.name} ({subject.branch})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="teacherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <User className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      اسم الأستاذ (اختياري)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: أ. فلان الفلاني" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationInMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      مدة الاختبار (بالدقائق)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="مثال: 90"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                        min="1"
                      />
                    </FormControl>
                     <FormDescription>أدخل عدد الدقائق المخصصة للاختبار.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>معرف الأستاذ (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="معرف داخلي للأستاذ إن وجد" {...field} value={field.value ?? ''} />
                    </FormControl>
                     <FormDescription>
                      يمكن استخدام هذا الحقل لاحقًا لربط الاختبار بأستاذ معين بشكل برمجي.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <ImageIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/>
                    رابط صورة الامتحان (اختياري)
                  </FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/exam-image.png" {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormDescription>
                    ضع رابطًا مباشرًا للصورة التي تود عرضها مع الامتحان.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageHint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تلميح الصورة (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: 'جدول دوري' أو 'معادلات رياضية'" {...field} value={field.value ?? ''}/>
                  </FormControl>
                   <FormDescription>
                    كلمة أو كلمتين لوصف الصورة. ستُستخدم كـ `data-ai-hint`.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center">
                      {publishedStatus ? <Eye className="mr-2 h-4 w-4 text-green-500 rtl:ml-2 rtl:mr-0"/> : <EyeOff className="mr-2 h-4 w-4 text-red-500 rtl:ml-2 rtl:mr-0"/>}
                      حالة النشر
                    </FormLabel>
                    <FormDescription>
                      {publishedStatus ? "الامتحان سيكون ظاهرًا للطلاب." : "الامتحان سيكون مخفيًا عن الطلاب."}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Toggle exam publication status"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label className="text-base flex items-center">
                <TagsIcon className="mr-2 h-5 w-5 text-primary rtl:ml-2 rtl:mr-0" />
                تصفية الأسئلة حسب التصنيف (اختياري)
              </Label>
              {isFetchingTags ? (
                <div className="flex items-center p-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 rtl:mr-2 text-sm text-muted-foreground">جاري تحميل التصنيفات...</span>
                </div>
              ) : tagsWithCounts.length === 0 && !isFetchingTags ? (
                <p className="text-sm text-muted-foreground p-2">لا توجد تصنيفات متاحة. يمكنك إضافة تصنيفات من <a href="/dashboard/tags" className="text-primary hover:underline">صفحة التصنيفات</a>.</p>
              ) : (
                <>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="ابحث عن تصنيف..."
                      value={tagSearchTerm}
                      onChange={(e) => setTagSearchTerm(e.target.value)}
                      className="pl-10 rtl:pr-10"
                    />
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:right-3 rtl:left-auto" />
                  </div>
                  <ScrollArea className="h-32 rounded-md border p-3 mt-2">
                    {filteredDisplayTags.length === 0 && tagSearchTerm ? (
                       <p className="text-sm text-muted-foreground text-center py-2">لا توجد تصنيفات تطابق بحثك.</p>
                    ) : filteredDisplayTags.length === 0 ? (
                       <p className="text-sm text-muted-foreground text-center py-2">لا توجد تصنيفات متاحة.</p>
                    ) : (
                      <div className="space-y-1">
                        {filteredDisplayTags.map((tag) => (
                          <div key={tag.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                            <Checkbox
                              id={`filter-tag-${tag.id}`}
                              checked={selectedFilterTagIds.includes(tag.id!)}
                              onCheckedChange={() => handleTagFilterChange(tag.id!)}
                            />
                            <Label htmlFor={`filter-tag-${tag.id}`} className="font-normal text-sm cursor-pointer">
                              {tag.name} ({tag.questionCount ?? 0})
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </>
              )}
            </div>


            <FormField
              control={form.control}
              name="selectedQuestionIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">أسئلة الامتحان</FormLabel>
                    <FormDescription>
                      اختر الأسئلة التي تريد تضمينها في هذا الامتحان.
                    </FormDescription>
                  </div>

                  <div className="mb-3 p-3 border rounded-md bg-muted/50 flex items-center justify-between text-sm">
                    <div className='flex items-center gap-4'>
                        <span className="text-muted-foreground">
                            الأسئلة المتاحة: {filteredQuestions.length}
                        </span>
                        <span className="text-muted-foreground">
                            المحدد: {selectedQuestionIds.length}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Checkbox
                        id="select-all-questions"
                        checked={selectAllChecked}
                        onCheckedChange={handleToggleSelectAllFilteredQuestions}
                        disabled={filteredQuestions.length === 0}
                        aria-label={selectAllChecked === true ? "إلغاء تحديد الكل" : "تحديد الكل"}
                        />
                        <Label htmlFor="select-all-questions" className="font-normal text-sm cursor-pointer">
                        {selectAllChecked === true ? "إلغاء تحديد الكل" : "تحديد الكل"}
                        </Label>
                    </div>
                  </div>

                  {isFetchingQuestions ? (
                     <div className="flex items-center justify-center h-32">
                       <Loader2 className="h-8 w-8 animate-spin text-primary" />
                       <p className="ml-2 rtl:mr-2">جاري تحميل الأسئلة...</p>
                     </div>
                  ) : availableQuestions.length === 0 ? (
                    <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300">
                        <AlertTriangle className="h-4 w-4 !text-yellow-700 dark:!text-yellow-300" />
                        <AlertTitle>لا توجد أسئلة متاحة</AlertTitle>
                        <AlertDescription>
                        لا توجد أسئلة في النظام حاليًا. يرجى <a href="/dashboard/questions/new" className="font-medium text-yellow-800 dark:text-yellow-200 hover:underline">إضافة بعض الأسئلة</a> أولاً.
                        </AlertDescription>
                    </Alert>
                  ) : filteredQuestions.length === 0 && (selectedFilterTagIds.length > 0 || availableQuestions.length > 0) ? (
                     <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300">
                        <BookCopy className="h-4 w-4 !text-blue-700 dark:!text-blue-300" />
                        <AlertTitle>لا توجد أسئلة تطابق المعايير</AlertTitle>
                        <AlertDescription>
                        لا توجد أسئلة تطابق معايير التصفية المختارة. حاول تغيير أو إزالة بعض الفلاتر.
                        </AlertDescription>
                    </Alert>
                  ) : (
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                      {filteredQuestions.map((question) => (
                        <FormField
                          key={question.id}
                          control={form.control}
                          name="selectedQuestionIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={question.id}
                                className="flex flex-row items-start space-x-3 space-y-0 rtl:space-x-reverse mb-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(question.id!)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), question.id!])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== question.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm flex-1 cursor-pointer">
                                  <p className="font-medium text-foreground">{question.questionText}</p>
                                  <p className="text-xs text-muted-foreground">المادة: {question.subject} | الصعوبة: {question.difficulty}</p>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </ScrollArea>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading || !allDataFetched || availableQuestions.length === 0 || availableSubjects.length === 0}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" /> : <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />}
                إضافة الامتحان
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
