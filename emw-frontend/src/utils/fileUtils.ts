export type FileType = 'image' | 'video' | 'audio' | 'pdf' | 'word' | 'excel' | 'other';

export function getFileNameFromUrl(url: string): string {
  if (url.includes('firebasestorage.googleapis.com')) {
    const match = url.match(/\/o\/([^?]+)/);
    if (match && match[1]) {
      const decodedPath = decodeURIComponent(match[1]);
      const parts = decodedPath.split('/');
      return parts[parts.length - 1];
    }
  }

  const parts = url.split('/');
  const filenameWithParams = parts[parts.length - 1];
  const filenameWithoutParams = filenameWithParams.split('?')[0];

  return filenameWithoutParams;
}

export function getFileType(url: string): FileType {
  const filename = getFileNameFromUrl(url);
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  if (/^(jpe?g|gif|png|webp|bmp|svg|tiff|ico|heic)$/i.test(extension)) {
    return 'image';
  }

  if (/^(mp4|webm|mkv|mov|avi|wmv|flv|3gp|ogg|ogv|m4v)$/i.test(extension)) {
    return 'video';
  }

  if (/^(mp3|wav|ogg|aac|flac|m4a|wma|opus)$/i.test(extension)) {
    return 'audio';
  }

  if (extension === 'pdf') return 'pdf';
  if (/^(doc|docx)$/i.test(extension)) return 'word';
  if (/^(xls|xlsx|csv)$/i.test(extension)) return 'excel';

  if (url.includes('firebasestorage') && url.includes('images')) {
    return 'image';
  }

  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / 1048576).toFixed(2) + ' MB';
}
