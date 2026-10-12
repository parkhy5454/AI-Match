import { render, screen, fireEvent } from '@testing-library/react';
import ProfileCard from '@/components/ProfileCard';
import { describe, it, expect, vi } from 'vitest';

const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  age: 25,
  gender: 'female',
  region: '서울',
  mbti: 'ENFP',
  profileImage: 'https://example.com/photo.jpg',
  bio: 'Hello, I am looking for someone special',
};

describe('ProfileCard Component', () => {
  it('renders user information correctly', () => {
    const mockFn = vi.fn();
    render(
      <ProfileCard
        user={mockUser}
        onLike={mockFn}
        onSuperLike={mockFn}
        onPass={mockFn}
      />
    );

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('📍 서울')).toBeInTheDocument();
    expect(screen.getByText('female')).toBeInTheDocument();
    expect(screen.getByText('ENFP')).toBeInTheDocument();
  });

  it('displays user bio when provided', () => {
    const mockFn = vi.fn();
    render(
      <ProfileCard
        user={mockUser}
        onLike={mockFn}
        onSuperLike={mockFn}
        onPass={mockFn}
      />
    );

    expect(screen.getByText(/Hello, I am looking/)).toBeInTheDocument();
  });

  it('displays compatibility when provided', () => {
    const mockFn = vi.fn();
    render(
      <ProfileCard
        user={mockUser}
        onLike={mockFn}
        onSuperLike={mockFn}
        onPass={mockFn}
        compatibility={85}
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('calls onLike when like button is clicked', () => {
    const onLikeMock = vi.fn();
    const onSuperLikeMock = vi.fn();
    const onPassMock = vi.fn();

    render(
      <ProfileCard
        user={mockUser}
        onLike={onLikeMock}
        onSuperLike={onSuperLikeMock}
        onPass={onPassMock}
      />
    );

    const likeButton = screen.getByTitle('좋아요');
    fireEvent.click(likeButton);

    expect(onLikeMock).toHaveBeenCalledTimes(1);
    expect(onSuperLikeMock).not.toHaveBeenCalled();
    expect(onPassMock).not.toHaveBeenCalled();
  });

  it('calls onSuperLike when superlike button is clicked', () => {
    const onLikeMock = vi.fn();
    const onSuperLikeMock = vi.fn();
    const onPassMock = vi.fn();

    render(
      <ProfileCard
        user={mockUser}
        onLike={onLikeMock}
        onSuperLike={onSuperLikeMock}
        onPass={onPassMock}
      />
    );

    const superlikeButton = screen.getByTitle('슈퍼좋아요');
    fireEvent.click(superlikeButton);

    expect(onSuperLikeMock).toHaveBeenCalledTimes(1);
    expect(onLikeMock).not.toHaveBeenCalled();
    expect(onPassMock).not.toHaveBeenCalled();
  });

  it('calls onPass when pass button is clicked', () => {
    const onLikeMock = vi.fn();
    const onSuperLikeMock = vi.fn();
    const onPassMock = vi.fn();

    render(
      <ProfileCard
        user={mockUser}
        onLike={onLikeMock}
        onSuperLike={onSuperLikeMock}
        onPass={onPassMock}
      />
    );

    const passButton = screen.getByTitle('패스');
    fireEvent.click(passButton);

    expect(onPassMock).toHaveBeenCalledTimes(1);
    expect(onLikeMock).not.toHaveBeenCalled();
    expect(onSuperLikeMock).not.toHaveBeenCalled();
  });

  it('disables buttons when loading', () => {
    const mockFn = vi.fn();
    render(
      <ProfileCard
        user={mockUser}
        onLike={mockFn}
        onSuperLike={mockFn}
        onPass={mockFn}
        loading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('displays age badge', () => {
    const mockFn = vi.fn();
    render(
      <ProfileCard
        user={mockUser}
        onLike={mockFn}
        onSuperLike={mockFn}
        onPass={mockFn}
      />
    );

    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders profile image', () => {
    const mockFn = vi.fn();
    render(
      <ProfileCard
        user={mockUser}
        onLike={mockFn}
        onSuperLike={mockFn}
        onPass={mockFn}
      />
    );

    const image = screen.getByAltText('testuser');
    expect(image).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('shows placeholder when no profile image', () => {
    const userWithoutImage = { ...mockUser, profileImage: undefined };
    const mockFn = vi.fn();

    render(
      <ProfileCard
        user={userWithoutImage}
        onLike={mockFn}
        onSuperLike={mockFn}
        onPass={mockFn}
      />
    );

    expect(screen.getByText('📷')).toBeInTheDocument();
  });
});