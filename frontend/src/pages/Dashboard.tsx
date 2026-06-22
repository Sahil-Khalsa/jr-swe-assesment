import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { FileList, type FileRecord } from "../components/FileList";
import { FileUpload } from "../components/FileUpload";

export default function Dashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<FileRecord[]>("/files", { token });
      setFiles(data);
    } catch {
      setError("Could not load files.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Your Files</h1>
          <p className="subtitle">Upload, manage, and download your files</p>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <section className="upload-section">
        <h2 className="section-label">Upload a file</h2>
        <FileUpload token={token} onUploaded={refreshFiles} />
      </section>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading-text">Loading files...</p>
      ) : (
        <FileList files={files} token={token} />
      )}
    </div>
  );
}
