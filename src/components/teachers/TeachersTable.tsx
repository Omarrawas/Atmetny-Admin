// src/components/teachers/TeachersTable.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getTeachers, getSubjects, updateTeacherSubjects, updateUser } from "@/lib/firestore"; // Added updateUser
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
import { Loader2, Edit, Check, X, Youtube, ExternalLink } from "lucide-react"; // Added Youtube and ExternalLink
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
import { Input } from "@/components/ui/input"; // For editing YouTube URL

export default function TeachersTable() {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null);
  const [selectedSubjectIdsInDialog, setSelectedSubjectIdsInDialog] = useState<string[]>([]); // Kept as array for modal UI, but will save as single
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false); // Unified saving state

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
    // If subjects_taught_id is a single string, wrap it in an array for multi-select UI,
    // or adapt UI to single select. For now, we'll adapt to array if it's a single string.
    setSelectedSubjectIdsInDialog(teacher.subjects_taught_id ? [teacher.subjects_taught_id] : []);
    setCurrentYoutubeUrl(teacher.youtube_channel_url || '');
  };

  const handleSubjectSelectionChange = (subjectId: string, checked: boolean | "indeterminate") => {
    // This modal UI currently supports multiple selection.
    // If UserProfile.subjects_taught_id is truly single, this UI needs to change to a radio or select.
    // For now, it will store an array, and handleSaveTeacherDetails will pick the first one if needed.
    if (checked === true) {
      setSelectedSubjectIdsInDialog(prev => [...prev, subjectId]);
    } else {
      setSelectedSubjectIdsInDialog(prev => prev.filter(id => id !== subjectId));
    }
  };

  const handleSaveTeacherDetails = async () => {
    if (!editingTeacher) return;
    setIsSaving(true);
    try {
      if (currentYoutubeUrl && !currentYoutubeUrl.startsWith('http://') && !currentYoutubeUrl.startsWith('https://')) {
        toast({
          variant: "destructive",
          title: "رابط غير صحيح",
          description: "الرجاء إدخال رابط URL صحيح لقناة يوتيوب أو اتركه فارغًا.",
        });
        setIsSaving(false);
        return;
      }

      const updatePayload: Partial<UserProfile> = {
        // If UserProfile.subjects_taught_id is single, take the first from selected or null
        subjects_taught_id: selectedSubjectIdsInDialog.length > 0 ? selectedSubjectIdsInDialog[0] : null,
        youtube_channel_url: currentYoutubeUrl || null,
      };

      await updateUser(editingTeacher.id, updatePayload); // Use 'id'
      
      toast({
        title: "نجاح",
        description: `تم تحديث تفاصيل المدرس ${editingTeacher.name || editingTeacher.email}.`, // Use 'name'
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
                <TableHead className="font-semibold">المادة (المواد) الدراسية</TableHead>
                <TableHead className="font-semibold">قناة يوتيوب</TableHead>
                <TableHead className="font-semibold text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map(teacher => (
                <TableRow key={teacher.id}> {/* Use 'id' */}
                  <TableCell className="font-medium">
                    {teacher.name || teacher.email} {/* Use 'name' */}
                  </TableCell>
                  <TableCell>
                    {/* This part needs to be updated if subjects_taught_id is single */}
                    {teacher.subjects_taught_id ? (
                        <Badge variant="secondary">
                            {subjectsMap.get(teacher.subjects_taught_id) || 'مادة غير معروفة'}
                        </Badge>
                    ) : (teacher.subjects_taught_ids && teacher.subjects_taught_ids.length > 0) ? ( // Fallback for old array structure if present
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
                      {editingTeacher && editingTeacher.id === teacher.id && ( // Use 'id'
                        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>إدارة تفاصيل المدرس: {editingTeacher.name || editingTeacher.email}</DialogTitle> {/* Use 'name' */}
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
                                <Label className="text-xs text-muted-foreground block mt-1">ملاحظة: حاليًا يتم حفظ مادة واحدة فقط للمدرس بناءً على بنية قاعدة البيانات.</Label>
                                {allSubjects.length > 0 ? (
                                <ScrollArea className="h-60 mt-1 border rounded-md p-2">
                                    <div className="space-y-2">
                                    {allSubjects.map(subject => (
                                        <div key={subject.id} className="flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`subject-${subject.id}-${editingTeacher!.id}`} // Use 'id'
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

                          <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={() => setEditingTeacher(null)}>إلغاء</Button>
                            </DialogClose>
                            <Button 
                              type="button" 
                              onClick={handleSaveTeacherDetails} 
                              disabled={isSaving || (allSubjects.length === 0 && !currentYoutubeUrl) }
                            >
                              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
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
