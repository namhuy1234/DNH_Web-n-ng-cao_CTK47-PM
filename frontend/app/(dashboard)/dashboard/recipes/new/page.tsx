import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTY_LABELS } from "@/lib/format";

// Nội dung bị RequireAuth (kiểm tra ở trình duyệt) giữ lại tới khi biết trạng thái đăng nhập,
// nên không thể dựng sẵn App Shell để chuyển trang tức thì. Lab 7 chuyển sang proxy.ts.
export const instant = false;

export const metadata: Metadata = { title: "Viết công thức" };

/** Giao diện tĩnh của form tạo công thức; Lab 7 gắn React Hook Form + Zod và gọi API. */
export default function NewRecipePage() {
  return (
    <>
      <PageHeader title="Viết công thức mới" description="Điền thông tin cơ bản, sau đó thêm nguyên liệu và các bước." />
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Tên món</Label>
            <Input id="title" placeholder="Ví dụ: Phở bò Hà Nội" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Mô tả ngắn</Label>
            <Textarea id="description" rows={3} placeholder="Vài câu giới thiệu món ăn (20–500 ký tự)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Độ khó</Label>
            <Select>
              <SelectTrigger id="difficulty" className="w-full">
                <SelectValue placeholder="Chọn độ khó" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Khẩu phần</Label>
            <Input id="servings" type="number" min={1} max={50} defaultValue={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prepTime">Chuẩn bị (phút)</Label>
            <Input id="prepTime" type="number" min={0} defaultValue={15} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cookTime">Nấu (phút)</Label>
            <Input id="cookTime" type="number" min={0} defaultValue={30} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" disabled>
            Lưu nháp
          </Button>
          <Button disabled>Đăng bài</Button>
        </CardFooter>
      </Card>
    </>
  );
}
