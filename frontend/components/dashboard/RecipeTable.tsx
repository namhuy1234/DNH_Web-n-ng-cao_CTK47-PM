import Link from "next/link";
import { Pencil } from "lucide-react";
import { DifficultyBadge } from "@/components/recipe/RecipeCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_LABELS, formatDate } from "@/lib/format";
import type { RecipeStatus, RecipeSummaryDto } from "@/types";

const STATUS_VARIANT: Record<RecipeStatus, "default" | "secondary" | "outline"> = {
  Published: "default",
  Draft: "secondary",
  Archived: "outline",
};

export function RecipeTable({ recipes }: { recipes: RecipeSummaryDto[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên món</TableHead>
            <TableHead className="hidden md:table-cell">Danh mục</TableHead>
            <TableHead>Độ khó</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="hidden sm:table-cell">Ngày tạo</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipes.map((recipe) => (
            <TableRow key={recipe.id}>
              <TableCell className="font-medium">
                <Link href={`/recipes/${recipe.slug}`} className="hover:text-primary">
                  {recipe.title}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">{recipe.categoryName}</TableCell>
              <TableCell>
                <DifficultyBadge difficulty={recipe.difficulty} />
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[recipe.status]}>{STATUS_LABELS[recipe.status]}</Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(recipe.createdAt)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-sm" aria-label={`Sửa ${recipe.title}`} disabled>
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
