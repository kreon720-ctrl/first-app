import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBreakpoint } from '../useBreakpoint';

describe('useBreakpoint', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mobile breakpoint when width < 640px', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    
    const { result } = renderHook(() => useBreakpoint(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.breakpoint).toBe('mobile');
  });

  it('returns tablet breakpoint when width >= 640px and < 1024px', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(768);
    
    const { result } = renderHook(() => useBreakpoint(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.breakpoint).toBe('tablet');
  });

  it('returns desktop breakpoint when width >= 1024px', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1280);
    
    const { result } = renderHook(() => useBreakpoint(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.breakpoint).toBe('desktop');
  });

  it('updates on window resize', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    
    const { result } = renderHook(() => useBreakpoint(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isMobile).toBe(true);

    // Update the mock and dispatch resize event
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1280);
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);
    
    // Wait for the state to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });
});
