// src/app/dashboard/teachers/page.tsx
"use client";

import React, { useState, useCallback } from 'react';
import TeachersTable from '@/components/teachers/TeachersTable';
import AssignTeacherRoleForm from '@/components/teachers/AssignTeacherRoleForm'; // Import the new form
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button
import { Users2, UserPlus, X } from 'lucide-react';

export default function TeachersPage() {
  const [showAssignForm, setShowAssignForm] = useState(false);
  // We need a way to tell TeachersTable to refresh. A simple key change can do this.
  const [teacherTableKey, setTeacherTableKey] = useState(0); 

  const handleTeacherAssigned = useCallback(() => {
    setShowAssignForm(false); // Optionally hide form after assignment
    setTeacherTableKey(prevKey => prevKey + 1); // Change key to force re-render of TeachersTable
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
            <Users2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">إدارة المدرسين</CardTitle>
        </div>
        <Button onClick={() => setShowAssignForm(prev => !prev)} variant="outline" size="lg">
          {showAssignForm ? <X className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" /> : <UserPlus className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />}
          {showAssignForm ? 'إخفاء نموذج التعيين' : 'تعيين مستخدم كمدرس'}
        </Button>
      </div>
       <CardDescription className="text-lg text-muted-foreground mt-[-1rem] mb-2"> {/* Adjusted margin */}
            عرض وإدارة المدرسين وتحديد المواد التي يدرسونها.
            يمكنك تعيين مستخدم موجود بالفعل في النظام كـ "مدرس" من خلال النموذج أدناه.
       </CardDescription>

      {showAssignForm && (
        <AssignTeacherRoleForm onTeacherAssigned={handleTeacherAssigned} />
      )}

      <Card className="shadow-lg mt-4">
        <CardHeader>
          {/* CardHeader for TeachersTable can be within TeachersTable component itself if needed */}
        </CardHeader>
        <CardContent>
          <TeachersTable key={teacherTableKey} />
        </CardContent>
      </Card>
    </div>
  );
}
