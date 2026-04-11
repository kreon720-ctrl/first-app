'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateTeam } from '@/hooks/query/useTeams';
import { ApiError } from '@/lib/apiClient';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

export function TeamCreateForm() {
  const router = useRouter();
  const createTeam = useCreateTeam();

  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const isValid = teamName.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; description?: string } = {};

    if (!teamName.trim()) {
      newErrors.name = '팀 이름을 입력해주세요.';
    } else if (teamName.length > 100) {
      newErrors.name = '팀 이름은 최대 100자까지 입력 가능합니다.';
    }

    if (description.length > 500) {
      newErrors.description = '팀 업무 설명은 최대 500자까지 입력 가능합니다.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const newTeam = await createTeam.mutateAsync({
        name: teamName.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
      router.push(`/teams/${newTeam.id}`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError || err instanceof Error ? err.message : undefined;
      setErrors({ name: msg || '팀 생성 중 오류가 발생했습니다.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <p className="text-base font-normal text-gray-600">
        새 팀을 만들어보세요. 생성 후 팀원의 가입 신청을 승인할 수 있습니다.
      </p>

      <div className="flex flex-col gap-1.5">
        <Input
          type="text"
          label="팀 이름 *"
          placeholder="팀 이름을 입력하세요"
          value={teamName}
          onChange={(e) => {
            setTeamName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
          disabled={createTeam.isPending}
          maxLength={100}
        />
        <p className="text-xs text-gray-400 text-right">{teamName.length} / 100자</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="team-description" className="text-sm font-medium text-gray-700">
          팀 업무
        </label>
        <textarea
          id="team-description"
          placeholder="팀의 주요 업무나 목적을 입력하세요"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          disabled={createTeam.isPending}
          maxLength={500}
          rows={3}
          className={[
            'w-full border rounded-xl bg-white px-4 py-2.5 text-base font-normal text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:border-transparent resize-none disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed',
            errors.description
              ? 'border-error-500 bg-error-50 focus:ring-error-500'
              : 'border-gray-300 focus:ring-primary-500',
          ].join(' ')}
        />
        {errors.description && (
          <p className="text-sm font-normal text-error-500" role="alert">
            {errors.description}
          </p>
        )}
        <p className="text-xs text-gray-400 text-right">{description.length} / 500자</p>
      </div>

      {/* 공개/비공개 선택 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">팀 공개 설정</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
              isPublic
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              공개
            </div>
            <p className="text-xs font-normal mt-1 opacity-75">팀 검색 가능</p>
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
              !isPublic
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              비공개
            </div>
            <p className="text-xs font-normal mt-1 opacity-75">개인 일정 관리</p>
          </button>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        fullWidth
        disabled={!isValid || createTeam.isPending}
        loading={createTeam.isPending}
      >
        {createTeam.isPending ? '생성 중...' : '팀 생성'}
      </Button>
    </form>
  );
}
