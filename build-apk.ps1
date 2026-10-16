# NEXUS Android APK Build Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   NEXUS Android APK Build Pipeline     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Building web bundle and syncing to Android project..." -ForegroundColor Yellow
npm.cmd run android:sync

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Checking Java environment..." -ForegroundColor Yellow
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCmd) {
    Write-Host "Java (JDK 17 or 21) was not detected in your PATH." -ForegroundColor Red
    Write-Host "To compile the .apk binary directly, please either:" -ForegroundColor DarkYellow
    Write-Host "  1. Install Android Studio: https://developer.android.com/studio"
    Write-Host "     Then run: npm run android:open"
    Write-Host "     Click: Build -> Build Bundle(s) / APK(s) -> Build APK(s)"
    Write-Host "  2. Install OpenJDK 21 via winget: winget install Microsoft.OpenJDK.21"
    Write-Host "     And set ANDROID_HOME to your Android SDK directory."
    exit 1
}

Write-Host "`n[3/3] Running Gradle assembleDebug..." -ForegroundColor Yellow
Push-Location android
.\gradlew.bat assembleDebug
$gradleStatus = $LASTEXITCODE
Pop-Location

if ($gradleStatus -eq 0) {
    $apkSource = "android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkSource) {
        Copy-Item -Path $apkSource -Destination ".\NEXUS-debug.apk" -Force
        Write-Host "`n[SUCCESS] APK created successfully at .\NEXUS-debug.apk!" -ForegroundColor Green
    }
} else {
    Write-Host "`nGradle build exited with code $gradleStatus." -ForegroundColor Red
    Write-Host "You can open the project in Android Studio with: npm run android:open" -ForegroundColor Yellow
}
