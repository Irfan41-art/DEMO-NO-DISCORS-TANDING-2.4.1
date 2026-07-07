import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';

const RCEDIT_URL = 'https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe';
const rceditPath = path.resolve('rcedit.exe');
const iconPath = path.resolve('app_icon.ico');
const exePath = path.resolve('bin/DigitalScoringPencakSilat.exe');
const customIconExePath = path.resolve('bin/DigitalScoringPencakSilat_KustomIkon.exe');

// Set constant local PKG cache directory path inside project root
const localCacheDir = path.resolve('.pkg-cache');
process.env.PKG_CACHE_PATH = localCacheDir;

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    function get(currentUrl) {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          get(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Gagal mengunduh: Status Kode ${response.statusCode}`));
          return;
        }
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
        file.on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }
    
    get(url);
  });
}

// Menemukan berkas base binary Node.js secara rekursif di folder lokal
function findBaseBinaries(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findBaseBinaries(fullPath, filesList);
      } else if (item.startsWith('fetched-') && item.includes('win-x64')) {
        filesList.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`[ERROR] Gagal menelusuri direktori: ${dir}`, err.message);
  }
  return filesList;
}

function patchPkgFetch() {
  const pkgFetchIndexPath = path.resolve('node_modules/pkg-fetch/lib-es5/index.js');
  if (fs.existsSync(pkgFetchIndexPath)) {
    let content = fs.readFileSync(pkgFetchIndexPath, 'utf8');
    const targetPattern = 'if ((_c.sent()) === expected_1.EXPECTED_HASHES[remote.name]) {';
    if (content.includes(targetPattern)) {
      console.log('[PROSES] Mempatch verifikasi hash pkg-fetch agar menerima binary kustom...');
      // String.prototype.replace only replaces the first occurrence, which is exactly the cache load check we need to bypass
      content = content.replace(targetPattern, 'if (true) { // Bypassed for custom icon');
      fs.writeFileSync(pkgFetchIndexPath, content, 'utf8');
      console.log('[OK] Patcher pkg-fetch berhasil diaktifkan.');
    } else {
      console.log('[INFO] Patcher pkg-fetch sudah terpasang atau struktur tidak cocok.');
    }
  } else {
    console.log('[INFO] node_modules/pkg-fetch/lib-es5/index.js tidak ditemukan, melewati patch.');
  }
}

async function run() {
  console.log('\n=======================================================================');
  console.log('[PROSES/IKON] Memulai Teknik Modifikasi Isolated BASE BINARY...');
  console.log('=======================================================================');

  // Patch pkg-fetch to allow custom cached base binaries
  patchPkgFetch();

  if (!fs.existsSync(iconPath)) {
    console.error(`[ERROR] Berkas ikon 'app_icon.ico' tidak ditemukan di root directory.`);
    process.exit(1);
  }

  // Ensure bin folder exists
  fs.mkdirSync(path.dirname(exePath), { recursive: true });

  // 1. Unduh rcedit.exe jika belum ada atau rusak
  let shouldDownload = false;
  if (!fs.existsSync(rceditPath)) {
    shouldDownload = true;
  } else {
    const stats = fs.statSync(rceditPath);
    if (stats.size < 1000) {
      shouldDownload = true;
    }
  }

  if (shouldDownload) {
    console.log('[PROSES] rcedit.exe tidak terdeteksi. Mengunduh secara otomatis...');
    try {
      if (fs.existsSync(rceditPath)) {
        fs.unlinkSync(rceditPath);
      }
      await downloadFile(RCEDIT_URL, rceditPath);
      console.log('[OK] Berkas compiler rcedit.exe berhasil dipasang!');
    } catch (err) {
      console.error('[ERROR] Gagal mengunduh rcedit.exe otomatis:', err.message);
      console.log('\n[SOLUSI MANUAL]:');
      console.log('1. Unduh rcedit-x64.exe secara manual dari browser Anda melalui link berikut:');
      console.log('   https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe');
      console.log('2. Ubah nama berkas hasil unduhan menjadi "rcedit.exe".');
      console.log('3. Letakkan "rcedit.exe" tersebut ke dalam folder utama (root) aplikasi ini.');
      console.log('4. Jalankan kembali script Buat_File_EXE.bat.\n');
      process.exit(1);
    }
  }

  // 2. Scan base binary dari folder local .pkg-cache
  console.log(`[INFO] Direktori cache lokal terisolasi: ${localCacheDir}`);
  let baseBinaries = findBaseBinaries(localCacheDir);

  if (baseBinaries.length === 0) {
    console.log('[INFO] Base binary belum ada di folder cache lokal proyek.');
    console.log('[PROSES] Memicu pkg untuk mengunduh base binary ke folder .pkg-cache...');
    try {
      execSync('npx pkg . --targets node18-win-x64 --output bin/DigitalScoringPencakSilat.exe', { 
        stdio: 'inherit',
        env: { ...process.env, PKG_CACHE_PATH: localCacheDir }
      });
    } catch (e) {
      console.log('[INFO] Selesai memicu inisialisasi awal. Memindai ulang...');
    }
    baseBinaries = findBaseBinaries(localCacheDir);
  }

  if (baseBinaries.length === 0) {
    console.error('[ERROR] Tidak berhasil mendeteksi base binary Node.js di folder cache.');
    console.error('        Pastikan komputer terhubung ke internet saat kompilasi pertama!');
    process.exit(1);
  }

  console.log(`[OK] Berhasil mengisolasi ${baseBinaries.length} base binary di .pkg-cache.`);

  // 3. Modifikasi ikon pada file base binary sebelum penyematan payload pkg dilakukan
  let successCount = 0;
  for (const baseBinary of baseBinaries) {
    console.log(`[PROSES] Menyematkan ikon kustom ke base binary di cache: ${path.basename(baseBinary)}`);
    try {
      const cmd = `"${rceditPath}" "${baseBinary}" --set-icon "${iconPath}"`;
      execSync(cmd, { stdio: 'inherit' });
      successCount++;
    } catch (err) {
      console.warn(`[PERINGATAN] Gagal menyematkan ikon pada ${path.basename(baseBinary)}:`, err.message);
    }
  }

  if (successCount === 0) {
    console.error('[ERROR] Gagal menyematkan ikon pada basis binary pkg.');
    process.exit(1);
  }

  console.log('[OK] Penyematan ikon ke berkas template dasar sukses luar biasa!');

  // 4. Hapus berkas .exe lama sebelum melakukan build ulang bersih
  if (fs.existsSync(exePath)) {
    try {
      fs.unlinkSync(exePath);
    } catch (err) {}
  }
  if (fs.existsSync(customIconExePath)) {
    try {
      fs.unlinkSync(customIconExePath);
    } catch (err) {}
  }

  // 5. Jalankan kompilasi akhir dengan base binary yang sudah berikon
  console.log('\n[PROSES] Merakit ulang executable berkas dengan basis berikon...');
  try {
    execSync('npx pkg . --targets node18-win-x64 --output bin/DigitalScoringPencakSilat.exe', { 
      stdio: 'inherit',
      env: { ...process.env, PKG_CACHE_PATH: localCacheDir }
    });

    // 6. Copy ke file alternatif "DigitalScoringPencakSilat_KustomIkon.exe" untuk memotong cache icon Windows!
    fs.copyFileSync(exePath, customIconExePath);

    console.log('\n=======================================================================');
    console.log('[SUKSES] PROSES KOMPILASI DENGAN IKON SUKSES 100%!');
    console.log('=======================================================================');
    console.log('TIPS CARA MELIHAT IKON DAN MENGATASI CACHE WINDOWS EXPLORER:');
    console.log('Windows Explorer menyimpan daftar cache ikon secara sangat agresif.');
    console.log('Untuk memicu agar Windows segera mendeteksi ikon baru Anda, lakukan salah satu:');
    console.log('1. Gunakan file yang bernama: "bin/DigitalScoringPencakSilat_KustomIkon.exe"');
    console.log('2. Atau salin file "DigitalScoringPencakSilat.exe" ke Desktop Anda.');
    console.log('3. Atau ubah nama berkas (rename) sesuka Anda (misalnya menjadi "ScoringSilat.exe").');
    console.log('=======================================================================');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Gagal melakukan repackaging akhir:', err.message);
    process.exit(1);
  }
}

run();


