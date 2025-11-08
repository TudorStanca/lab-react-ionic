import { useEffect, useState } from "react";
import { useCamera } from "./useCamera";
import { useFilesystem } from "./useFilesystem";
import { usePreferences } from "./usePreferences";

export interface MyPhoto {
  filepath: string;
  webviewPath?: string;
}

const PHOTOS = "photos";

export function usePhotos() {
  const [photos, setPhotos] = useState<MyPhoto[]>([]);
  const { getPhoto } = useCamera();
  const { readFile, writeFile, deleteFile } = useFilesystem();
  const { get, set } = usePreferences();
  useEffect(loadPhotos, [get, readFile, setPhotos]);
    const MAX_FILE_BYTES = 200 * 1024;
  return {
    photos,
    takePhoto,
    deletePhoto,
  };

  async function takePhoto(): Promise<MyPhoto> {
    const data = await getPhoto();
    let base64 = data.base64String || "";

    const base64Size = (b64: string) => Math.ceil((b64.length * 3) / 4);

    if (base64Size(base64) > MAX_FILE_BYTES) {
      try {
        base64 = await compressBase64Image(base64, MAX_FILE_BYTES);
      } catch (err) {
        console.warn("Compression failed:", err);
      }
    }

    const finalSize = base64Size(base64);
    if (finalSize > MAX_FILE_BYTES) {
      throw new Error(
        `Image is too large (${Math.round(finalSize / 1024)} KB). Please take a smaller photo or reduce quality.`
      );
    }

    const filepath = new Date().getTime() + ".jpeg";
    await writeFile(filepath, base64);
    const webviewPath = `data:image/jpeg;base64,${base64}`;
    const newPhoto = { filepath, webviewPath } as MyPhoto;
    const newPhotos = [newPhoto, ...photos];
    await set(PHOTOS, JSON.stringify(newPhotos.map((p) => ({ filepath: p.filepath }))));
    setPhotos(newPhotos);
    return newPhoto;
  }

  async function compressBase64Image(base64: string, maxBytes: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas not supported"));
              return;
            }

            const MAX_WIDTH = 1024;
            let width = img.naturalWidth;
            let height = img.naturalHeight;
            if (width > MAX_WIDTH) {
              height = Math.round((MAX_WIDTH / width) * height);
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const tryQualities = [0.9, 0.8, 0.7, 0.6, 0.5];
            for (const q of tryQualities) {
              const url = canvas.toDataURL("image/jpeg", q);
              const b64 = url.split(",")[1];
              const size = Math.ceil((b64.length * 3) / 4);
              if (size <= maxBytes) {
                resolve(b64);
                return;
              }
            }

            let scale = 0.8;
            while (scale > 0.2) {
              const w = Math.max(1, Math.round(width * scale));
              const h = Math.max(1, Math.round(height * scale));
              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(img, 0, 0, w, h);
              for (const q of tryQualities) {
                const url = canvas.toDataURL("image/jpeg", q);
                const b64 = url.split(",")[1];
                const size = Math.ceil((b64.length * 3) / 4);
                if (size <= maxBytes) {
                  resolve(b64);
                  return;
                }
              }
              scale -= 0.1;
            }

            resolve(base64);
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error("Failed to load image for compression"));
        img.src = dataUrl;
      } catch (err) {
        reject(err);
      }
    });
  }

  async function deletePhoto(photo: MyPhoto) {
    const newPhotos = photos.filter((p) => p.filepath !== photo.filepath);
    await set(PHOTOS, JSON.stringify(newPhotos.map((p) => ({ filepath: p.filepath }))));
    await deleteFile(photo.filepath);
    setPhotos(newPhotos);
  }

  function loadPhotos() {
    loadSavedPhotos();

    async function loadSavedPhotos() {
      const savedPhotoString = await get(PHOTOS);
      const savedPhotos = (savedPhotoString ? JSON.parse(savedPhotoString) : []) as MyPhoto[];
      console.log("load", savedPhotos);
      for (const photo of savedPhotos) {
        const data = await readFile(photo.filepath);
        photo.webviewPath = `data:image/jpeg;base64,${data}`;
      }
      setPhotos(savedPhotos);
    }
  }
}

