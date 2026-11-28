# Kiem thu API Lab 3. Chay API truoc: dotnet run --project src/CulinaryBlog.API
# Ket qua ghi vao docs\ket-qua-api.txt
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = Split-Path $PSScriptRoot -Parent
$base = 'http://localhost:5000'
$out = Join-Path $root 'docs\ket-qua-api.txt'
$body = Join-Path $env:TEMP 'lab3-body.json'
$script:results = @()
$script:failed = 0

function Invoke-Case($expected, $method, $path, $json) {
    $arguments = @('-s', '-X', $method, "$base$path", '-w', "`n%{http_code}|%{content_type}")
    if ($null -ne $json) {
        [IO.File]::WriteAllText($body, $json, (New-Object Text.UTF8Encoding $false))
        $arguments += @('-H', 'Content-Type: application/json', '--data-binary', "@$body")
    }
    $lines = @(& curl.exe @arguments)
    $status, $type = $lines[-1].Split('|')
    $content = ($lines[0..($lines.Count - 2)] -join '')
    if ($content.Length -gt 230) { $content = $content.Substring(0, 230) + '...' }
    $mark = if ([int]$status -eq $expected) { 'DAT' } else { $script:failed++; 'SAI' }
    $request = "$method $path"
    if ($null -ne $json) { $request += "  $json" }
    $script:results += "[$mark] $request", "      -> $status (mong doi $expected)  $type", "      $content", ''
}

$name = "Mon thu Lab3 $(Get-Date -Format 'HHmmss')"
$categories = Invoke-RestMethod "$base/api/v1/categories"
$slug = (Invoke-RestMethod "$base/api/v1/recipes?pageSize=1").items[0].slug

Invoke-Case 200 GET '/api/v1/categories'
Invoke-Case 201 POST '/api/v1/categories' "{`"name`":`"$name`",`"description`":`"Du lieu kiem thu`"}"
Invoke-Case 409 POST '/api/v1/categories' "{`"name`":`"$name`"}"
Invoke-Case 422 POST '/api/v1/categories' '{"name":"a"}'
Invoke-Case 400 POST '/api/v1/categories' '{"name":'
Invoke-Case 200 GET '/api/v1/recipes?page=1&pageSize=2'
Invoke-Case 200 GET '/api/v1/recipes?difficulty=Easy&sort=title&pageSize=1'
Invoke-Case 422 GET '/api/v1/recipes?page=0&pageSize=100'
Invoke-Case 400 GET '/api/v1/recipes?page=abc'
Invoke-Case 200 GET "/api/v1/recipes/$slug"
Invoke-Case 404 GET '/api/v1/recipes/khong-ton-tai'
$hidden = & docker exec culinary-postgres psql -U culinary -d culinaryblog_lab3 -tAc 'select \"Slug\" from \"Recipes\" where \"Status\" = 0 limit 1'
Invoke-Case 403 GET "/api/v1/recipes/$hidden"
Invoke-Case 404 GET '/api/v1/khong-co'

# Xoa danh muc vua tao de database tro lai nhu cu
& docker exec culinary-postgres psql -U culinary -d culinaryblog_lab3 -qc "delete from \`"Categories\`" where \`"Name\`" like 'Mon thu Lab3%'"

$total = $script:results.Count / 4
$header = "Ket qua kiem thu API - chay ngay $(Get-Date -Format 'dd/MM/yyyy HH:mm')", "Dat $($total - $script:failed)/$total truong hop", ''
$header + $script:results | Out-File $out -Encoding utf8
$header + $script:results
