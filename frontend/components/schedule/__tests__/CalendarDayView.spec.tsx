import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CalendarDayView, computeLayout, getKSTMinutes, HOUR_PX } from '@/components/schedule/CalendarDayView';
import type { Schedule } from '@/types/schedule';

// KST = UTC+9. 테스트 일자: 2026-04-15 (KST)
// 시간 헬퍼: KST HH:MM → UTC ISO 문자열
function kstToUtc(dateStr: string, hh: number, mm = 0): string {
  return `${dateStr}T${String(hh - 9 < 0 ? hh - 9 + 24 : hh - 9).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`;
}

// 당일(2026-04-15 KST) ISO UTC 문자열 생성 헬퍼
const D = '2026-04-15';
function utc(hh: number, mm = 0): string {
  return kstToUtc(D, hh, mm);
}

function makeSchedule(id: string, startHH: number, endHH: number, opts?: Partial<Schedule>): Schedule {
  return {
    id,
    teamId: 'team-1',
    title: `일정 ${id}`,
    description: null,
    startAt: utc(startHH),
    endAt: utc(endHH),
    createdBy: 'user-1',
    createdAt: utc(0),
    updatedAt: utc(0),
    ...opts,
  };
}

const mockDate = new Date('2026-04-15T00:00:00.000Z'); // 2026-04-15 09:00 KST

// ─── getKSTMinutes ────────────────────────────────────────────────────────────

describe('getKSTMinutes', () => {
  it('converts UTC to KST minutes from midnight (09:00 KST = 0:00 UTC)', () => {
    expect(getKSTMinutes('2026-04-15T00:00:00.000Z')).toBe(9 * 60); // 09:00 KST = 540
  });

  it('09:30 KST', () => {
    expect(getKSTMinutes('2026-04-15T00:30:00.000Z')).toBe(9 * 60 + 30);
  });

  it('00:00 KST = 15:00 UTC prev day', () => {
    expect(getKSTMinutes('2026-04-14T15:00:00.000Z')).toBe(0);
  });
});

// ─── computeLayout ────────────────────────────────────────────────────────────

describe('computeLayout', () => {
  it('빈 배열 → 빈 배열 반환', () => {
    expect(computeLayout([])).toEqual([]);
  });

  it('단일 일정 → column=0, totalColumns=1', () => {
    const result = computeLayout([makeSchedule('A', 10, 11)]);
    expect(result).toHaveLength(1);
    expect(result[0].column).toBe(0);
    expect(result[0].totalColumns).toBe(1);
  });

  it('연속 일정(겹치지 않음) → 모두 column=0, totalColumns=1', () => {
    // A: 10-11, B: 11-12 → 겹치지 않음, 같은 컬럼 재사용
    const result = computeLayout([makeSchedule('A', 10, 11), makeSchedule('B', 11, 12)]);
    expect(result[0].column).toBe(0);
    expect(result[1].column).toBe(0);
    expect(result[0].totalColumns).toBe(1);
    expect(result[1].totalColumns).toBe(1);
  });

  it('2개 겹치는 일정 → column 0,1 / totalColumns=2', () => {
    // A: 10-12, B: 10-12 → 완전 겹침
    const result = computeLayout([makeSchedule('A', 10, 12), makeSchedule('B', 10, 12)]);
    const cols = result.map(r => r.column).sort();
    expect(cols).toEqual([0, 1]);
    result.forEach(r => expect(r.totalColumns).toBe(2));
  });

  it('3개 겹치는 일정 → columns 0,1,2 / totalColumns=3', () => {
    const s = [makeSchedule('A', 9, 12), makeSchedule('B', 9, 12), makeSchedule('C', 9, 12)];
    const result = computeLayout(s);
    const cols = result.map(r => r.column).sort();
    expect(cols).toEqual([0, 1, 2]);
    result.forEach(r => expect(r.totalColumns).toBe(3));
  });

  it('일부만 겹치는 경우: A(9-11), B(10-12), C(11-13)', () => {
    // A-B 겹침, B-C 겹침, A-C 비겹침
    const s = [makeSchedule('A', 9, 11), makeSchedule('B', 10, 12), makeSchedule('C', 11, 13)];
    const result = computeLayout(s);
    // A: col 0, B: col 1 (겹침), C: col 0 (A 끝나서 재사용)
    const byId = Object.fromEntries(result.map(r => [r.schedule.id, r]));
    expect(byId['A'].column).toBe(0);
    expect(byId['B'].column).toBe(1);
    expect(byId['C'].column).toBe(0);
    // A와 B의 totalColumns = 2 (서로 겹침)
    expect(byId['A'].totalColumns).toBe(2);
    expect(byId['B'].totalColumns).toBe(2);
    // C와 B의 totalColumns = 2 (서로 겹침)
    expect(byId['C'].totalColumns).toBe(2);
  });

  it('5개 겹치는 일정 → totalColumns=5', () => {
    const s = Array.from({ length: 5 }, (_, i) => makeSchedule(`S${i}`, 9, 12));
    const result = computeLayout(s);
    result.forEach(r => expect(r.totalColumns).toBe(5));
  });

  it('6개 겹치는 일정 → totalColumns=6 (가로 스크롤 케이스)', () => {
    const s = Array.from({ length: 6 }, (_, i) => makeSchedule(`S${i}`, 9, 12));
    const result = computeLayout(s);
    result.forEach(r => expect(r.totalColumns).toBe(6));
  });

  it('startMin이 정확히 계산됨 (09:30 KST)', () => {
    const s = makeSchedule('A', 9, 11, { startAt: utc(9, 30) });
    const result = computeLayout([s]);
    expect(result[0].startMin).toBe(9 * 60 + 30);
  });

  it('최소 높이 보장: 1분짜리 일정 → endMin = startMin + 15', () => {
    const s = makeSchedule('A', 10, 10, { endAt: utc(10, 1) });
    const result = computeLayout([s]);
    expect(result[0].endMin - result[0].startMin).toBe(15);
  });

  it('정렬: 나중에 시작하는 일정이 먼저 들어와도 올바른 컬럼 배정', () => {
    // B가 먼저 배열에 있어도 A(10시)가 먼저 정렬돼야 함
    const s = [makeSchedule('B', 11, 12), makeSchedule('A', 10, 12)];
    const result = computeLayout(s);
    const byId = Object.fromEntries(result.map(r => [r.schedule.id, r]));
    expect(byId['A'].column).toBe(0); // A가 먼저 시작 → col 0
    expect(byId['B'].column).toBe(1); // B가 A와 겹침 → col 1
  });

  it('같은 시작 시각: 긴 일정 우선 → col 0', () => {
    // A: 10-14(4h), B: 10-11(1h) → 둘 다 동시 시작, A가 더 긴 일정
    const s = [makeSchedule('B', 10, 11), makeSchedule('A', 10, 14)];
    const result = computeLayout(s);
    const byId = Object.fromEntries(result.map(r => [r.schedule.id, r]));
    // 정렬: A(10-14)가 B(10-11)보다 먼저 → A=col0
    expect(byId['A'].column).toBe(0);
    expect(byId['B'].column).toBe(1);
  });
});

