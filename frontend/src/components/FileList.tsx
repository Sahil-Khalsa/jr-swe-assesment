import { apiDownload } from "../api/client";

export type FileRecord = {
  id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

type Props = {
  files: FileRecord[];
  token: string | null;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ files, token }: Props) {
  async function handleDownload(file: FileRecord) {
    if (!token) return;
    const { blob, filename } = await apiDownload(`/files/${file.id}/download`, token);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleOpen(file: FileRecord) {
    if (!token) return;
    // Open the tab synchronously, before the async fetch below, so browsers still treat
    // this as a user-initiated navigation and don't block it as a popup.
    const popup = window.open("", "_blank");
    const { blob } = await apiDownload(`/files/${file.id}/download`, token);
    if (popup) {
      popup.location.href = URL.createObjectURL(blob);
    }
  }

  if (files.length === 0) {
    return <p className="empty-state">📁 No files uploaded yet.</p>;
  }

  return (
    <div className="file-table-wrapper">
      <table className="file-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td>{file.original_filename}</td>
              <td>{file.content_type}</td>
              <td>{formatSize(file.size_bytes)}</td>
              <td>{new Date(file.created_at).toLocaleString()}</td>
              <td className="file-actions">
                <button onClick={() => handleOpen(file)}>Open</button>
                <button onClick={() => handleDownload(file)}>Download</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
