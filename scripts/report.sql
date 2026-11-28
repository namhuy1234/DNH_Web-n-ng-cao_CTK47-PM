-- Culinary Blog - báo cáo nhanh trên PostgreSQL (Lab 8).
-- Chạy:  cmd /c "docker exec -i culinary-postgres psql -U culinary -d culinaryblog < scripts\report.sql"

\echo '== 1. Số công thức theo trạng thái (kể cả đã xóa mềm) =='
SELECT CASE WHEN r."IsDeleted" THEN 'Deleted'
            ELSE (ARRAY['Draft', 'Published', 'Archived'])[r."Status" + 1] END AS trang_thai,
       COUNT(*)                                                         AS so_cong_thuc
FROM "Recipes" r
GROUP BY 1
ORDER BY 1;

\echo '== 2. Người dùng theo vai trò và trạng thái khóa =='
SELECT COALESCE(ro."Name", '(không vai trò)')                    AS vai_tro,
       COUNT(*) FILTER (WHERE u."IsActive")                       AS hoat_dong,
       COUNT(*) FILTER (WHERE NOT u."IsActive")                   AS bi_khoa,
       COUNT(*) FILTER (WHERE u."LockoutEnd" > now())             AS tam_khoa_sai_mat_khau
FROM "AspNetUsers" u
LEFT JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
LEFT JOIN "AspNetRoles" ro ON ro."Id" = ur."RoleId"
GROUP BY ro."Name"
ORDER BY ro."Name";

\echo '== 3. Tác giả viết nhiều nhất (top 10) =='
SELECT u."DisplayName"                                                  AS tac_gia,
       COUNT(r."Id") FILTER (WHERE NOT r."IsDeleted")                   AS tong,
       COUNT(r."Id") FILTER (WHERE r."Status" = 1 AND NOT r."IsDeleted") AS da_dang,
       MAX(r."CreatedAt")::date                                         AS bai_moi_nhat
FROM "AspNetUsers" u
JOIN "Recipes" r ON r."AuthorId" = u."Id"
GROUP BY u."Id", u."DisplayName"
ORDER BY tong DESC, tac_gia
LIMIT 10;

\echo '== 4. Ảnh đã tải lên =='
SELECT COUNT(*)                                        AS tong_anh,
       COUNT(*) FILTER (WHERE i."IsPrimary")           AS anh_bia,
       COUNT(DISTINCT i."RecipeId")                    AS so_cong_thuc_co_anh,
       COUNT(*) FILTER (WHERE i."OriginalUrl" LIKE '/uploads/%') AS luu_tren_may_chu
FROM "RecipeImages" i
WHERE NOT i."IsDeleted";

\echo '== 5. Công thức đã đăng nhưng chưa có ảnh (nên bổ sung) =='
SELECT r."Title" AS cong_thuc, r."PublishedAt"::date AS ngay_dang
FROM "Recipes" r
WHERE r."Status" = 1
  AND NOT r."IsDeleted"
  AND NOT EXISTS (SELECT 1 FROM "RecipeImages" i WHERE i."RecipeId" = r."Id" AND NOT i."IsDeleted")
ORDER BY r."PublishedAt" DESC
LIMIT 10;

\echo '== 6. Kiểm tra toàn vẹn: công thức có nhiều hơn 1 ảnh bìa (phải rỗng) =='
SELECT i."RecipeId", COUNT(*) AS so_anh_bia
FROM "RecipeImages" i
WHERE i."IsPrimary" AND NOT i."IsDeleted"
GROUP BY i."RecipeId"
HAVING COUNT(*) > 1;
