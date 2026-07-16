import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { updateOwnFullName, updateOwnPassword } from "@/services/ownProfileService";
import { extractErrorMessage } from "@/services/api";

const schema = z
  .object({
    fullName: z.string().min(2, "Nome demasiado curto"),
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

export function EditProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { fullName: user?.fullName ?? "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (values.fullName !== user.fullName) {
        await updateOwnFullName(user.id, values.fullName);
      }
      if (values.newPassword) {
        await updateOwnPassword(values.newPassword);
      }
      await refreshUser();
      toast.success("Perfil atualizado.");
      reset({ fullName: values.fullName, newPassword: "", confirmPassword: "" });
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
          <DialogDescription>Atualize o seu nome ou a sua palavra-passe.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
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
