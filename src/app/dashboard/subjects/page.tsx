import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSubjects, deleteSubject as deleteSubjectFromDb } from '@/lib/firestore';
import type { Subject } from '@/types';
import { PlusCircle, Edit, Trash2, BookOpenCheck } from 'lucide-react';
import Image from 'next/image';
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

// Server action to delete subject
async function deleteSubjectAction(id: string) {
  'use server';
  try {
    await deleteSubjectFromDb(id);
    // Revalidation will be handled by Next.js cache invalidation or client-side refresh
    return { success: true };
  } catch (error) {
    console.error("Failed to delete subject:", error);
    return { success: false, error: "Failed to delete subject" };
  }
}


export default async function SubjectsPage() {
  const subjects: Subject[] = await getSubjects();

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">إدارة المواد الدراسية</h1>
        <Button asChild>
          <Link href="/dashboard/subjects/new">
            <PlusCircle className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0" />
            إضافة مادة جديدة
          </Link>
        </Button>
      </div>

      {subjects.length === 0 ? (
        <Card className="text-center py-12">
           <CardHeader>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
              <BookOpenCheck className="h-8 w-8" />
            </div>
            <CardTitle>لا توجد مواد دراسية بعد</CardTitle>
            <CardDescription>ابدأ بإضافة مادة دراسية جديدة لعرضها هنا.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/dashboard/subjects/new">
                <PlusCircle className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                إضافة مادة جديدة
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>قائمة المواد</CardTitle>
            <CardDescription>عرض وتعديل المواد الدراسية الموجودة.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>صورة مصغرة</TableHead>
                    <TableHead>اسم المادة</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>
                        <Image 
                          src={subject.imageUrl || "https://placehold.co/64x64.png"} 
                          alt={subject.name} 
                          width={64} 
                          height={64} 
                          className="rounded-md object-cover"
                          data-ai-hint={subject.imageHint || "education subject"}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.branch === 'scientific' ? 'علمي' : subject.branch === 'literary' ? 'أدبي' : 'عام'}</TableCell>
                      <TableCell className="max-w-xs truncate">{subject.description}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/subjects/edit/${subject.id}`}>
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
                                  هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف المادة بشكل دائم.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <form action={async () => {
                                  await deleteSubjectAction(subject.id);
                                  // Consider using revalidatePath('/') or router.refresh() on client side for immediate update if not relying on timed revalidation
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

export const revalidate = 0; // Revalidate on every request for dynamic data
