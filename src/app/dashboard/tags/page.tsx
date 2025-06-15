// src/app/dashboard/tags/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { getTags, addTag, deleteTag, updateTag } from '@/lib/firestore'; // Assuming updateTag exists or will be added
import type { Tag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Tags, PlusCircle, Loader2, Trash2, Edit3, RefreshCw } from 'lucide-react';

const tagSchema = z.object({
  name: z.string().min(2, "Tag name must be at least 2 characters.").max(50, "Tag name cannot exceed 50 characters."),
});
type TagFormValues = z.infer<typeof tagSchema>;

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const { toast } = useToast();

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: '' },
  });

  const editForm = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: '' },
  });

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedTags = await getTags();
      setTags(fetchedTags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch tags." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const onAddSubmit = async (data: TagFormValues) => {
    setIsSubmitting(true);
    try {
      await addTag({ name: data.name });
      toast({ title: "Success", description: `Tag "${data.name}" added successfully.` });
      form.reset();
      fetchTags(); // Refresh the list
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to add tag." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (data: TagFormValues) => {
    if (!editingTag || !editingTag.id) return;
    setIsSubmitting(true);
    try {
      await updateTag(editingTag.id, { name: data.name });
      toast({ title: "Success", description: `Tag "${data.name}" updated successfully.` });
      setEditingTag(null);
      fetchTags();
    } catch (error) {
      console.error("Error updating tag:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update tag." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!deletingTagId) return;
    try {
      await deleteTag(deletingTagId);
      toast({ title: "Success", description: "Tag deleted successfully." });
      fetchTags(); // Refresh the list
      // TODO: Consider implications for questions already using this tag.
      // For now, tagIds will just reference a non-existent tag.
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete tag." });
    } finally {
      setDeletingTagId(null);
    }
  };

  const handleOpenEditModal = (tag: Tag) => {
    setEditingTag(tag);
    editForm.reset({ name: tag.name });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
            <Tags className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">Manage Tags</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            Create, view, and manage tags for categorizing questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddSubmit)} className="flex items-end gap-4 mb-6 p-4 border rounded-lg bg-muted/30">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>New Tag Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Physics, Chapter 1, Easy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add Tag
              </Button>
            </form>
          </Form>

          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={fetchTags} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Tags
            </Button>
          </div>

          {isLoading && tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Loading tags...</div>
          ) : !tags.length ? (
            <div className="text-center py-8 text-muted-foreground">No tags found. Start by adding a new tag.</div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(tag)}>
                               <Edit3 className="mr-1 h-4 w-4" /> Edit
                             </Button>
                          </AlertDialogTrigger>
                          {editingTag && editingTag.id === tag.id && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Edit Tag: {editingTag.name}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Update the name of the tag.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Form {...editForm}>
                                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                  <FormField
                                    control={editForm.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>New Tag Name</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setEditingTag(null)}>Cancel</AlertDialogCancel>
                                    <Button type="submit" disabled={isSubmitting}>
                                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                      Save Changes
                                    </Button>
                                  </AlertDialogFooter>
                                </form>
                              </Form>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setDeletingTagId(tag.id!)}>
                              <Trash2 className="mr-1 h-4 w-4" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the tag "{tag.name}". Questions currently using this tag will retain its ID, but the tag will no longer be manageable or linkable.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeletingTagId(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteTag} className="bg-destructive hover:bg-destructive/90">Delete Tag</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
