@echo off
title PENCAK SILAT DIGITAL SCORING - BUILD ENGINE EXE
color 0b
cls

echo =======================================================================
echo          SISTEM SKORING DIGITAL PENCAK SILAT - PEMBUAT FILE EXE
echo =======================================================================
echo.
echo Script ini dirancang untuk memproses seluruh kode sumber aplikasi dan
echo membungkusnya ke dalam satu file mandiri: "DigitalScoringPencakSilat.exe"
echo yang dapat dideploy luring tanpa koneksi internet.
echo.
echo =======================================================================
echo.

:: 1. Periksa Apakah Node.js Terinstall di Sistem
where node >nul 2>nul
if %errorlevel% neq 0 goto NoNode

echo [OK] Node.js terdeteksi di perangkat Anda.
echo.

:: 2. Periksa / Pasang Folder node_modules luring
if not exist node_modules goto InstallModules
if not exist node_modules\.bin\vite.cmd goto WarnAndInstallModules

echo [OK] Folder dependency sistem 'node_modules' terdeteksi dengan sehat.
goto StartBuild

:WarnAndInstallModules
echo [PERINGATAN] Folder 'node_modules' terdeteksi tetapi tidak memiliki binary compiler Windows yang benar (mungkin disalin dari OS lain).
echo             Sistem akan melakukan instalasi ulang agar aplikasi berjalan lurus.
echo.

:InstallModules
echo [PROSES] Folder sistem 'node_modules' belum terpasang atau tidak lengkap untuk Windows.
echo          Menginstal semua compiler dan asset package (Vite, React, dll)...
echo          (Proses ini membutuhkan internet hanya untuk unduhan pertama kalinya)
echo.
cmd /c "npm install"
if %errorlevel% neq 0 goto InstallFailed

echo.
echo [OK] Seluruh dependency lokal siap digunakan!
echo.

:StartBuild
:: 3. Jalankan Kompilasi dan Packing EXE
echo =======================================================================
echo [PROSES] Memulai Kompilasi (Vite Build) dan Packing ke berkas .exe...
echo          Mohon tunggu beberapa saat hingga progress selesai...
echo =======================================================================
echo.

cmd /c "npm run package"
if %errorlevel% neq 0 goto PackageFailed

echo.
echo =======================================================================
echo [SUKSES] PROSES SELESAI DENGAN SEMPURNA!
echo =======================================================================
echo Berkas aplikasi portable mandiri Anda telah sukses disusun!
echo.
echo Detail lokasi berkas:
echo -- Folder: [ Root Proyek ] \ bin \
echo -- Berkas: DigitalScoringPencakSilat.exe
echo.
echo Jendela direktori 'bin/' akan segera dibuka secara otomatis...
echo =======================================================================
echo.
timeout /t 5 >nul
explorer bin
pause
exit

:NoNode
color 0c
echo [ERROR] Node.js TIDAK terdeteksi pada komputer Anda!
echo.
echo Mengapa terjadi error "'vite' is not recognized"?
echo Ini karena komputer Anda membutuhkan Node.js luring untuk memproses 
echo script compiler dan dependency (Vite, React) di komputer lokal.
echo.
echo SOLUSI:
echo 1. Unduh Node.js dari: https://nodejs.org/
echo 2. Pasang/Install hingga selesai.
echo 3. Tutup jendela CMD ini, buka kembali, lalu jalankan file ini lagi.
echo.
echo Menghubungkan ke halaman download Node.js...
pause
start https://nodejs.org/
exit

:InstallFailed
color 0c
echo.
echo [ERROR] Gagal mengunduh instalasi dependency (npm install gagal).
echo         Pastikan koneksi internet Anda stabil, lalu jalankan kembali BAT ini.
pause
exit

:PackageFailed
color 0c
echo.
echo [ERROR] Terjadi kesalahan saat melakukan pengepakan aplikasi ke EXE.
echo         Pastikan tidak ada aplikasi/terminal lain yang sedang membuka 
echo         file di dalam folder 'bin/' atau 'dist/'.
echo.
pause
exit
