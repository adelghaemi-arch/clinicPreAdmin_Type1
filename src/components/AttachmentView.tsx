import { useEffect, useState } from "react";
import { Download, Eye, FileText, Image as ImageIcon, LoaderCircle, Trash2 } from "lucide-react";
import { fa, persianDate } from "../data";
import { loadAttachment, safeLegacyUrl } from "../attachments";
import type { IntakeAttachment } from "../types";

export function fileSizeLabel(size: number) {
  if (size < 1024) return `${fa(size)} بایت`;
  if (size < 1024 * 1024) return `${fa(Math.round(size / 1024))} کیلوبایت`;
  return `${fa((size / (1024 * 1024)).toFixed(1))} مگابایت`;
}

export default function AttachmentView({
  file,
  compact = false,
  onRemove,
}: {
  file: IntakeAttachment;
  compact?: boolean;
  onRemove?: () => void;
}) {
  const [url, setUrl] = useState<string | undefined>(() => safeLegacyUrl(file));
  const [error, setError] = useState(false);
  useEffect(() => {
    const legacy = safeLegacyUrl(file);
    if (legacy) {
      setUrl(legacy);
      setError(false);
      return;
    }
    if (!file.storageKey) {
      setUrl(undefined);
      setError(true);
      return;
    }
    let active = true;
    let objectUrl: string | undefined;
    setUrl(undefined);
    setError(false);
    loadAttachment(file.storageKey)
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setError(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.storageKey, file.dataUrl]);
  const image = file.mime.startsWith("image/");
  return (
    <li className={`intake-attachment ${compact ? "is-compact" : ""}`}>
      {!compact && (
        <span className="intake-file-icon">
          {url && image ? <img src={url} alt="" /> : image ? <ImageIcon size={20} /> : <FileText size={20} />}
        </span>
      )}
      <div className="intake-attachment-info">
        <b title={file.name}>{file.name}</b>
        {!compact && <small>{fileSizeLabel(file.size)} • {persianDate(file.uploadedAt.slice(0, 10))}</small>}
        {error && <small className="intake-file-error">اصل فایل در این مرورگر پیدا نشد؛ دوباره پیوست کنید.</small>}
      </div>
      <div className="intake-attachment-actions">
        {url ? (
          <>
            <a className="icon-button" href={url} target="_blank" rel="noopener noreferrer" aria-label={`مشاهده ${file.name}`} title="مشاهده فایل">
              <Eye size={16} />
            </a>
            <a className="icon-button" href={url} download={file.name} aria-label={`دریافت ${file.name}`} title="دریافت اصل فایل">
              <Download size={16} />
            </a>
          </>
        ) : !error ? <LoaderCircle size={15} className="spin" aria-label="در حال خواندن فایل" /> : null}
        {onRemove && (
          <button type="button" className="icon-button" aria-label={`حذف ${file.name}`} title="حذف فایل" onClick={onRemove}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  );
}
