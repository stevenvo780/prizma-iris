import React from 'react';
import Image from 'next/image';
import { getFileType, getFileNameFromUrl } from '@utils/fileUtils';
import {
  FaFileAudio,
  FaFileVideo,
  FaImage,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileAlt,
} from 'react-icons/fa';
import styles from '@styles/Messages.module.css';

interface FilePreviewProps {
  fileUrl: string;
  size?: 'small' | 'medium' | 'large';
  showFileName?: boolean;
  fileName?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  fileUrl,
  size = 'medium',
  showFileName = false,
  fileName,
}) => {
  const displayName = fileName || getFileNameFromUrl(fileUrl);
  const iconSize = size === 'small' ? 24 : size === 'medium' ? 36 : 48;
  const containerClass = `${styles.filePreviewContainer} ${styles['size-' + size]}`;
  const fileType = getFileType(fileUrl);

  const getFileIcon = () => {
    switch (fileType) {
      case 'image':
        return <FaImage size={iconSize} />;
      case 'video':
        return <FaFileVideo size={iconSize} color='#4285F4' />;
      case 'audio':
        return <FaFileAudio size={iconSize} color='#0F9D58' />;
      case 'pdf':
        return <FaFilePdf size={iconSize} color='#DB4437' />;
      case 'word':
        return <FaFileWord size={iconSize} color='#4285F4' />;
      case 'excel':
        return <FaFileExcel size={iconSize} color='#0F9D58' />;
      default:
        return <FaFileAlt size={iconSize} color='#F4B400' />;
    }
  };

  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 60, height: 60 };
      case 'medium':
        return { width: 100, height: 100 };
      case 'large':
        return { width: 150, height: 150 };
      default:
        return { width: 100, height: 100 };
    }
  };

  const dimensions = getDimensions();

  const renderPreview = () => {
    switch (fileType) {
      case 'image':
        return (
          <div className={styles.imagePreviewWrapper}>
            <Image
              src={fileUrl}
              alt={displayName}
              width={dimensions.width}
              height={dimensions.height}
              className={styles.previewImage}
            />
          </div>
        );
      case 'video':
        return (
          <div className={styles.videoPreviewWrapper}>
            <video
              className={styles.videoPreview}
              controls={size !== 'small'}
              width={dimensions.width}
              height={dimensions.height}
            >
              <source src={fileUrl} type={`video/${fileUrl.split('.').pop()?.toLowerCase()}`} />
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className={styles.audioPreviewWrapper}>
            {size !== 'small' && (
              <audio className={styles.audioPreview} controls>
                <source src={fileUrl} type={`audio/${fileUrl.split('.').pop()?.toLowerCase()}`} />
              </audio>
            )}
            <div className={styles.audioIcon}>
              <FaFileAudio size={iconSize} color='#0F9D58' />
            </div>
          </div>
        );
      default:
        return <div className={styles.fileIconWrapper}>{getFileIcon()}</div>;
    }
  };

  return (
    <div className={containerClass}>
      {renderPreview()}
      {showFileName && <p className={styles.previewFileName}>{displayName}</p>}
    </div>
  );
};

export default FilePreview;
