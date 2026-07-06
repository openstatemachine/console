import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthStatusResponse } from '../api/types'
import { authApi } from './authApi'
import { authKeys } from './authKeys'
import { fetchAuthStatus } from './fetchAuthStatus'

export function useAuthStatus() {
  return useQuery({
    queryKey: authKeys.status(),
    queryFn: fetchAuthStatus,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.status(), data)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: (data) => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.status(), data)
    },
  })
}

export function useSetup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      username,
      password,
      confirmPassword,
    }: {
      username: string
      password: string
      confirmPassword: string
    }) => authApi.setup(username, password, confirmPassword),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.status(), data)
    },
  })
}

/** Backward-compatible composite hook used by guards and layout. */
export function useAuth() {
  const { data: status, isLoading: loading, refetch } = useAuthStatus()
  const loginMutation = useLogin()
  const logoutMutation = useLogout()
  const setupMutation = useSetup()

  return {
    status: status ?? null,
    loading,
    refresh: async () => {
      await refetch()
    },
    login: async (username: string, password: string) => {
      await loginMutation.mutateAsync({ username, password })
    },
    logout: async () => {
      await logoutMutation.mutateAsync()
    },
    setup: async (username: string, password: string, confirmPassword: string) => {
      await setupMutation.mutateAsync({ username, password, confirmPassword })
    },
  }
}

export type { AuthStatusResponse }
