import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getQuestions, deleteQuestion as deleteQuestionFromDb, getSubject } from '@/lib/firestore';
import type { Question, Subject } from '@/types';
import { PlusCircle, Edit, Trash2, HelpCircleIcon, Badge } from 'lucide-react';
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

async function deleteQuestionAction(id: string) {
  'use server';
  try {
    await deleteQuestionFromDb(id);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete question:", error);
    return { success: false, error: "Failed to delete question" };
  }
}

const questionTypeTranslations: Record<Question['type'], string> = {
  mcq: 'اختيار من متعدد',
  true_false: 'صح / خطأ',
  fill_blanks: 'املأ الفراغات',
  short_answer: 'إجابة قصيرة',
};

export default async function QuestionsPage() {
  const questions: Question[] = await getQuestions();
  
  // Fetch subject names for display - this could be optimized
  const subjectMap = new Map<string, string>();
  for (const q of questions) {
    if (q.subjectId && !subjectMap.has(q.subjectId)) {
      const subject = await getSubject(q.subjectId);
      if (subject) subjectMap.set(q.subjectId, subject.name);
    }
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">بنك الأسئلة</h1>
        <Button asChild>
          <Link href="/dashboard/questions/new">
            <PlusCircle className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0" />
            إضافة سؤال جديد
          </Link>
        </Button>
      </div>

      {questions.length === 0 ? (
         <Card className="text-center py-12">
           <CardHeader>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
              <HelpCircleIcon className="h-8 w-8" />
            </div>
            <CardTitle>لا توجد أسئلة بعد</CardTitle>
            <CardDescription>ابدأ بإضافة سؤال جديد لعرضه هنا.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/dashboard/questions/new">
                <PlusCircle className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                إضافة سؤال جديد
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>قائمة الأسئلة</CardTitle>
            <CardDescription>عرض وتعديل الأسئلة الموجودة في البنك.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نص السؤال</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>الصعوبة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium max-w-md truncate">{question.text}</TableCell>
                      <TableCell>{questionTypeTranslations[question.type]}</TableCell>
                      <TableCell>{subjectMap.get(question.subjectId) || 'غير محدد'}</TableCell>
                      <TableCell>
                        <Badge variant={question.difficulty === 'easy' ? 'default' : question.difficulty === 'medium' ? 'secondary' : 'destructive'}
                         className={
                           question.difficulty === 'easy' ? 'bg-green-500 hover:bg-green-600' : 
                           question.difficulty === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                           'bg-red-500 hover:bg-red-600'
                         }
                        >
                          {question.difficulty === 'easy' ? 'سهل' : question.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/questions/edit/${question.id}`}>
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
                                  هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف السؤال بشكل دائم.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                 <form action={async () => {
                                  await deleteQuestionAction(question.id);
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
