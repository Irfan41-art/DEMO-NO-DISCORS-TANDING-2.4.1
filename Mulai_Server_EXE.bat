@echo off
title PENCAK SILAT DIGITAL SCORING - PORTABLE SERVER EXE
color 0b
cls

echo =======================================================================
echo         SISTEM SKORING DIGITAL PENCAK SILAT - PORTABLE SERVER EXE
echo =======================================================================
echo.
echo Kami mendeteksi Anda ingin menjalankan Aplikasi Portable SERVER (.exe).
echo.
echo Jika Jendela Hitam (CMD) langsung menutup sendiri saat berkas .exe diklik,
echo hal ini biasanya disebabkan oleh:
echo 1. PORT 3000 sedang terpakai oleh server lain (misal, sedang menjalankan Mulai_Aplikasi.bat).
echo 2. Berkas tidak mendapatkan izin keamanan Administrator lokal.
echo.
echo Melalui file ini, Jendela Hitam akan tetap TAHAN DAN TERBUKA sehingga Anda 
echo dapat melihat detail log kesalahan jika server gagal dinyalakan.
echo =======================================================================
echo.

:: Berpindah ke direktori tempat Batch file ini dijalankan
cd /d "%~dp0"

:: Mencari lokasi file .exe hasil build pkg
set EXE_PATH=bin\react-example.exe

if not exist "%EXE_PATH%" (
    set EXE_PATH=react-example.exe
)

if not exist "%EXE_PATH%" (
    if exist bin\DigitalScoringPencakSilat.exe (
        set EXE_PATH=bin\DigitalScoringPencakSilat.exe
    ) else if exist DigitalScoringPencakSilat.exe (
        set EXE_PATH=DigitalScoringPencakSilat.exe
    )
)

:: Jika tetap tidak ditemukan, beri tahu user dan ingatkan untuk mem-package dulu
if not exist "%EXE_PATH%" (
    color 0c
    echo [PENTING] Berkas .exe belum terdeteksi!
    echo Silakan jalankan perintah berikut di CMD proyek Anda untuk menyusun .exe pertama kali:
    echo     npm run package
    echo.
    echo Pastikan folder 'bin/' dan berkas 'react-example.exe' telah terbentuk.
    echo.
    pause
    exit
)

echo [PROSES] Menjalankan: %EXE_PATH%...
echo Membuka halaman scoring lokal di browser Anda...
start http://localhost:3000
echo.

:: Eksekusi file exe
"%EXE_PATH%"

:: Tahan layar apabila eksekusi berakhir/mengalami error
echo.
echo =======================================================================
echo [SISTEM BERHENTI / KELUAR]
echo Server berhenti dengan Kode Keluar: %errorlevel%
echo Jika ada pesan error di atas, silakan salin atau perbaiki sebelum menutup.
echo =======================================================================
pause
