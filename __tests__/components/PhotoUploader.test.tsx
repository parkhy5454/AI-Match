import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import PhotoUploader from '@/app/components/PhotoUploader';

vi.mock('axios');

describe('PhotoUploader Component', () => {
  it('renders upload area', () => {
    render(<PhotoUploader />);
    expect(screen.getByText('사진을 선택하세요')).toBeInTheDocument();
  });

  it('displays error for non-image file', async () => {
    render(<PhotoUploader />);
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    fireEvent.change(input, { target: { files: dataTransfer.files } });

    await waitFor(() => {
      expect(screen.getByText('이미지 파일만 업로드 가능합니다')).toBeInTheDocument();
    });
  });

  it('displays error for oversized file', async () => {
    render(<PhotoUploader />);
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(largeFile);

    fireEvent.change(input, { target: { files: dataTransfer.files } });

    await waitFor(() => {
      expect(screen.getByText('파일 크기는 10MB 이하여야 합니다')).toBeInTheDocument();
    });
  });

  it('accepts valid image file', async () => {
    render(<PhotoUploader />);
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    fireEvent.change(input, { target: { files: dataTransfer.files } });

    await waitFor(() => {
      expect(screen.getByText('업로드하기')).toBeInTheDocument();
    });
  });

  it('uploads file successfully', async () => {
    (axios.post as any).mockResolvedValue({
      data: { data: { url: 'https://example.com/photo.jpg' } },
    });

    const onSuccess = vi.fn();
    render(<PhotoUploader onSuccess={onSuccess} />);

    const input = screen.getByDisplayValue('') as HTMLInputElement;
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    fireEvent.change(input, { target: { files: dataTransfer.files } });

    await waitFor(() => {
      const uploadButton = screen.getByText('업로드하기');
      expect(uploadButton).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('업로드하기');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('https://example.com/photo.jpg');
    });
  });

  it('displays error on upload failure', async () => {
    (axios.post as any).mockRejectedValue({
      response: { data: { error: '업로드 실패' } },
    });

    render(<PhotoUploader />);

    const input = screen.getByDisplayValue('') as HTMLInputElement;
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    fireEvent.change(input, { target: { files: dataTransfer.files } });

    const uploadButton = await screen.findByText('업로드하기');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('업로드 실패')).toBeInTheDocument();
    });
  });
});