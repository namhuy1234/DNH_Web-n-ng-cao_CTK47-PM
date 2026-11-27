import Link from "next/link";
import { ChefHat } from "lucide-react";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ChefHat className="size-5" />
      </span>
      <span className="text-lg">{SITE.name}</span>
    </Link>
  );
}
