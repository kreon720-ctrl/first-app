import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('border-gray-300');
  });

  it('renders with label', () => {
    render(<Input label="Email" />);
    const label = screen.getByText('Email');
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
  });

  it('renders with helper text', () => {
    render(<Input helperText="Enter your email" />);
    const helperText = screen.getByText('Enter your email');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('text-gray-500');
  });

  it('renders error state', () => {
    render(<Input error helperText="Invalid email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-error-500');
    expect(input).toHaveClass('bg-error-50');
    const errorText = screen.getByText('Invalid email');
    expect(errorText).toHaveClass('text-error-500');
  });

  it('renders different input types', () => {
    render(<Input type="email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders with maxLength', () => {
    render(<Input maxLength={100} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '100');
  });

  it('renders disabled state', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:bg-gray-100');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('generates id from label', () => {
    render(<Input label="User Email" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('User Email');
    expect(input.id).toBe('user-email');
    expect(label).toHaveAttribute('for', 'user-email');
  });

  it('uses explicit id when provided', () => {
    render(<Input id="custom-id" label="Email" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Email');
    expect(input.id).toBe('custom-id');
    expect(label).toHaveAttribute('for', 'custom-id');
  });
});
