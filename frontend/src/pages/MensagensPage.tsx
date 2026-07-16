import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useConversations, useMessages, useSendMessage } from "@/hooks/useMessages";
import { extractErrorMessage } from "@/services/api";

// NOTA TÉCNICA: A mensageria usa "polling" (refetchInterval no React Query) em vez de
// WebSockets/SignalR. Um canal em tempo real está fora do âmbito desta fase (Fase 3);
// o polling a cada poucos segundos aproxima a experiência de tempo real com muito
// menos complexidade de infraestrutura, sendo suficiente para o objetivo da PAP.

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Backend ConversationDto exposes doctorName/patientName (not a role-agnostic
// participantName), so the display name depends on which side is logged in.
function participantName(conversation: { doctorName: string; patientName: string }, role: string | undefined) {
  return role === "Doctor" ? conversation.patientName : conversation.doctorName;
}

export function MensagensPage() {
  const { user } = useAuth();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const { data: messages, isLoading: messagesLoading } = useMessages(activeId);
  const sendMessage = useSendMessage(activeId);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!activeId && conversations && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  const activeConversation = useMemo(
    () => conversations?.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const handleSend = async () => {
    if (!text.trim() || !activeId) return;
    try {
      await sendMessage.mutateAsync({ content: text.trim() });
      setText("");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível enviar a mensagem."));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">Converse diretamente com o seu médico/utente.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <Card className="p-2">
          {conversationsLoading ? (
            <LoadingSkeleton rows={4} />
          ) : (conversations ?? []).length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Sem conversas.</p>
          ) : (
            <div className="space-y-1">
              {(conversations ?? []).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    activeId === conv.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(participantName(conv, user?.role))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{participantName(conv, user?.role)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.lastMessagePreview ?? "Sem mensagens"}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex h-[32rem] flex-col p-4">
          {!activeConversation ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Selecione uma conversa para começar.
            </div>
          ) : (
            <>
              <div className="mb-3 border-b border-border pb-3">
                <p className="font-medium">{participantName(activeConversation, user?.role)}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {messagesLoading ? (
                  <LoadingSkeleton rows={4} />
                ) : (
                  (messages ?? []).map((msg) => {
                    const isOwn = msg.senderUserId === user?.id;
                    return (
                      <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                            isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Escreva uma mensagem..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend} disabled={sendMessage.isPending} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
