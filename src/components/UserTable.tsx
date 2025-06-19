// src/components/UserTable.tsx
"use client";

import React, { useEffect, useState } from "react";
// Removed: import { db } from "@/config/firebaseClient";
// import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore"; // Firestore imports removed
import { getUsers, updateUser } from "@/lib/firestore"; // These will throw errors until implemented for Supabase
import type { UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ROLES: UserProfile['role'][] = ['student', 'teacher', 'admin', 'user'];
const NOT_IMPLEMENTED_ERROR = "This function is not implemented for Supabase. Please update src/lib/firestore.ts";

export default function UserTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers(); // This will use the (now placeholder) Supabase version
      setUsers(data);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "وظيفة غير منفذة", description: "إدارة المستخدمين تتطلب تطبيق الواجهة الخلفية لـ Supabase." });
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في جلب المستخدمين",
          description: "لم نتمكن من تحميل بيانات المستخدمين. يرجى المحاولة مرة أخرى.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const changeRole = async (userId: string, newRole: UserProfile['role']) => {
    if (!newRole) {
        toast({
            variant: "destructive",
            title: "دور غير صالح",
            description: "الرجاء اختيار دور صالح.",
        });
        return;
    }
    setIsUpdatingRole(userId);
    try {
      // Assuming updateUser from lib/firestore will be adapted for Supabase
      await updateUser(userId, { role: newRole });
      toast({
        title: "تم تحديث الدور",
        description: `تم تغيير دور المستخدم بنجاح إلى ${newRole}.`,
      });
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, role: newRole } : user // Use 'id' for Supabase
        )
      );
    } catch (error: any) {
      console.error("Error updating role:", error);
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "وظيفة غير منفذة", description: "تحديث أدوار المستخدمين يتطلب تطبيق الواجهة الخلفية لـ Supabase." });
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في تحديث الدور",
          description: "لم نتمكن من تحديث دور المستخدم. يرجى المحاولة مرة أخرى.",
        });
      }
    } finally {
      setIsUpdatingRole(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">جاري تحميل المستخدمين...</p>
      </div>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 mb-2 rtl:space-x-reverse">
            <Users className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">إدارة المستخدمين</CardTitle>
        </div>
        <CardDescription className="text-lg text-muted-foreground">
          عرض وإدارة أدوار المستخدمين داخل التطبيق. (المنطق الخلفي يحتاج لتحديث Supabase)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            لم يتم العثور على مستخدمين أو أن جلب البيانات لم يتم تنفيذه بعد لـ Supabase.
          </div>
        ) : (
        <div className="overflow-x-auto mt-4 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">البريد الإلكتروني</TableHead>
                <TableHead className="font-semibold">الدور الحالي</TableHead>
                <TableHead className="font-semibold text-right">تغيير الدور</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>{/* Ensure no whitespace before TableCell */}
                  <TableCell className="font-medium">{user.email || "N/A"}</TableCell>
                  <TableCell className="capitalize">{user.role || "غير محدد"}</TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={user.role || undefined}
                      onValueChange={(value) => changeRole(user.id, value as UserProfile['role'])} // Use 'id'
                      disabled={isUpdatingRole === user.id} // Use 'id'
                    >
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="اختر دورًا" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(roleValue => (
                          <SelectItem key={roleValue} value={roleValue || ''} className="capitalize">
                            {isUpdatingRole === user.id && user.role === roleValue ? ( // Use 'id'
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ): null}
                            {roleValue ? roleValue.charAt(0).toUpperCase() + roleValue.slice(1) : "اختر دورًا"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
