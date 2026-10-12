import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ProfileForm from '@/app/components/ProfileForm';

vi.mock('axios');

const mockProfile = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  bio: 'Hello',
  age: 25,
  gender: 'male',
  region: 'Seoul',
  mbti: 'ENFP',
};

describe('ProfileForm Component', () => {
  it('renders profile form with initial values', () => {
    render(<ProfileForm profile={mockProfile} />);
    const usernameInput = screen.getByDisplayValue('testuser');
    expect(usernameInput).toBeInTheDocument();
  });

  it('disables username and email fields', () => {
    render(<ProfileForm profile={mockProfile} />);
    const inputs = screen.getAllByDisplayValue(/testuser|test@example.com/);
    inputs.forEach(input => {
      expect((input as HTMLInputElement).disabled).toBe(true);
    });
  });

  it('allows editing bio and other fields', () => {
    render(<ProfileForm profile={mockProfile} />);
    const bioInput = screen.getByDisplayValue('Hello') as HTMLTextAreaElement;
    fireEvent.change(bioInput, { target: { value: 'Updated bio' } });
    expect(bioInput.value).toBe('Updated bio');
  });

  it('shows character counter for bio', () => {
    render(<ProfileForm profile={mockProfile} />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  it('submits form successfully', async () => {
    (axios.put as any).mockResolvedValue({ data: mockProfile });
    const onSuccess = vi.fn();

    render(<ProfileForm profile={mockProfile} onSuccess={onSuccess} />);
    const submitButton = screen.getByText('저장하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles form submission error', async () => {
    const errorMsg = '저장 실패';
    (axios.put as any).mockRejectedValue({
      response: { data: { error: errorMsg } },
    });

    render(<ProfileForm profile={mockProfile} />);
    const submitButton = screen.getByText('저장하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
  });

  it('updates age field correctly', () => {
    render(<ProfileForm profile={mockProfile} />);
    const ageInput = screen.getByDisplayValue('25') as HTMLInputElement;
    fireEvent.change(ageInput, { target: { value: '30' } });
    expect(ageInput.value).toBe('30');
  });

  it('updates gender selection', () => {
    render(<ProfileForm profile={mockProfile} />);
    const genderSelect = screen.getByDisplayValue('male') as HTMLSelectElement;
    fireEvent.change(genderSelect, { target: { value: 'female' } });
    expect(genderSelect.value).toBe('female');
  });

  it('displays loading state', async () => {
    (axios.put as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<ProfileForm profile={mockProfile} />);
    const submitButton = screen.getByText('저장하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('저장 중...')).toBeInTheDocument();
    });
  });

  it('displays success message after update', async () => {
    (axios.put as any).mockResolvedValue({ data: mockProfile });

    render(<ProfileForm profile={mockProfile} />);
    const submitButton = screen.getByText('저장하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('프로필이 성공적으로 업데이트되었습니다')).toBeInTheDocument();
    });
  });
});