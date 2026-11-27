"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined) => React.ReactNode;
}

function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  const messageId = error || hint ? `${id}-msg` : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children(messageId)}
      {messageId && (
        <p id={messageId} className={error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type InputFieldProps = React.ComponentProps<"input"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

/** Ô nhập có nhãn và dòng báo lỗi; nhận thẳng kết quả của register() từ React Hook Form. */
export function TextField({ id, label, error, hint, type, className, ...props }: InputFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {(describedBy) => (
        <div className="relative">
          <Input
            id={id}
            type={isPassword && visible ? "text" : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(isPassword && "pr-9", className)}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = React.ComponentProps<"textarea"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function TextAreaField({ id, label, error, hint, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {(describedBy) => (
        <Textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      )}
    </FieldShell>
  );
}

/** Lỗi chung của form (không gắn với ô nào), ví dụ sai mật khẩu, mất mạng. */
export function FormAlert({ message, variant = "destructive" }: { message?: string | null; variant?: "destructive" | "default" }) {
  if (!message) return null;
  return (
    <Alert variant={variant} role={variant === "destructive" ? "alert" : "status"}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
