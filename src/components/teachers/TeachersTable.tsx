// src/components/teachers/TeachersTable.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getTeachers, getSubjects, updateUser } from "@/lib/firestore"; 
import type { UserProfile, Subject } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Check, X, Youtube, ExternalLink } from "lucide-react"; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; 

export default function TeachersTable() {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null);
  const [selectedSubjectIdsInDialog, setSelectedSubjectIdsInDialog] = useState<string[]>([]); 
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false); 

  const { toast } = useToast();

  const fetchTeachersAndSubjects = async () => {
    setIsLoading(true);
    try {
      const [fetchedTeachers, fetchedSubjects] = await Promise.all([
        getTeachers(),
        getSubjects(),
      ]);
      setTeachers(fetchedTeachers);
      setAllSubjects(fetchedSubjects);
    } catch (error) {
      console.error("Error fetching teachers or subjects:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في جلب بيانات المدرسين أو المواد.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachersAndSubjects();
  }, []);

  const subjectsMap = useMemo(() => {
    const map = new Map<string, string>();
    allSubjects.forEach(subject => {
      if (subject.id) {
        map.set(subject.id, subject.name);
      }
    });
    return map;
  }, [allSubjects]);

  const handleOpenEditModal = (teacher: UserProfile) => {
    setEditingTeacher(teacher);
    setSelectedSubjectIdsInDialog(teacher.subjects_taught_ids || []); 
    setCurrentYoutubeUrl(teacher.youtube_channel_url || '');
  };

  const handleSubjectSelectionChange = (subjectId: string, checked: boolean | "indeterminate") => {
    setSelectedSubjectIdsInDialog(prevSelected =>
      checked === true
        ? [...prevSelected, subjectId]
        : prevSelected.filter(id => id !== subjectId)
    );
  };

  const handleSaveTeacherDetails = async () => {
    if (!editingTeacher) return;
    setIsSaving(true);
    try {
      if (currentYoutubeUrl && !currentYoutubeUrl.startsWith('http://') && !currentYoutubeUrl.startsWith('https://') && currentYoutubeUrl.trim() !== '') {
        toast({
          variant: "destructive",
          title: "رابط غير صحيح",
          description: "الرجاء إدخال رابط URL صحيح لقناة يوتيوب أو اتركه فارغًا.",
        });
        setIsSaving(false);
        return;
      }

      const updatePayload: Partial<UserProfile> = {
        subjects_taught_ids: selectedSubjectIdsInDialog.length > 0 ? selectedSubjectIdsInDialog : null,
        youtube_channel_url: currentYoutubeUrl.trim() || null,
      };

      await updateUser(editingTeacher.id, updatePayload); 
      
      toast({
        title: "نجاح",
        description: `تم تحديث تفاصيل المدرس ${editingTeacher.name || editingTeacher.email}.`, 
      });
      await fetchTeachersAndSubjects();
      setEditingTeacher(null); 
    } catch (error) {
      console.error("Error updating teacher details:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في تحديث تفاصيل المدرس.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 rtl:mr-2 text-muted-foreground">جاري تحميل المدرسين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teachers.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">
          لا يوجد مدرسون مضافون أو تم تعيين دور "teacher" لهم بعد.
        </p>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">اسم المدرس / البريد الإلكتروني</TableHead>
                <TableHead className="font-semibold">المواد الدراسية</TableHead>
                <TableHead className="font-semibold">قناة يوتيوب</TableHead>
                <TableHead className="font-semibold text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map(teacher => (
                <TableRow key={teacher.id}> 
                  <TableCell className="font-medium">
                    {teacher.name || teacher.email} 
                  </TableCell>
                  <TableCell>
                    {teacher.subjects_taught_ids && teacher.subjects_taught_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {teacher.subjects_taught_ids.map(subjectId => (
                                <Badge key={subjectId} variant="secondary">
                                    {subjectsMap.get(subjectId) || 'مادة غير معروفة'}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                      <span className="text-muted-foreground">لم يتم تعيين مواد</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {teacher.youtube_channel_url ? (
                      <a
                        href={teacher.youtube_channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 truncate max-w-[150px] sm:max-w-[200px]"
                        title={teacher.youtube_channel_url}
                      >
                        <Youtube className="h-4 w-4 text-red-600" />
                        <span className="truncate">{teacher.youtube_channel_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">لا يوجد</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog onOpenChange={(open) => { if (!open) setEditingTeacher(null); }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(teacher)}>
                          <Edit className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" /> إدارة التفاصيل
                        </Button>
                      </DialogTrigger>
                      {editingTeacher && editingTeacher.id === teacher.id && ( 
                        <DialogContent className="sm:max-w-[425px] md:max-w-lg" dir="rtl">
                          <DialogHeader className="text-right">
                            <DialogTitle>إدارة تفاصيل المدرس: {editingTeacher.name || editingTeacher.email}</DialogTitle> 
                            <DialogDescription>
                              اختر المواد التي يدرسها هذا المدرس وعدل رابط قناة يوتيوب.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-2">
                            <div>
                                <Label htmlFor="youtubeUrlInput" className="text-sm font-medium">رابط قناة يوتيوب (اختياري)</Label>
                                <Input 
                                    id="youtubeUrlInput"
                                    type="url"
                                    placeholder="https://www.youtube.com/channel/..."
                                    value={currentYoutubeUrl}
                                    onChange={(e) => setCurrentYoutubeUrl(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-sm font-medium">المواد الدراسية</Label>
                                {allSubjects.length > 0 ? (
                                <ScrollArea className="h-60 mt-1 border rounded-md p-2">
                                    <div className="space-y-2">
                                    {allSubjects.map(subject => (
                                        <div key={subject.id} className="flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`subject-${subject.id}-${editingTeacher!.id}`} 
                                            checked={selectedSubjectIdsInDialog.includes(subject.id!)}
                                            onCheckedChange={(checked) => handleSubjectSelectionChange(subject.id!, checked)}
                                        />
                                        <Label htmlFor={`subject-${subject.id}-${editingTeacher!.id}`} className="font-normal flex-1 cursor-pointer">
                                            {subject.name} ({subject.branch})
                                        </Label>
                                        </div>
                                    ))}
                                    </div>
                                </ScrollArea>
                                ) : (
                                <p className="text-muted-foreground text-center py-4 mt-1">لا توجد مواد مضافة في النظام لإسنادها.</p>
                                )}
                            </div>
                          </div>

                          <DialogFooter className="flex-row-reverse">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={() => setEditingTeacher(null)}>إلغاء</Button>
                            </DialogClose>
                            <Button 
                              type="button" 
                              onClick={handleSaveTeacherDetails} 
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin rtl:mr-2 rtl:ml-0" /> : <Check className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />}
                              حفظ التغييرات
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      )}
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
