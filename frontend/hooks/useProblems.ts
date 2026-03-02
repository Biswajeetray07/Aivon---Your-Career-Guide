"use client";

import useSWRInfinite from "swr/infinite";
import { listProblems, type ProblemCardDTO, type ProblemsResponse } from "@/lib/api";
import { useCallback, useMemo, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProblemsFilters {
  difficulty?: string;
  tags?: string;
  search?: string;
  limit?: number;
}

export interface UseProblemsReturn {
  items: ProblemCardDTO[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  mutate: () => void;
}

// ─── SWR Key Builder ──────────────────────────────────────────────────────────
// Returns null to stop fetching when there are no more pages.

function getKey(
  pageIndex: number,
  previousPageData: ProblemsResponse | null,
  filters: ProblemsFilters
) {
  // Stop if we know there's no more data
  if (previousPageData && !previousPageData.hasMore) return null;

  return {
    page: pageIndex + 1,
    limit: filters.limit || 20,
    difficulty: filters.difficulty || undefined,
    tags: filters.tags || undefined,
    search: filters.search || undefined,
  };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher(params: {
  page: number;
  limit: number;
  difficulty?: string;
  tags?: string;
  search?: string;
}): Promise<ProblemsResponse> {
  return listProblems(params);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProblems(filters: ProblemsFilters): UseProblemsReturn {
  const inFlightRef = useRef(new Set<number>());

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<ProblemsResponse>(
      (pageIndex, previousPageData) => getKey(pageIndex, previousPageData, filters),
      fetcher,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 10_000,
        keepPreviousData: true,
        revalidateFirstPage: false,
        parallel: false,
      }
    );

  // Flatten all pages into a single items array
  const items = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const result: ProblemCardDTO[] = [];
    for (const page of data) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
    }
    return result;
  }, [data]);

  const total = data?.[0]?.total ?? 0;

  const isLoadingMore = isValidating && size > 1 && data && typeof data[size - 1] === "undefined";

  const hasMore = data ? data[data.length - 1]?.hasMore ?? false : true;

  const loadMore = useCallback(() => {
    if (isValidating || !hasMore) return;
    const nextPage = size + 1;
    if (inFlightRef.current.has(nextPage)) return;
    inFlightRef.current.add(nextPage);
    setSize(nextPage).finally(() => {
      inFlightRef.current.delete(nextPage);
    });
  }, [isValidating, hasMore, size, setSize]);

  const reset = useCallback(() => {
    inFlightRef.current.clear();
    setSize(1);
    mutate();
  }, [setSize, mutate]);

  return {
    items,
    total,
    isLoading: isLoading && !data,
    isLoadingMore: !!isLoadingMore,
    isError: !!error,
    hasMore,
    loadMore,
    reset,
    mutate: () => mutate(),
  };
}
