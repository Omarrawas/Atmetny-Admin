
// src/lib/storage.ts
import { supabase } from '@/lib/supabaseClient'; // Use Supabase client

/**
 * Uploads a file to Supabase Storage and returns its public URL.
 * @param file The file to upload.
 * @param bucketName The name of the Supabase Storage bucket.
 * @param path The path within the bucket where the file should be stored (e.g., 'subjectImages').
 * @returns The public URL of the uploaded file.
 */
export const uploadFile = async (file: File, bucketName: string, path?: string): Promise<string> => {
  if (!file) throw new Error("File is required for upload.");
  if (!bucketName) throw new Error("Bucket name is required for Supabase Storage upload.");

  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const filePath = path ? `${path}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);

  if (error) {
    console.error("Supabase upload error:", error);
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error("Could not retrieve public URL for uploaded file.");
  }
  
  return publicUrlData.publicUrl;
};

/**
 * Deletes a file from Supabase Storage using its path within the bucket.
 * @param bucketName The name of the Supabase Storage bucket.
 * @param filePath The path of the file within the bucket to delete.
 * @returns A promise that resolves when the file is deleted.
 */
export const deleteFileByPath = async (bucketName: string, filePath: string): Promise<void> => {
  if (!bucketName || !filePath) {
    console.warn("Bucket name and file path are required for deletion from Supabase Storage.");
    return;
  }
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    if (error) {
      console.error(`Error deleting file ${filePath} from bucket ${bucketName}:`, error);
      // Optionally re-throw or handle specific errors
      if (error.message.includes("Object not found")) {
        console.warn(`File not found for deletion: ${filePath} in bucket ${bucketName}`);
        return; // Don't throw if file not found, might be already deleted
      }
      throw error;
    }
  } catch (error: any) {
    console.error(`Exception during file deletion from Supabase Storage for ${filePath}:`, error);
  }
};

/**
 * Deletes a file from Supabase Storage using its public download URL.
 * This function attempts to parse the bucket and path from the URL.
 * @param fileUrl The full public download URL of the file to delete.
 * @returns A promise that resolves when the file is deleted.
 */
export const deleteFileByUrl = async (fileUrl: string): Promise<void> => {
  if (!fileUrl) {
    console.warn("No file URL provided for deletion.");
    return;
  }
  try {
    // Example URL: https://<project-ref>.supabase.co/storage/v1/object/public/<bucket-name>/<path-to-file>
    const urlParts = fileUrl.split('/storage/v1/object/public/');
    if (urlParts.length < 2) {
      console.error("Invalid Supabase Storage URL format for deletion:", fileUrl);
      return;
    }
    const bucketAndPath = urlParts[1].split('/');
    const bucketName = bucketAndPath.shift();
    const filePath = bucketAndPath.join('/');

    if (!bucketName || !filePath) {
        console.error("Could not parse bucket name or file path from URL:", fileUrl);
        return;
    }
    await deleteFileByPath(bucketName, filePath);

  } catch (error: any) {
    console.error(`Error deleting file by URL ${fileUrl}:`, error);
  }
};
