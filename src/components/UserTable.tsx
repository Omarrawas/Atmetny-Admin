'use client';

import type { User } from '@/types';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getUsers, updateUserRole } from '@/lib/firestore'; // Assuming you have these functions
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldAlert, UserCog, User as UserIcon } from 'lucide-react';

interface UserTableProps {
  initialUsers: User[];
}

export function UserTable({ initialUsers }: UserTableProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleRoleChange = async (userId: string, newRole: User['role']) => {
    setLoading(true);
    try {
      await updateUserRole(userId, newRole);
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
      toast({ title: 'تم تحديث الدور', description: `تم تغيير دور المستخدم بنجاح إلى ${newRole}.` });
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({ variant: 'destructive', title: 'فشل تحديث الدور', description: 'حدث خطأ أثناء تحديث دور المستخدم.' });
    } finally {
      setLoading(false);
    }
  };
  
  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }

  const roleIcons: Record<User['role'], React.ReactElement> = {
    admin: <ShieldAlert className="h-5 w-5 text-red-500 mr-2" />,
    teacher: <UserCog className="h-5 w-5 text-blue-500 mr-2" />,
    student: <UserIcon className="h-5 w-5 text-green-500 mr-2" />,
  };

  const roleTranslations: Record<User['role'], string> = {
    admin: 'مدير',
    teacher: 'مدرس',
    student: 'طالب',
  };


  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المستخدم</TableHead>
            <TableHead>البريد الإلكتروني</TableHead>
            <TableHead>الدور الحالي</TableHead>
            <TableHead>تغيير الدور إلى</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL || `https://placehold.co/36x36.png`} alt={user.displayName || user.email || 'User'} data-ai-hint="profile avatar" />
                    <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{user.displayName || user.email?.split('@')[0] || 'مستخدم غير معروف'}</div>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {roleIcons[user.role]}
                  {roleTranslations[user.role]}
                </div>
              </TableCell>
              <TableCell>
                <Select
                  defaultValue={user.role}
                  onValueChange={(newRole) => handleRoleChange(user.id, newRole as User['role'])}
                  disabled={loading}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر دورًا" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{roleTranslations.admin}</SelectItem>
                    <SelectItem value="teacher">{roleTranslations.teacher}</SelectItem>
                    <SelectItem value="student">{roleTranslations.student}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {users.length === 0 && <p className="p-4 text-center text-muted-foreground">لا يوجد مستخدمون لعرضهم.</p>}
    </div>
  );
}
