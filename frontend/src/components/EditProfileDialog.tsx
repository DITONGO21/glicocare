import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Fingerprint, Trash2 } from "lucide-react";
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
import {
  isWebAuthnSupported,
  listWebAuthnDevices,
  registerWebAuthnDevice,
  removeWebAuthnDevice,
  type WebAuthnDevice,
} from "@/services/webauthnService";

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
  const [devices, setDevices] = useState<WebAuthnDevice[]>([]);
  const [isDevicesLoading, setIsDevicesLoading] = useState(false);
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);
  const webauthnSupported = isWebAuthnSupported();

  const loadDevices = async () => {
    if (!user) return;
    setIsDevicesLoading(true);
    try {
      setDevices(await listWebAuthnDevices(user.id));
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível carregar os dispositivos biométricos."));
    } finally {
      setIsDevicesLoading(false);
    }
  };

  useEffect(() => {
    if (open && webauthnSupported) {
      loadDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRegisterDevice = async () => {
    setIsRegisteringDevice(true);
    try {
      await registerWebAuthnDevice();
      toast.success("Dispositivo registado para login biométrico.");
      await loadDevices();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível registar este dispositivo."));
    } finally {
      setIsRegisteringDevice(false);
    }
  };

  const handleRemoveDevice = async (id: string) => {
    try {
      await removeWebAuthnDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
      toast.success("Dispositivo removido.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível remover o dispositivo."));
    }
  };
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

        {webauthnSupported && (
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Fingerprint className="h-4 w-4" />
                Login biométrico
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRegisteringDevice}
                onClick={handleRegisterDevice}
              >
                {isRegisteringDevice ? "A registar..." : "Registar este dispositivo"}
              </Button>
            </div>
            {isDevicesLoading ? (
              <p className="text-xs text-muted-foreground">A carregar dispositivos...</p>
            ) : devices.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum dispositivo registado. Registe este dispositivo para poder entrar com impressão
                digital, Face ID ou Windows Hello.
              </p>
            ) : (
              <ul className="space-y-1">
                {devices.map((device) => (
                  <li
                    key={device.id}
                    className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs"
                  >
                    <span>{device.deviceLabel ?? "Dispositivo"}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveDevice(device.id)}
                      aria-label="Remover dispositivo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
