"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function useQueryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const getParam = useCallback(
    (key: string, defaultValue = "") => {
      return searchParams.get(key) || defaultValue;
    },
    [searchParams]
  );

  const getIntParam = useCallback(
    (key: string, defaultValue: number) => {
      const val = searchParams.get(key);
      if (!val) return defaultValue;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    },
    [searchParams]
  );

  const setParam = useCallback(
    (key: string, value: string | number | null | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      const currentVal = searchParams.get(key) || "";
      const newVal = value === null || value === undefined ? "" : String(value);

      if (currentVal === newVal) return;

      if (newVal === "") {
        params.delete(key);
      } else {
        params.set(key, newVal);
      }

      const newQuery = params.toString();
      const targetUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.push(targetUrl);
    },
    [searchParams, router, pathname]
  );

  const setParams = useCallback(
    (newParams: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      let hasChanges = false;

      Object.entries(newParams).forEach(([key, value]) => {
        const currentVal = params.get(key) || "";
        const newVal = value === null || value === undefined ? "" : String(value);

        if (currentVal !== newVal) {
          hasChanges = true;
          if (newVal === "") {
            params.delete(key);
          } else {
            params.set(key, newVal);
          }
        }
      });

      if (!hasChanges) return;

      const newQuery = params.toString();
      const targetUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.push(targetUrl);
    },
    [searchParams, router, pathname]
  );

  const clearParams = useCallback(() => {
    if (searchParams.toString() === "") return;
    router.push(pathname);
  }, [searchParams, router, pathname]);

  return {
    searchParams,
    getParam,
    getIntParam,
    setParam,
    setParams,
    clearParams,
  };
}
