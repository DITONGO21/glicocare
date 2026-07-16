import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import {
  updateOwnFullName,
  updateOwnPassword,
  updateOwnEmail,
  uploadOwnAvatar,
} from "@/services/ownProfileService";
import { extractErrorMessage } from "@/services/api";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB

const schema = z
  .object({
    fullName: z.string().min(2, "Nome demasiado curto"),
    email: z.string().min(1, "O email é obrigatório").email("Introduza um email válido"),
    newPassword: z.string().min(0),
    confirmPassword: z.string().min(0),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword.length === 0 || v.newPassword.length >= 8, {
    message: "A nova palavra-passe deve ter pelo menos 8 caracteres",
    path: ["newPassword"],
  });

type FormValues = z.infer<typeof schema>;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function EditProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { fullName: user?.fullName ?? "", email: user?.email ?? "", newPassword: "", confirmPassword: "" },
  });

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um ficheiro de imagem.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("A imagem não pode exceder 3 MB.");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      await uploadOwnAvatar(user.id, file);
      await refreshUser();
      toast.success("Fotografia atualizada.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível carregar a fotografia."));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (values.fullName !== user.fullName) {
        await updateOwnFullName(user.id, values.fullName);
      }
      if (values.email !== user.email) {
        await updateOwnEmail(values.email);
        toast.info("Enviámos um link de confirmação para o novo email. O email só muda depois de o confirmar.");
      }
      if (values.newPassword) {
        await updateOwnPassword(values.newPassword);
      }
      await refreshUser();
      toast.success("Perfil atualizado.");
      reset({ fullName: values.fullName, email: values.email, newPassword: "", confirmPassword: "" });
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível atualizar o perfil."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>Atualize a sua fotografia, nome, email ou palavra-passe.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
            className="group relative rounded-full"
            aria-label="Alterar fotografia de perfil"
          >
            <Avatar size="lg" className="size-20">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
              <AvatarFallback className="text-lg">{user ? initials(user.fullName) : ""}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
          </button>
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {isUploadingAvatar ? "A carregar..." : "Alterar fotografia"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            <p className="text-xs text-muted-foreground">
              Alterar o email exige confirmação através de um link enviado para o novo endereço.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nova palavra-passe (opcional)</Label>
            <Input id="newPassword" type="password" {...register("newPassword")} />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova palavra-passe</Label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
