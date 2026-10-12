'use client';

import { useState } from 'react';
import axios from 'axios';

interface PhotoUploaderProps {
  onSuccess?: (photoUrl: string) => void;
  onError?: (error: string) => void;
}

export default function PhotoUploader({ onSuccess, onError }: PhotoUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 파일 타입 확인
    if (!selectedFile.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다');
      return;
    }

    // 파일 크기 확인 (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await axios.post('/api/upload/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onSuccess) onSuccess(response.data.data.url);
      setFile(null);
      setPreview(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '사진 업로드 실패';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.uploadArea}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={styles.input}
          disabled={loading}
        />
        <div style={styles.uploadBox}>
          {preview ? (
            <img src={preview} alt="preview" style={styles.preview} />
          ) : (
            <div style={styles.placeholder}>
              <p style={styles.placeholderIcon}>📸</p>
              <p style={styles.placeholderText}>사진을 선택하세요</p>
            </div>
          )}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? '업로드 중...' : '업로드하기'}
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  uploadArea: {
    position: 'relative' as const,
  },
  input: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  uploadBox: {
    width: '100%',
    height: '300px',
    border: '2px dashed #ddd',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  placeholder: {
    textAlign: 'center' as const,
    color: '#999',
  },
  placeholderIcon: {
    fontSize: '48px',
    margin: '0',
  },
  placeholderText: {
    fontSize: '14px',
    margin: '8px 0 0 0',
  },
  button: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    padding: '12px 16px',
    background: '#FFE5E5',
    color: '#FF3B30',
    borderRadius: '6px',
    fontSize: '14px',
  },
};