import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import PasswordChanger from '@/app/components/PasswordChanger';

vi.mock('axios');

describe('PasswordChanger Component', () => {
  it('renders password form', () => {
    render(<PasswordChanger />);
    expect(screen.getByText('비밀번호 변경')).toBeInTheDocument();
    expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument();
  });

  it('validates empty fields', async () => {
    render(<PasswordChanger />);
    const submitButton = screen.getByText('비밀번호 변경');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('모든 필드를 입력해주세요')).toBeInTheDocument();
    });
  });

  it('validates password match', async () => {
    render(<PasswordChanger />);
    const currentInput = screen.getByLabelText('현재 비밀번호') as HTMLInputElement;
    const newInput = screen.getByLabelText('새 비밀번호') as HTMLInputElement;
    const confirmInput = screen.getByLabelText('새 비밀번호 확인') as HTMLInputElement;

    fireEvent.change(currentInput, { target: { value: 'oldpass123' } });
    fireEvent.change(newInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmInput, { target: { value: 'different123' } });

    const submitButton = screen.getByText('비밀번호 변경');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('새 비밀번호가 일치하지 않습니다')).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    render(<PasswordChanger />);
    const currentInput = screen.getByLabelText('현재 비밀번호') as HTMLInputElement;
    const newInput = screen.getByLabelText('새 비밀번호') as HTMLInputElement;
    const confirmInput = screen.getByLabelText('새 비밀번호 확인') as HTMLInputElement;

    fireEvent.change(currentInput, { target: { value: 'oldpass123' } });
    fireEvent.change(newInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });

    const submitButton = screen.getByText('비밀번호 변경');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('비밀번호는 최소 8자 이상이어야 합니다')).toBeInTheDocument();
    });
  });

  it('submits password change successfully', async () => {
    (axios.post as any).mockResolvedValue({ data: { success: true } });
    const onSuccess = vi.fn();

    render(<PasswordChanger onSuccess={onSuccess} />);
    const currentInput = screen.getByLabelText('현재 비밀번호') as HTMLInputElement;
    const newInput = screen.getByLabelText('새 비밀번호') as HTMLInputElement;
    const confirmInput = screen.getByLabelText('새 비밀번호 확인') as HTMLInputElement;

    fireEvent.change(currentInput, { target: { value: 'oldpass123' } });
    fireEvent.change(newInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

    const submitButton = screen.getByText('비밀번호 변경');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles password change error', async () => {
    (axios.post as any).mockRejectedValue({
      response: { data: { error: '현재 비밀번호가 올바르지 않습니다' } },
    });

    render(<PasswordChanger />);
    const currentInput = screen.getByLabelText('현재 비밀번호') as HTMLInputElement;
    const newInput = screen.getByLabelText('새 비밀번호') as HTMLInputElement;
    const confirmInput = screen.getByLabelText('새 비밀번호 확인') as HTMLInputElement;

    fireEvent.change(currentInput, { target: { value: 'wrongpass' } });
    fireEvent.change(newInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

    const submitButton = screen.getByText('비밀번호 변경');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('현재 비밀번호가 올바르지 않습니다')).toBeInTheDocument();
    });
  });
});