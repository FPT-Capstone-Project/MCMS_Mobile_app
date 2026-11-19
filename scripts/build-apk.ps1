param(
    [string]$Architectures = 'arm64-v8a,armeabi-v7a,x86_64',
    [string]$AppEnvironment = 'staging'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot

# Prefer configured Java, then the JDK bundled with an installed Android Studio.
$javaCandidates = @($env:JAVA_HOME, 'D:\Android studio\jbr', 'C:\Program Files\Android\Android Studio\jbr')
$javaDirectory = $javaCandidates | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe')) } | Select-Object -First 1
if (!$javaDirectory) { throw 'Java not found. Set JAVA_HOME to an installed JDK or Android Studio jbr directory.' }
$env:JAVA_HOME = $javaDirectory
$sdkCandidates = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk'))
$sdkDirectory = $sdkCandidates | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'platform-tools')) } | Select-Object -First 1
if (!$sdkDirectory) { throw 'Android SDK not found. Install it with Android Studio or set ANDROID_HOME.' }
$env:ANDROID_HOME = $sdkDirectory
$env:ANDROID_SDK_ROOT = $sdkDirectory
$env:PATH = "$javaDirectory\bin;$sdkDirectory\platform-tools;$env:PATH"
$env:NODE_ENV = 'production'
$env:EXPO_PUBLIC_APP_ENV = $AppEnvironment

if (!(Test-Path -LiteralPath '.env') -and !$env:EXPO_PUBLIC_API_URL) {
    throw 'Set EXPO_PUBLIC_API_URL or create .env from .env.example before building.'
}

# Reuse this key for every local APK. Never commit the key or its password.
$signingDirectory = Join-Path $projectRoot '.local-build'
New-Item -ItemType Directory -Path $signingDirectory -Force | Out-Null
$keyFile = Join-Path $signingDirectory 'mcms-release.jks'
$credentialFile = Join-Path $signingDirectory 'signing-password.xml'
if ((Test-Path -LiteralPath $keyFile) -and !(Test-Path -LiteralPath $credentialFile)) {
    throw 'Signing key exists but its password file is missing. Restore the password file; do not replace the key.'
}
if (!(Test-Path -LiteralPath $credentialFile)) {
    $random = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($random) } finally { $rng.Dispose() }
    $securePassword = ConvertTo-SecureString ([Convert]::ToBase64String($random)) -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential('mcms-release', $securePassword)
    $credential | Export-Clixml -LiteralPath $credentialFile
}
$credential = Import-Clixml -LiteralPath $credentialFile
$env:MCMS_KEYSTORE_PATH = $keyFile
$env:MCMS_KEYSTORE_PASSWORD = $credential.GetNetworkCredential().Password

try {
    if (!(Test-Path -LiteralPath $keyFile)) {
        & "$javaDirectory\bin\keytool.exe" -genkeypair -noprompt -storetype JKS -keystore $keyFile -alias mcms-release -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=SmartMush, OU=Mobile, O=MCMS, C=VN' -storepass:env MCMS_KEYSTORE_PASSWORD -keypass:env MCMS_KEYSTORE_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Could not generate the Android signing key.' }
    }

    & npx.cmd expo prebuild --platform android --no-install --no-clean
    if ($LASTEXITCODE -ne 0) { throw 'Expo Android prebuild failed.' }

    Push-Location -LiteralPath (Join-Path $projectRoot 'android')
    try {
        & .\gradlew.bat :app:assembleRelease "-PreactNativeArchitectures=$Architectures" --max-workers=2 --console=plain --init-script (Join-Path $PSScriptRoot 'android-signing.gradle')
        if ($LASTEXITCODE -ne 0) { throw 'Gradle APK build failed. See the error above.' }
    } finally { Pop-Location }

    $outputDirectory = Join-Path $projectRoot 'dist\apk'
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $outputFile = Join-Path $outputDirectory 'SmartMush.apk'
    Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk') -Destination $outputFile -Force
    Write-Host "APK ready: $outputFile"
} finally {
    Remove-Item Env:MCMS_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:MCMS_KEYSTORE_PATH -ErrorAction SilentlyContinue
}
