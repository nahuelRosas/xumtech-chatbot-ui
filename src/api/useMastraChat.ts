import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { IApiResponse } from "../config/core/axios/interface/iapi-response";
import type { CreateChatResponse } from "./types/mastra";
import apiService from "../config/core/axios/services/api.service";

export function useMastraChat(
  message: string,
  conversationId: string,
  options?: Partial<UseQueryOptions<IApiResponse<CreateChatResponse>, Error>>
) {
  return useQuery<IApiResponse<CreateChatResponse>, Error>({
    queryKey: ["mastra", "chat", conversationId, message],
    queryFn: async () => {
      const response = await apiService.post<IApiResponse<CreateChatResponse>>(
        "/mastra/chat",
        { message, conversationId }
      );
      if (response) return response;
      throw new Error("Failed to fetch from /mastra/chat");
    },
    ...options,
  });
}
