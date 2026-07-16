import { supabase } from "@/services/supabaseClient";
import type { ConversationDto, CreateConversationRequest, MessageDto, SendMessageRequest } from "@/types/api";

function mapConversation(row: any, unreadCount: number, lastMessage?: any): ConversationDto {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    doctorName: row.doctors?.profiles?.full_name ?? "",
    patientId: row.patient_id,
    patientName: row.patients?.profiles?.full_name ?? "",
    isArchived: row.is_archived,
    unreadCount,
    lastMessagePreview: lastMessage?.content ?? null,
    lastMessageAt: lastMessage?.created_at ?? null,
  };
}

export async function fetchConversations(): Promise<ConversationDto[]> {
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, doctor_id, patient_id, is_archived, doctors(profiles(full_name)), patients(profiles(full_name))")
    .is("deleted_at", null);
  if (error) throw error;

  const results: ConversationDto[] = [];
  for (const conv of conversations as any[]) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conv.id)
      .eq("status", "Unread");

    const { data: lastMsgRows } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1);

    results.push(mapConversation(conv, count ?? 0, lastMsgRows?.[0]));
  }
  return results;
}

export async function createOrGetConversation(payload: CreateConversationRequest): Promise<ConversationDto> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, doctor_id, patient_id, is_archived, doctors(profiles(full_name)), patients(profiles(full_name))")
    .eq("doctor_id", payload.doctorId)
    .eq("patient_id", payload.patientId)
    .maybeSingle();

  if (existing) return mapConversation(existing, 0);

  const { data, error } = await supabase
    .from("conversations")
    .insert({ doctor_id: payload.doctorId, patient_id: payload.patientId })
    .select("id, doctor_id, patient_id, is_archived, doctors(profiles(full_name)), patients(profiles(full_name))")
    .single();
  if (error) throw error;
  return mapConversation(data, 0);
}

function mapMessage(row: any): MessageDto {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function fetchMessages(conversationId: string): Promise<MessageDto[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_user_id, content, status, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data as any[]).map(mapMessage);
}

export async function sendMessage(conversationId: string, payload: SendMessageRequest): Promise<MessageDto> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_user_id: userData.user?.id,
      content: payload.content,
      status: "Unread",
    })
    .select("id, conversation_id, sender_user_id, content, status, created_at")
    .single();
  if (error) throw error;
  return mapMessage(data);
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("messages")
    .update({ status: "Read" })
    .eq("conversation_id", conversationId)
    .neq("sender_user_id", userData.user?.id)
    .eq("status", "Unread");
  if (error) throw error;
}

export async function toggleConversationArchive(conversationId: string): Promise<ConversationDto> {
  const { data: current, error: currentError } = await supabase
    .from("conversations")
    .select("is_archived")
    .eq("id", conversationId)
    .single();
  if (currentError) throw currentError;

  const { data, error } = await supabase
    .from("conversations")
    .update({ is_archived: !current.is_archived })
    .eq("id", conversationId)
    .select("id, doctor_id, patient_id, is_archived, doctors(profiles(full_name)), patients(profiles(full_name))")
    .single();
  if (error) throw error;
  return mapConversation(data, 0);
}
