"use client";

import { useState, useRef } from "react";
import { Reorder } from "framer-motion";
import { Plus, GripVertical, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  getCloudinaryUploadSignature,
  saveUploadedPhoto,
  deletePhoto,
  updatePhotosOrder,
} from "../actions";
import styles from "./admin.module.css";

interface Photo {
  id: number;
  url: string;
  publicId: string;
  title: string | null;
  displayOrder: number;
  createdAt: Date | null;
}

interface AdminDashboardProps {
  initialPhotos: Photo[];
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "idle" | "uploading" | "saving" | "success" | "error";
  previewUrl: string;
}

export default function AdminDashboard({ initialPhotos }: AdminDashboardProps) {
  const [photosList, setPhotosList] = useState<Photo[]>(initialPhotos);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle re-ordering
  const handleReorder = async (newOrder: Photo[]) => {
    setPhotosList(newOrder);
    setIsSavingOrder(true);
    try {
      const orderedIds = newOrder.map((photo) => photo.id);
      await updatePhotosOrder(orderedIds);
    } catch (error) {
      console.error("Failed to update display order:", error);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Handle photo deletion
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    
    // Optimistic update
    const previousPhotos = [...photosList];
    setPhotosList((prev) => prev.filter((p) => p.id !== id));

    try {
      await deletePhoto(id);
    } catch (error) {
      console.error("Failed to delete photo:", error);
      alert("Error deleting photo. Restoring previous state.");
      setPhotosList(previousPhotos);
    }
  };

  // Trigger file picker
  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Handle file drop/select
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setShowUploadPanel(true);

    const newFiles = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      progress: 0,
      status: "idle" as const,
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setUploadingFiles((prev) => [...prev, ...newFiles]);

    // Upload each file sequentially/concurrently
    for (const fileObj of newFiles) {
      uploadFile(fileObj);
    }
  };

  // Upload single file directly to Cloudinary using secure signed upload
  const uploadFile = async (fileObj: typeof uploadingFiles[0] & { file: File }) => {
    // 1. Get Cloudinary signature from Server Action
    let signatureData;
    try {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileObj.id ? { ...f, status: "uploading" } : f))
      );
      signatureData = await getCloudinaryUploadSignature();
    } catch (error) {
      console.error("Failed to get signature:", error);
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileObj.id ? { ...f, status: "error" } : f))
      );
      return;
    }

    const { signature, timestamp, apiKey: clApiKey, cloudName: clCloudName, folder } = signatureData;

    // 2. Perform upload via XMLHttpRequest to track progress
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${clCloudName}/image/upload`);

    const formData = new FormData();
    formData.append("file", fileObj.file);
    formData.append("api_key", clApiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded * 100) / event.total);
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === fileObj.id ? { ...f, progress: percentage } : f))
        );
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const { secure_url, public_id } = response;

        // 3. Save uploaded photo metadata to database via Server Action
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === fileObj.id ? { ...f, status: "saving", progress: 100 } : f))
        );

        try {
          const saveResult = await saveUploadedPhoto(
            secure_url,
            public_id,
            fileObj.name.split(".")[0]
          );

          if (saveResult.success && saveResult.photo) {
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === fileObj.id ? { ...f, status: "success" } : f))
            );
            
            // Add new photo to local state list
            // Drizzle serial id is a number, schema dates are Dates, so we convert them if needed
            const newPhoto: Photo = {
              id: saveResult.photo.id,
              url: saveResult.photo.url,
              publicId: saveResult.photo.publicId,
              title: saveResult.photo.title,
              displayOrder: saveResult.photo.displayOrder,
              createdAt: saveResult.photo.createdAt ? new Date(saveResult.photo.createdAt) : null,
            };
            setPhotosList((prev) => [...prev, newPhoto]);
          }
        } catch (error) {
          console.error("Failed to save photo metadata:", error);
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === fileObj.id ? { ...f, status: "error" } : f))
          );
        }
      } else {
        console.error("Cloudinary upload failed:", xhr.responseText);
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === fileObj.id ? { ...f, status: "error" } : f))
        );
      }
    };

    xhr.onerror = () => {
      console.error("XHR network error during upload");
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileObj.id ? { ...f, status: "error" } : f))
      );
    };

    xhr.send(formData);
  };

  const getStatusLabel = (status: UploadingFile["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading...";
      case "saving":
        return "Saving metadata...";
      case "success":
        return "Success";
      case "error":
        return "Failed";
      default:
        return "Pending";
    }
  };

  return (
    <div>
      <div className={styles.dashboardHeader}>
        <div>
          <h2 className={styles.dashboardHeading}>Photos Directory</h2>
          <p className={styles.dashboardSubheading}>
            Upload, remove, or drag-and-drop cards to rearrange the carousel sequence.
          </p>
        </div>

        <button onClick={triggerFilePicker} className={styles.uploadTriggerBtn}>
          <Plus size={18} />
          Upload Photos
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          accept="image/*"
          style={{ display: "none" }}
        />
      </div>

      {/* Uploading panel */}
      {showUploadPanel && (
        <div className={styles.uploadSection}>
          <div
            className={styles.dropzone}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFiles(e.dataTransfer.files);
            }}
          >
            <ImageIcon size={32} style={{ color: "#7a8180", marginBottom: "12px" }} />
            <p className={styles.dropzoneText}>Drag & drop more files here or click Upload</p>
            <p className={styles.dropzoneSubtext}>Support multiple image formats</p>
          </div>

          <div className={styles.previewGrid}>
            {uploadingFiles.map((file) => (
              <div key={file.id} className={styles.previewCard}>
                <img src={file.previewUrl} alt={file.name} className={styles.previewImage} />
                <div className={styles.uploadProgressOverlay}>
                  <span className={styles.statusLabel}>{getStatusLabel(file.status)}</span>
                  {file.status === "uploading" && (
                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  )}
                  {file.status === "saving" && <Loader2 className="animate-spin" size={16} />}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setShowUploadPanel(false);
              setUploadingFiles([]);
            }}
            className={styles.closeUploadBtn}
          >
            Close Panel
          </button>
        </div>
      )}

      {/* Photo items list with Framer Motion Reorder */}
      {photosList.length > 0 ? (
        <div>
          {isSavingOrder && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontSize: "12px", fontFamily: "monospace", marginBottom: "16px" }}>
              <Loader2 className="animate-spin" size={12} />
              Saving layout sequence...
            </div>
          )}
          <Reorder.Group
            values={photosList}
            onReorder={handleReorder}
            as="ul"
            className={styles.photoGrid}
          >
            {photosList.map((photo) => (
              <Reorder.Item
                key={photo.id}
                value={photo}
                id={String(photo.id)}
                className={styles.photoCard}
              >
                <div className={styles.cardDragHandle}>
                  <div className={styles.dragInfo}>
                    <GripVertical size={14} />
                    <span>POS #{photo.displayOrder}</span>
                  </div>
                </div>
                <div className={styles.imageWrapper}>
                  <img src={photo.url} alt={photo.title || "Portfolio item"} className={styles.photoImage} />
                </div>
                <div className={styles.cardFooter}>
                  <h4 className={styles.photoTitle}>{photo.title || "Untitled Image"}</h4>
                  <button onClick={() => handleDelete(photo.id)} className={styles.deleteBtn} title="Delete Image">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      ) : (
        !showUploadPanel && (
          <div className={styles.emptyState}>
            <ImageIcon size={48} style={{ color: "#1e2427" }} />
            <h3 className={styles.emptyHeading}>No photos uploaded yet</h3>
            <p className={styles.emptyText}>
              Click the "Upload Photos" button to add images and populate your velocity scroll landing page carousel.
            </p>
          </div>
        )
      )}
    </div>
  );
}
