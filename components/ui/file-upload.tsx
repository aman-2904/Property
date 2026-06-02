"use client";

import * as React from "react";
import { UploadCloud, File, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  bucket: string;
  onUploadComplete: (url: string) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
  className?: string;
}

export function FileUpload({
  bucket,
  onUploadComplete,
  allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  maxSizeMB = 5,
  className,
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    if (!allowedTypes.includes(selectedFile.type)) {
      setStatus("error");
      setErrorMessage("File type not supported. Please upload JPG, PNG, WEBP, or PDF.");
      return false;
    }
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setStatus("error");
      setErrorMessage(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return false;
    }
    return true;
  };

  const uploadFile = async (targetFile: File) => {
    try {
      setStatus("uploading");
      setProgress(10);
      const supabase = createClient();

      const fileExt = targetFile.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Simulate initial progress steps since standard supabase storage upload does not report progress easily on upload() directly, or we can use custom fetch if needed, but a standard upload with mock state progress + success confirmation is highly robust.
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 80) {
            clearInterval(interval);
            return 80;
          }
          return prev + 15;
        });
      }, 200);

      // Perform upload
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, targetFile, {
          cacheControl: "3600",
          upsert: false,
        });

      clearInterval(interval);

      if (error) {
        throw error;
      }

      setProgress(100);
      setStatus("success");

      // Retrieve public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUploadComplete(urlData.publicUrl);
    } catch (error: any) {
      console.error("Upload error:", error);
      setStatus("error");
      setErrorMessage(error.message || "Failed to upload file. Check Supabase connection.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        uploadFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        uploadFile(selectedFile);
      }
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center p-6 min-h-[160px] rounded-2xl border border-dashed text-center transition-all overflow-hidden",
          isDragActive
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-border/60 bg-muted/10 hover:bg-muted/15",
          status === "uploading" && "pointer-events-none border-primary/40 bg-muted/5",
          status === "success" && "border-emerald-500/30 bg-emerald-500/5",
          status === "error" && "border-rose-500/30 bg-rose-500/5"
        )}
      >
        <input
          type="file"
          id="file-upload-input"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          disabled={status === "uploading"}
        />

        {status === "idle" && (
          <div className="space-y-2">
            <div className="flex justify-center text-muted-foreground">
              <UploadCloud className="h-8 w-8 animate-bounce text-primary/80" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Drag & drop document here, or <span className="text-primary hover:underline">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, WEBP, and PDF files (up to {maxSizeMB}MB)
            </p>
          </div>
        )}

        {status === "uploading" && (
          <div className="w-full space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              Uploading {file?.name}...
            </p>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}% complete</span>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-2">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">
              File uploaded successfully!
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <File className="h-3 w-3" /> {file?.name}
            </p>
            <p className="text-xs text-emerald-500">
              Click or drag another file to replace
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
            <p className="text-sm font-semibold text-rose-500">Upload failed</p>
            <p className="text-xs text-muted-foreground max-w-xs">{errorMessage}</p>
            <p className="text-xs text-primary underline">Try again</p>
          </div>
        )}
      </div>
    </div>
  );
}
