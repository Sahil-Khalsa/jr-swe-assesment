import { useRef, useState, type FormEvent } from "react";
import { ApiError, apiRequest } from "../api/client";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

type Props = {
  token: string | null;
  onUploaded: () => void;
};

export function FileUpload({ token, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    // UX-only guard - the backend re-checks the real byte count regardless of what's sent here.
    if (file.size > MAX_SIZE_BYTES) {
      setError("File is larger than 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setError(null);
    try {
      await apiRequest("/files", { method: "POST", token, formData });
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <input ref={inputRef} type="file" />
      <button type="submit" disabled={uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
