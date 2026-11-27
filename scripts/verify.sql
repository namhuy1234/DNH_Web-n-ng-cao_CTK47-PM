-- Kiểm tra yêu cầu dữ liệu của Lab 2
SELECT (SELECT count(*) FROM "Categories")        AS categories,
       (SELECT count(*) FROM "Recipes")           AS recipes,
       (SELECT count(*) FROM "RecipeIngredients") AS ingredients,
       (SELECT count(*) FROM "RecipeSteps")       AS steps,
       (SELECT count(*) FROM "AspNetUsers")       AS users;

SELECT min(i) AS min_ingredients, max(i) AS max_ingredients,
       min(s) AS min_steps,       max(s) AS max_steps
FROM (
    SELECT (SELECT count(*) FROM "RecipeIngredients" x WHERE x."RecipeId" = r."Id") AS i,
           (SELECT count(*) FROM "RecipeSteps" y WHERE y."RecipeId" = r."Id")       AS s
    FROM "Recipes" r
) t;

-- Tìm kiếm không dấu bằng cột SearchVector
SELECT "Title" FROM "Recipes"
WHERE "SearchVector" @@ to_tsquery('simple', 'pho & bo')
LIMIT 3;