// ─── CalendarDayView 컴포넌트 렌더링 ─────────────────────────────────────────

describe('CalendarDayView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('날짜 헤더가 표시된다', () => {
    render(<CalendarDayView currentDate={mockDate} />);
    expect(screen.getByText(/2026년/)).toBeInTheDocument();
  });

  it('일정 없을 때 "일정 0개" 표시', () => {
    render(<CalendarDayView currentDate={mockDate} schedules={[]} />);
    expect(screen.getByText('일정 0개')).toBeInTheDocument();
  });

  it('단일 일정 표시', () => {
    const schedules = [makeSchedule('A', 10, 11)];
    render(<CalendarDayView currentDate={mockDate} schedules={schedules} />);
    expect(screen.getByText('일정 A')).toBeInTheDocument();
    expect(screen.getByText('일정 1개')).toBeInTheDocument();
  });

  it('다른 날 일정은 표시되지 않는다', () => {
    const otherDay: Schedule = {
      id: 'other',
      teamId: 'team-1',
      title: '다른날 일정',
      description: null,
      startAt: '2026-04-16T01:00:00.000Z', // 2026-04-16 10:00 KST
      endAt: '2026-04-16T02:00:00.000Z',
      createdBy: 'user-1',
      createdAt: utc(0),
      updatedAt: utc(0),
    };
    render(<CalendarDayView currentDate={mockDate} schedules={[otherDay]} />);
    expect(screen.queryByText('다른날 일정')).not.toBeInTheDocument();
    expect(screen.getByText('일정 0개')).toBeInTheDocument();
  });

  it('여러 일정이 모두 표시된다', () => {
    const schedules = [makeSchedule('A', 9, 10), makeSchedule('B', 11, 12), makeSchedule('C', 14, 15)];
    render(<CalendarDayView currentDate={mockDate} schedules={schedules} />);
    expect(screen.getByText('일정 A')).toBeInTheDocument();
    expect(screen.getByText('일정 B')).toBeInTheDocument();
    expect(screen.getByText('일정 C')).toBeInTheDocument();
    expect(screen.getByText('일정 3개')).toBeInTheDocument();
  });

  it('일정 클릭 시 onScheduleClick 호출', () => {
    const onClick = vi.fn();
    const schedules = [makeSchedule('A', 10, 11)];
    render(<CalendarDayView currentDate={mockDate} schedules={schedules} onScheduleClick={onClick} />);
    fireEvent.click(screen.getByText('일정 A'));
    expect(onClick).toHaveBeenCalledWith(schedules[0]);
  });

  it('2개 겹치는 일정: 두 일정 모두 표시', () => {
    const schedules = [makeSchedule('A', 10, 12), makeSchedule('B', 10, 12)];
    render(<CalendarDayView currentDate={mockDate} schedules={schedules} />);
    expect(screen.getByText('일정 A')).toBeInTheDocument();
    expect(screen.getByText('일정 B')).toBeInTheDocument();
  });

  it('세로 바: 절대 위치 style 적용 (top, height, left, width)', () => {
    const schedules = [makeSchedule('A', 10, 11)]; // 10:00~11:00 KST
    const { container } = render(
      <CalendarDayView currentDate={mockDate} schedules={schedules} />
    );
    // 일정 바: left에 % 값이 있는 div만 선택 (grid line과 구분)
    const bars = container.querySelectorAll<HTMLElement>('[style*="left:"][style*="%"]');
    expect(bars.length).toBeGreaterThan(0);
    const barEl = bars[0];
    // 10:00 KST = 600분 → top = (600/60)*56 = 560px
    expect(barEl.style.top).toBe('560px');
    // 1시간 = 56px height
    expect(barEl.style.height).toBe('56px');
  });

  it('2개 겹침: 각각 50% 너비', () => {
    const schedules = [makeSchedule('A', 10, 12), makeSchedule('B', 10, 12)];
    const { container } = render(
      <CalendarDayView currentDate={mockDate} schedules={schedules} />
    );
    const bars = container.querySelectorAll<HTMLElement>('[style*="top:"][style*="left:"]');
    // 둘 다 50% 너비
    const widths = Array.from(bars).map(el => el.style.width);
    widths.forEach(w => expect(w).toBe('50%'));
  });

  it('3개 겹침: 각각 33.33...% 너비', () => {
    const schedules = [makeSchedule('A', 10, 12), makeSchedule('B', 10, 12), makeSchedule('C', 10, 12)];
    const { container } = render(
      <CalendarDayView currentDate={mockDate} schedules={schedules} />
    );
    const bars = container.querySelectorAll<HTMLElement>('[style*="top:"][style*="left:"]');
    const widths = Array.from(bars).map(el => parseFloat(el.style.width));
    widths.forEach(w => expect(w).toBeCloseTo(33.33, 1));
  });

  it('6개 겹침: 각각 20% 너비 (가로 스크롤 케이스)', () => {
    const schedules = Array.from({ length: 6 }, (_, i) => makeSchedule(`S${i}`, 9, 12));
    const { container } = render(
      <CalendarDayView currentDate={mockDate} schedules={schedules} />
    );
    const bars = container.querySelectorAll<HTMLElement>('[style*="top:"][style*="left:"]');
    const widths = Array.from(bars).map(el => parseFloat(el.style.width));
    widths.forEach(w => expect(w).toBe(20));
  });

  it('6개 겹침: 가로 스크롤 컨테이너(minWidth >= 120%) 존재', () => {
    const schedules = Array.from({ length: 6 }, (_, i) => makeSchedule(`S${i}`, 9, 12));
    const { container } = render(
      <CalendarDayView currentDate={mockDate} schedules={schedules} />
    );
    // minWidth: 6 * 20% = 120%
    const scrollInner = container.querySelector('[style*="min-width: 120%"]') as HTMLElement | null;
    expect(scrollInner).not.toBeNull();
  });

  it('연속 일정(겹치지 않음): 각각 100% 너비', () => {
    const schedules = [makeSchedule('A', 9, 10), makeSchedule('B', 10, 11)];
    const { container } = render(
      <CalendarDayView currentDate={mockDate} schedules={schedules} />
    );
    const bars = container.querySelectorAll<HTMLElement>('[style*="top:"][style*="left:"]');
    const widths = Array.from(bars).map(el => el.style.width);
    widths.forEach(w => expect(w).toBe('100%'));
  });

  it('분(minute) 포함 위치 계산: 10:30 시작', () => {
    const s = makeSchedule('A', 10, 11, { startAt: utc(10, 30) });
    const { container } = render(
      <CalendarDayView currentDate={mockDate} schedules={[s]} />
    );
    const bars = container.querySelectorAll<HTMLElement>('[style*="left:"][style*="%"]');
    expect(bars.length).toBeGreaterThan(0);
    // 10:30 KST = 630분 → top = (630/60)*56 = 588px
    expect(bars[0].style.top).toBe('588px');
  });

  it('24개 시간 레이블이 모두 표시된다', () => {
    render(<CalendarDayView currentDate={mockDate} />);
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, '0')}:00`;
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('description이 있는 일정: 높이가 충분하면 설명 표시', () => {
    // 2시간짜리 일정 → height = 2 * 56 = 112px ≥ 56
    const s = makeSchedule('A', 10, 12, { description: '상세 설명 텍스트' });
    render(<CalendarDayView currentDate={mockDate} schedules={[s]} />);
    expect(screen.getByText('상세 설명 텍스트')).toBeInTheDocument();
  });
});
