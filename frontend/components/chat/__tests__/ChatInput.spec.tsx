import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ChatInput } from '@/components/chat/ChatInput';

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} />);

    expect(screen.getByPlaceholderText('메시지를 입력하세요...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /전송/i })).toBeInTheDocument();
    expect(screen.getByText(/업무실적/i)).toBeInTheDocument();
  });

  it('sends message when send button is clicked', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
    fireEvent.change(textarea, { target: { value: '안녕하세요!' } });

    const sendButton = screen.getByRole('button', { name: /전송/i });
    fireEvent.click(sendButton);

    expect(handleSend).toHaveBeenCalledWith('안녕하세요!', 'NORMAL');
  });

  it('sends message when Enter is pressed', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
    fireEvent.change(textarea, { target: { value: '안녕하세요!' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(handleSend).toHaveBeenCalledWith('안녕하세요!', 'NORMAL');
  });

  it('does not send empty message', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} />);

    const sendButton = screen.getByRole('button', { name: /전송/i });
    fireEvent.click(sendButton);

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('toggles to WORK_PERFORMANCE mode', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} />);

    const scheduleRequestButton = screen.getByText(/업무실적/i);
    fireEvent.click(scheduleRequestButton);

    // Should show schedule request mode indicator
    expect(screen.getByText('업무실적 모드')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('업무실적을 입력하세요...')).toBeInTheDocument();
  });

  it('sends WORK_PERFORMANCE message when in schedule request mode', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} />);

    // Toggle to schedule request mode
    const scheduleRequestButton = screen.getByText(/업무실적/i);
    fireEvent.click(scheduleRequestButton);

    const textarea = screen.getByPlaceholderText('업무실적을 입력하세요...');
    fireEvent.change(textarea, { target: { value: '회의 시간 변경 요청' } });

    const sendButton = screen.getByRole('button', { name: /전송/i });
    fireEvent.click(sendButton);

    expect(handleSend).toHaveBeenCalledWith('회의 시간 변경 요청', 'WORK_PERFORMANCE');
  });

  it('cancels WORK_PERFORMANCE mode when cancel button is clicked', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} />);

    // Toggle to schedule request mode
    const scheduleRequestButton = screen.getByText(/업무실적/i);
    fireEvent.click(scheduleRequestButton);

    // Cancel
    const cancelButton = screen.getByText('취소');
    fireEvent.click(cancelButton);

    // Should be back to normal mode
    expect(screen.queryByText('업무실적 모드')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('메시지를 입력하세요...')).toBeInTheDocument();
  });

  it('disables send button when content exceeds max length', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} maxContentLength={10} />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
    fireEvent.change(textarea, { target: { value: 'a'.repeat(11) } });

    const sendButton = screen.getByRole('button', { name: /전송/i });
    expect(sendButton).toBeDisabled();
  });

  it('shows character count', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} maxContentLength={2000} />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
    fireEvent.change(textarea, { target: { value: '안녕' } });

    expect(screen.getByText('2 / 2000자')).toBeInTheDocument();
  });

  it('disables input when pending', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSend={handleSend} isPending={true} />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
    expect(textarea).toBeDisabled();
  });
});
