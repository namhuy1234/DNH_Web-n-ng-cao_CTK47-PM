<#
.SYNOPSIS
    Kiểm tra nhanh các thành phần của Culinary Blog đang chạy hay chưa.

.DESCRIPTION
    Gọi lần lượt: container Docker, API /health/live, /health/ready, trang chủ frontend, MailHog.
    In bảng kết quả kèm thời gian phản hồi; trả mã thoát 1 nếu có thành phần lỗi
    (dùng được trong script tự động).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\check-health.ps1
.EXAMPLE
    powershell -File scripts\check-health.ps1 -ApiUrl http://localhost:5000 -Retry 10
#>
param(
    [string]$ApiUrl = "http://localhost:5000",
    [string]$WebUrl = "http://localhost:3000",
    [string]$MailUrl = "http://127.0.0.1:8025",
    # Số lần thử lại cách nhau 2 giây (hữu ích ngay sau khi vừa khởi động).
    [int]$Retry = 1
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Test-Endpoint {
    param([string]$Name, [string]$Url, [int]$Expect = 200)

    for ($i = 1; $i -le $Retry; $i++) {
        $watch = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            $watch.Stop()
            if ($response.StatusCode -eq $Expect) {
                return [pscustomobject]@{ ThanhPhan = $Name; KetQua = "OK"; Ma = $response.StatusCode; ThoiGianMs = $watch.ElapsedMilliseconds; DiaChi = $Url }
            }
        }
        catch {
            $watch.Stop()
            $code = $_.Exception.Response.StatusCode.value__
            if ($i -eq $Retry) {
                $reason = if ($code) { $code } else { "không kết nối" }
                return [pscustomobject]@{ ThanhPhan = $Name; KetQua = "LỖI"; Ma = $reason; ThoiGianMs = $watch.ElapsedMilliseconds; DiaChi = $Url }
            }
        }
        Start-Sleep -Seconds 2
    }
}

$results = @()

# Container Docker (không bắt buộc có docker trong PATH).
if (Get-Command docker -ErrorAction SilentlyContinue) {
    foreach ($container in "culinary-postgres", "culinary-mailhog") {
        $state = docker inspect -f "{{.State.Status}}" $container 2>$null
        $results += [pscustomobject]@{
            ThanhPhan = "Docker $container"; KetQua = $(if ($state -eq "running") { "OK" } else { "LỖI" })
            Ma = $(if ($state) { $state } else { "không có" }); ThoiGianMs = 0; DiaChi = "-"
        }
    }
}

$results += Test-Endpoint "API (process sống)" "$ApiUrl/health/live"
$results += Test-Endpoint "API (database sẵn sàng)" "$ApiUrl/health/ready"
$results += Test-Endpoint "API danh mục" "$ApiUrl/api/v1/categories"
$results += Test-Endpoint "Frontend trang chủ" "$WebUrl/"
$results += Test-Endpoint "MailHog" "$MailUrl/api/v2/messages?limit=1"

$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.KetQua -ne "OK" })
if ($failed.Count -gt 0) {
    Write-Host "$($failed.Count) thành phần chưa chạy. Gợi ý: chạy run-dev.bat" -ForegroundColor Red
    exit 1
}
Write-Host "Tất cả thành phần đang chạy." -ForegroundColor Green
