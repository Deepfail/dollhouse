import { queryClient, queryKeys } from '@/lib/query';
import { createCharacter, deleteCharacter, listCharacters, updateCharacter } from '@/repo/characters';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useCharacters() {
  const {
    data: characters,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.characters.list(),
    queryFn: listCharacters,
  });

  const createMutation = useMutation({
    mutationFn: createCharacter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.all });
      toast.success('Character created successfully!');
    },
    onError: (error: Error) => {
      console.error('Error creating character:', error);
      toast.error('Failed to create character');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateCharacter(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.all });
      toast.success('Character updated successfully!');
    },
    onError: (error: Error) => {
      console.error('Error updating character:', error);
      toast.error('Failed to update character');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCharacter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.all });
      toast.success('Character deleted successfully!');
    },
    onError: (error: Error) => {
      console.error('Error deleting character:', error);
      toast.error('Failed to delete character');
    },
  });

  return {
    characters: characters || [],
    isLoading,
    error,
    createCharacter: createMutation.mutate,
    updateCharacter: updateMutation.mutate,
    deleteCharacter: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useCharacter(id: string) {
  return useQuery({
    queryKey: queryKeys.characters.detail(id),
    queryFn: async () => {
      const characters = await listCharacters();
      return characters.find((char: any) => char.id === id);
    },
    enabled: !!id,
  });
}