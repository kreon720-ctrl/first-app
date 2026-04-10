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
  const [error, setError] = useState<string | null>(null);

  const isValid = teamName.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      setError('팀 이름을 입력해주세요.');
      return;
    }

    if (teamName.length > 100) {
      setError('팀 이름은 최대 100자까지 입력 가능합니다.');
      return;
    }

    try {
      const newTeam = await createTeam.mutateAsync({ name: teamName.trim() });
      router.push(`/teams/${newTeam.id}`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError || err instanceof Error ? err.message : undefined;
      setError(msg || '팀 생성 중 오류가 발생했습니다.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeamName(e.target.value);
    if (error) setError(null);
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
          onChange={handleInputChange}
          error={error || undefined}
          disabled={createTeam.isPending}
          maxLength={100}
        />
        <p className="text-xs text-gray-400 text-right">
          {teamName.length} / 100자
        </p>
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
