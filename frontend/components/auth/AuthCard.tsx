import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/** Khung chung của các form tài khoản (đăng nhập, đăng ký, quên/đặt lại mật khẩu). */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>}
    </Card>
  );
}
