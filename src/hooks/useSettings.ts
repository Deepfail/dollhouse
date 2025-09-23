import { logger } from '@/lib/logger';
import { queryClient, queryKeys } from '@/lib/query';
import { deleteSetting, getSetting, listSettings, setSetting } from '@/repo/settings';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useSettings() {
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: listSettings,
  });

  const setSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => setSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
    onError: (error: Error) => {
  logger.error('Error setting value:', error);
      toast.error('Failed to save setting');
    },
  });

  const deleteSettingMutation = useMutation({
    mutationFn: deleteSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
    onError: (error: Error) => {
  logger.error('Error deleting setting:', error);
      toast.error('Failed to delete setting');
    },
  });

  return {
    settings: settings || [],
    isLoading,
    error,
    setSetting: setSettingMutation.mutate,
    deleteSetting: deleteSettingMutation.mutate,
    isUpdating: setSettingMutation.isPending,
  };
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: queryKeys.settings.key(key),
    queryFn: () => getSetting(key),
    enabled: !!key,
  });
}