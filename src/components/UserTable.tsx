
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
         toast({ variant: "destructive", title: "Function Not Implemented", description: "User management requires Supabase backend implementation." });
      } else {
        toast({
          variant: "destructive",
          title: "Error Fetching Users",
          description: "Could not load user data. Please try again.",
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
            title: "Invalid Role",
            description: "Please select a valid role.",
        });
        return;
    }
    setIsUpdatingRole(userId);
    try {
      // Assuming updateUser from lib/firestore will be adapted for Supabase
      await updateUser(userId, { role: newRole });
      toast({
        title: "Role Updated",
        description: `User's role successfully changed to ${newRole}.`,
      });
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, role: newRole } : user // Use 'id' for Supabase
        )
      );
    } catch (error: any) {
      console.error("Error updating role:", error);
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Updating user roles requires Supabase backend implementation." });
      } else {
        toast({
          variant: "destructive",
          title: "Error Updating Role",
          description: "Could not update user role. Please try again.",
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
        <p className="ml-2 text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">User Management</CardTitle>
        </div>
        <CardDescription className="text-lg text-muted-foreground">
          View and manage user roles within the application. (Backend logic needs Supabase update)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            No users found or data fetching is not yet implemented for Supabase.
          </div>
        ) : (
        <div className="overflow-x-auto mt-4 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Current Role</TableHead>
                <TableHead className="font-semibold text-right">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>{/* Ensure no whitespace before TableCell */}
                  <TableCell className="font-medium">{user.email || "N/A"}</TableCell>
                  <TableCell className="capitalize">{user.role || "Not set"}</TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={user.role}
                      onValueChange={(value) => changeRole(user.id, value as UserProfile['role'])} // Use 'id'
                      disabled={isUpdatingRole === user.id} // Use 'id'
                    >
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(roleValue => (
                          <SelectItem key={roleValue} value={roleValue || ''} className="capitalize">
                            {isUpdatingRole === user.id && user.role === roleValue ? ( // Use 'id'
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ): null}
                            {roleValue ? roleValue.charAt(0).toUpperCase() + roleValue.slice(1) : "Select Role"}
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
