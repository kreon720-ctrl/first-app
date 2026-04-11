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
