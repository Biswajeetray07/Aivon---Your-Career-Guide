"use client";

import useSWR from "swr";
import { listProblems, type ProblemCardDTO, type ProblemsResponse } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProblemsFilters {
  page: number;
  difficulty?: string;
  tags?: string;
  search?: string;
  limit?: number;
}

export interface UseProblemsReturn {
  items: ProblemCardDTO[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  hasMore: boolean;
  mutate: () => void;
}

// ─── SWR Key Builder ──────────────────────────────────────────────────────────

function getKey(filters: ProblemsFilters) {
  return [
    "problems",
    filters.page,
    filters.limit || 20,
    filters.difficulty || "",
    filters.tags || "",
    filters.search || "",
  ];
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher([, page, limit, difficulty, tags, search]: [string, number, number, string, string, string]): Promise<ProblemsResponse> {
  return listProblems({
    page,
    limit,
    difficulty: difficulty || undefined,
    tags: tags || undefined,
    search: search || undefined,
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProblems(filters: ProblemsFilters): UseProblemsReturn {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ProblemsResponse>(
    getKey(filters),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10_000,
      keepPreviousData: true, // Crucial for smooth pagination UI transitions
    }
  );

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? filters.page,
    limit: data?.limit ?? (filters.limit || 20),
    hasMore: data?.hasMore ?? false,
    isLoading: isLoading && !data,
    isValidating,
    isError: !!error,
    mutate: () => mutate(),
  };
}
