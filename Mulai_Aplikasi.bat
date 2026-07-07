@echo off
title PENCAK SILAT DIGITAL SCORING - OFFLINE SERVER
color 0b
cls

echo =======================================================================
echo          SISTEM SKORING DIGITAL PENCAK SILAT - PORTABLE SERVER
echo =======================================================================
echo.
echo Aplikasi ini dikonfigurasi untuk dijalankan secara lokal (Offline) pada
echo laptop pertandingan/panitia utama. Juri dan Dewan dapat terhubung
echo melalui Wi-Fi lokal dengan IP Address yang akan muncul di bawah ini.
echo.
echo =======================================================================
echo.

:: Deklarasi Pemeriksaan Node.js
where node >nul 2>nul
if %errorlevel% neq 0 goto NoNode

echo [OK] Node.js terdeteksi:
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo      Versi: %NODE_VER%
echo.

:: Pemeriksaan Instalasi Dependensi (Folder node_modules)
if not exist node_modules goto InstallModules
if not exist node_modules\.bin\vite.cmd goto WarnAndInstallModules

echo [OK] Folder dependensi 'node_modules' terdeteksi dengan sehat.
goto StartBuild

:WarnAndInstallModules
echo [PERINGATAN] Folder 'node_modules' terdeteksi tetapi tidak memiliki binary compiler Windows yang benar (mungkin disalin dari OS lain).
echo             Sistem akan melakukan instalasi ulang agar aplikasi berjalan lurus.
echo.

:InstallModules
echo [PROSES] Folder dependensi 'node_modules' belum terpasang atau tidak lengkap untuk Windows.
echo          Memasang paket-paket sistem skoring untuk pertama kalinya...
echo          Mohon pastikan komputer terhubung dengan internet untuk proses ini.
echo.
cmd /c "npm install"
if %errorlevel% neq 0 goto InstallFailed

echo.
echo [OK] Seluruh dependensi berhasil terpasang!
echo.

:StartBuild
:: Kompilasi File Frontend (React+Vite) & Backend (CJS Bundle)
echo [PROSES] Melakukan kompilasi sistem pertandingan (Build Production)...
cmd /c "npm run build"
if %errorlevel% neq 0 goto BuildFailed

echo [OK] Kompilasi berhasil! Berkas siap dijalankan di folder 'dist'.
echo.

:: Buka halaman pertandingan otomatis setelah 3 detik
echo [PROSES] Membuka Dashboard Scoring Utama di browser Anda...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo =======================================================================
echo                  SERVER PERTANDINGAN AKTIF (LIVE)
echo =======================================================================
echo JANGAN MENUTUP Jendela Hitam (CMD) ini selama pertandingan berlangsung.
echo Jika ditutup, koneksi Juri, Dewan, dan Layar Tayang akan terputus!
echo =======================================================================
echo.

:: Jalankan Server Utama (Express Server)
cmd /c "npm start"
pause
exit

:NoNode
color 0c
echo [INFO ERROR] %date% %time%
echo Node.js TIDAK ditemukan di komputer ini!
echo.
echo Kami sangat merekomendasikan menggunakan Node.js untuk menjalankan server
echo skoring ini secara andal dan cepat tanpa diblokir oleh antivirus (Windows Defender).
echo.
echo Silakan unduh dan pasang Node.js:
echo -- Link Uduh: https://nodejs.org/
echo.
echo Tekan tombol apa saja untuk membuka link download Node.js di browser Anda...
pause >nul
start https://nodejs.org/
exit

:InstallFailed
color 0c
echo.
echo [ERROR] Gagal memasang dependensi (npm install gagal).
echo         Pastikan koneksi internet Anda aktif dan kembalilah menjalankan file ini.
pause
exit

:BuildFailed
color 0c
echo.
echo [ERROR] Gagal melakukan kompilasi aplikasi.
pause
exit
