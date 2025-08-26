import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { IApiResponse } from "../config/core/axios/interface/iapi-response";
import apiService from "../config/core/axios/services/api.service";
import type {
  Quest,
  CreateQuestDto,
  UpdateQuestDto,
  CreateQuestsResponse,
} from "./types/quests";

export function useGetQuests(
  options?: Partial<UseQueryOptions<IApiResponse<Quest[]>, Error>>
) {
  return useQuery<IApiResponse<Quest[]>, Error>({
    queryKey: ["quests", "all"],
    queryFn: async () => {
      const res = await apiService.get<IApiResponse<Quest[]>>("/quests");
      if (res) return res;
      throw new Error("Failed to fetch quests");
    },
    ...options,
  });
}

export function useCreateQuests(
  options?: UseMutationOptions<
    IApiResponse<CreateQuestsResponse>,
    Error,
    CreateQuestDto | CreateQuestDto[]
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    IApiResponse<CreateQuestsResponse>,
    Error,
    CreateQuestDto | CreateQuestDto[]
  >({
    mutationFn: async (payload) => {
      const res = await apiService.post<IApiResponse<CreateQuestsResponse>>(
        "/quests",
        payload
      );
      if (res) return res;
      throw new Error("Failed to create quests");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["quests", "all"] }),
    ...options,
  });
}

export function useEditQuest(
  options?: UseMutationOptions<
    IApiResponse<Quest>,
    Error,
    { uid: string; payload: UpdateQuestDto }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    IApiResponse<Quest>,
    Error,
    { uid: string; payload: UpdateQuestDto }
  >({
    mutationFn: async ({ uid, payload }) => {
      const res = await apiService.patch<IApiResponse<Quest>>(
        `/quests/${uid}`,
        payload
      );
      if (res) return res;
      throw new Error("Failed to edit quest");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["quests", "all"] }),
    ...options,
  });
}

export function useDeleteQuest(
  options?: UseMutationOptions<IApiResponse<void>, Error, { uid: string }>
) {
  const queryClient = useQueryClient();
  return useMutation<IApiResponse<void>, Error, { uid: string }>({
    mutationFn: async ({ uid }) => {
      const res = await apiService.delete<IApiResponse<void>>(`/quests/${uid}`);
      if (res) return res;
      throw new Error("Failed to delete quest");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["quests", "all"] }),
    ...options,
  });
}
