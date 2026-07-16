import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrGetConversation,
  fetchConversations,
  fetchMessages,
  sendMessage,
} from "@/services/messageService";
import type { CreateConversationRequest, SendMessageRequest } from "@/types/api";

// Polling interval for the "simulated real-time" messaging experience.
// Decision: a real-time channel (WebSockets/SignalR) is out of scope for this phase,
// so we approximate it with periodic refetching via React Query's refetchInterval.
const POLL_INTERVAL_MS = 4000;

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useCreateOrGetConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConversationRequest) => createOrGetConversation(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["conversations", conversationId, "messages"],
    queryFn: () => fetchMessages(conversationId as string),
    enabled: !!conversationId,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendMessageRequest) => sendMessage(conversationId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
