import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchForm from '@/app/components/SearchForm';

describe('SearchForm Component', () => {
  it('renders search form', () => {
    render(<SearchForm />);
    expect(screen.getByText('사람 찾기')).toBeInTheDocument();
  });

  it('toggles form expansion', () => {
    render(<SearchForm />);
    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);
    expect(screen.getByText('나이')).toBeInTheDocument();
  });

  it('updates age range', () => {
    render(<SearchForm />);
    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '25' } });
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('updates region', () => {
    render(<SearchForm />);
    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);

    const regionInput = screen.getByPlaceholderText('예: 서울, 강남구');
    fireEvent.change(regionInput, { target: { value: '부산' } });
    expect((regionInput as HTMLInputElement).value).toBe('부산');
  });

  it('updates gender selection', () => {
    render(<SearchForm />);
    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);

    const genderSelect = screen.getByDisplayValue('모두') as HTMLSelectElement;
    fireEvent.change(genderSelect, { target: { value: 'female' } });
    expect(genderSelect.value).toBe('female');
  });

  it('updates MBTI selection', () => {
    render(<SearchForm />);
    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);

    const mbtiSelect = screen.getAllByDisplayValue('모두')[1] as HTMLSelectElement;
    fireEvent.change(mbtiSelect, { target: { value: 'ENFP' } });
    expect(mbtiSelect.value).toBe('ENFP');
  });

  it('toggles interest selection', () => {
    render(<SearchForm />);
    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);

    const interestButton = screen.getByText('영화');
    fireEvent.click(interestButton);
    expect(interestButton).toBeInTheDocument();
  });

  it('calls onSearch callback', () => {
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} />);

    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);

    const searchButton = screen.getByText('검색하기');
    fireEvent.click(searchButton);

    expect(onSearch).toHaveBeenCalled();
  });

  it('resets form', () => {
    render(<SearchForm />);
    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);

    const resetButton = screen.getByText('초기화');
    fireEvent.click(resetButton);

    expect(screen.getByDisplayValue('모두')).toBeInTheDocument();
  });

  it('multiple interests can be selected', () => {
    render(<SearchForm />);
    const toggleButton = screen.getByText(/필터/);
    fireEvent.click(toggleButton);

    const interestButton1 = screen.getByText('영화');
    const interestButton2 = screen.getByText('음악');
    fireEvent.click(interestButton1);
    fireEvent.click(interestButton2);

    expect(interestButton1).toBeInTheDocument();
    expect(interestButton2).toBeInTheDocument();
  });
});