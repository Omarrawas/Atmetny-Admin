import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getExams, deleteExam as deleteExamFromDb, getSubject } from '@/lib/firestore';
import type { Exam } from '@/types';
import { PlusCircle, Edit, Trash2, ScrollTextIcon, Badge } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';

async function deleteExamAction(id: string) {
  'use server';
  try {
    await deleteExamFromDb(id);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete exam:", error);
    return { success: false, error: "Failed to delete exam" };
  }
}

export default async function ExamsPage() {
  const exams: Exam[] = await getExams();
  const subjectMap = new Map<string, string>();
  for (const exam of exams) {
    if (exam.subjectId && !subjectMap.has(exam.subjectId)) {
      const subject = await getSubject(exam.subjectId);
      if (subject) subjectMap.set(exam.subjectId, subject.name);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">إدارة الامتحانات</h1>
        <Button asChild>
          <Link href="/dashboard/exams/new">
            <PlusCircle className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0" />
            إنشاء امتحان جديد
          </Link>
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
              <ScrollTextIcon className="h-8 w-8" />
            </div>
            <CardTitle>لا توجد امتحانات بعد</CardTitle>
            <CardDescription>ابدأ بإنشاء امتحان جديد لعرضه هنا.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/dashboard/exams/new">
                <PlusCircle className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                إنشاء امتحان جديد
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>قائمة الامتحانات</CardTitle>
            <CardDescription>عرض وتعديل الامتحانات الموجودة.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>صورة مصغرة</TableHead>
                    <TableHead>عنوان الامتحان</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>عدد الأسئلة</TableHead>
                    <TableHead>المدة (دقائق)</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <Image 
                          src={exam.imageUrl || "https://placehold.co/64x64.png"} 
                          alt={exam.title} 
                          width={64} 
                          height={64} 
                          className="rounded-md object-cover"
                          data-ai-hint={exam.imageHint || "exam test"}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{exam.title}</TableCell>
                      <TableCell>{subjectMap.get(exam.subjectId) || 'غير محدد'}</TableCell>
                      <TableCell>{exam.questionIds.length}</TableCell>
                      <TableCell>{exam.durationMinutes}</TableCell>
                      <TableCell>
                        <Badge variant={exam.published ? 'default' : 'outline'} className={exam.published ? 'bg-green-500 hover:bg-green-600' : ''}>
                          {exam.published ? 'منشور' : 'غير منشور'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/exams/edit/${exam.id}`}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">تعديل</span>
                            </Link>
                          </Button>
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">حذف</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف الامتحان بشكل دائم.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                 <form action={async () => {
                                  await deleteExamAction(exam.id);
                                }}>
                                  <AlertDialogAction type="submit">تأكيد الحذف</AlertDialogAction>
                                </form>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const revalidate = 0;
