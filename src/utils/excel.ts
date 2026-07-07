import * as XLSX from 'xlsx';
import { PastMatch } from '../types';

// Helper to convert Match data to columns for Excel export
export function exportHistoryToExcel(history: PastMatch[]) {
  const data = history.map((m, i) => ({
    No: i + 1,
    'Nama Event': m.eventName,
    Partai: m.partai,
    Kelas: m.kelas,
    'Kategori Usia': m.kategoriUsia || 'REMAJA',
    'Tahap Pertandingan': m.tahapPertandingan || 'PENYISIHAN',
    Gender: m.gender,
    'Pesilat Merah': m.atlitMerah.nama,
    'Kontingen Merah': m.atlitMerah.kontingen,
    'Skor Akhir Merah': m.skorAkhirMerah,
    'Pesilat Biru': m.atlitBiru.nama,
    'Kontingen Biru': m.atlitBiru.kontingen,
    'Skor Akhir Biru': m.skorAkhirBiru,
    Pemenang: m.pemenang === 'MERAH' ? 'SUDUT MERAH' : m.pemenang === 'BIRU' ? 'SUDUT BIRU' : m.pemenang || 'DRAW',
    Waktu: new Date(m.timestamp).toLocaleString('id-ID'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Histori Pertandingan');
  
  // Save as Excel File
  XLSX.writeFile(workbook, `Histori_Skoring_Silat_${Date.now()}.xlsx`);
}

// Generates a mock template excel for the user to download
export function downloadExcelTemplate() {
  const templateData = [
    {
      'Nama Event': 'KEJUARAAN NASIONAL PENCAK SILAT 2026',
      Partai: '01',
      Kelas: 'A',
      'Kategori Usia': 'REMAJA',
      'Tahap Pertandingan': 'PENYISIHAN',
      Gender: 'PUTRA',
      'Nama Pesilat Merah': 'ADI WIJAYA',
      'Kontingen Merah': 'JAWA TENGAH',
      'Nama Pesilat Biru': 'RIZKY PUTRA',
      'Kontingen Biru': 'JAWA TIMUR',
      'Durasi Babak (Menit)': '02:00',
    },
    {
      'Nama Event': 'KEJUARAAN NASIONAL PENCAK SILAT 2026',
      Partai: '02',
      Kelas: 'B',
      'Kategori Usia': 'REMAJA',
      'Tahap Pertandingan': 'PEREMPAT FINAL',
      Gender: 'PUTRI',
      'Nama Pesilat Merah': 'SITI AMINAH',
      'Kontingen Merah': 'BANTEN',
      'Nama Pesilat Biru': 'NURUL INDAH',
      'Kontingen Biru': 'SULAWESI SELATAN',
      'Durasi Babak (Menit)': '02:00',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Atlit');
  XLSX.writeFile(workbook, 'Template_Massal_Silat.xlsx');
}

// Generates a template excel specialized for match scheduling
export function downloadJadwalExcelTemplate() {
  const templateData = [
    {
      'Partai': '1',
      'Kelas': 'A',
      'Gender': 'PUTRA',
      'Kategori Usia': 'REMAJA',
      'Tahap Pertandingan': 'PENYISIHAN',
      'Nama Pesilat Merah': 'ANDI SANTOSO',
      'Kontingen Merah': 'JAWA TENGAH',
      'Nama Pesilat Biru': 'BUDI PRASETYO',
      'Kontingen Biru': 'DKI JAKARTA'
    },
    {
      'Partai': '2',
      'Kelas': 'B',
      'Gender': 'PUTRI',
      'Kategori Usia': 'REMAJA',
      'Tahap Pertandingan': 'PENYISIHAN',
      'Nama Pesilat Merah': 'SITI NUR HALIZA',
      'Kontingen Merah': 'JAWA BARAT',
      'Nama Pesilat Biru': 'DIAN UTAMI',
      'Kontingen Biru': 'JAWA TIMUR'
    },
    {
      'Partai': '3',
      'Kelas': 'C',
      'Gender': 'PUTRA',
      'Kategori Usia': 'DEWASA',
      'Tahap Pertandingan': 'SEMIFINAL',
      'Nama Pesilat Merah': 'EKO WAHYUDI',
      'Kontingen Merah': 'BALI',
      'Nama Pesilat Biru': 'FAJAR NUGRAHA',
      'Kontingen Biru': 'DI YOGYAKARTA'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Jadwal');
  XLSX.writeFile(workbook, 'Template_Jadwal_Silat.xlsx');
}

// Generates a simple template excel for importing 8 athletes to tournament bracket
export function downloadBaganExcelTemplate() {
  const templateData = [
    {
      'Nama': 'ANDI SANTOSO',
      'Kontingen': 'JAWA TENGAH'
    },
    {
      'Nama': 'BUDI PRASETYO',
      'Kontingen': 'DKI JAKARTA'
    },
    {
      'Nama': 'SITI NUR HALIZA',
      'Kontingen': 'JAWA BARAT'
    },
    {
      'Nama': 'DIAN UTAMI',
      'Kontingen': 'JAWA TIMUR'
    },
    {
      'Nama': 'EKO WAHYUDI',
      'Kontingen': 'BALI'
    },
    {
      'Nama': 'FAJAR NUGRAHA',
      'Kontingen': 'DI YOGYAKARTA'
    },
    {
      'Nama': 'GITA LESTARI',
      'Kontingen': 'BANTEN'
    },
    {
      'Nama': 'HADI WIJAYA',
      'Kontingen': 'SUMATERA UTARA'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Atlit_Bagan');
  XLSX.writeFile(workbook, 'Template_Bagan_Atlit_Silat.xlsx');
}

// Exports entire tournament bracket down to final as a schedule list compatible with Generate Jadwal import
export function exportBaganToExcel(
  baganAthletes: any[], 
  matchClass: string, 
  gender: string = 'PUTRA', 
  ageGroup: string = 'REMAJA',
  startingStage: string = 'PENYISIHAN'
) {
  const mClass = (matchClass || 'A').toUpperCase();
  const mGender = (gender || 'PUTRA').toUpperCase();
  const mAgeGroup = (ageGroup || 'REMAJA').toUpperCase();

  const N = baganAthletes.length; // Dynamic power of two, e.g. 8, 16, 32, 64
  const matchesData: any[] = [];

  // Stage names helper depending on N and current round
  const getStageName = (roundIndex: number, totalRounds: number) => {
    const roundsLeft = totalRounds - roundIndex - 1; // 0 for Final, 1 for Semifinal, 2 for Perempat Final, etc.
    if (roundsLeft === 0) return 'FINAL';
    if (roundsLeft === 1) return 'SEMIFINAL';
    if (roundsLeft === 2) return 'PEREMPAT FINAL';
    return (startingStage || 'PENYISIHAN').toUpperCase();
  };

  const totalRounds = Math.round(Math.log2(N)) || 3;
  let currentPartaiId = 1;

  // Let's store the partido ids of each round to easily link them
  // roundPartaiIds[r][matchIndex] = partidos ID (1-based)
  const roundPartaiIds: number[][] = [];

  for (let r = 0; r < totalRounds; r++) {
    const numMatches = N / Math.pow(2, r + 1);
    const roundMatches: number[] = [];
    const stage = getStageName(r, totalRounds);

    for (let m = 0; m < numMatches; m++) {
      let redNama = '';
      let redKontingen = '';
      let blueNama = '';
      let blueKontingen = '';

      if (r === 0) {
        // Red is at indices 2m, Blue is at indices 2m + 1
        const athRed = baganAthletes[2 * m] || { nama: '', kontingen: '' };
        const athBlue = baganAthletes[2 * m + 1] || { nama: '', kontingen: '' };

        redNama = (athRed.nama || '').trim().toUpperCase() || `SUDUT MERAH P${currentPartaiId}`;
        redKontingen = (athRed.kontingen || '').trim().toUpperCase() || 'DAERAH';
        blueNama = (athBlue.nama || '').trim().toUpperCase() || `SUDUT BIRU P${currentPartaiId}`;
        blueKontingen = (athBlue.kontingen || '').trim().toUpperCase() || 'DAERAH';
      } else {
        // Parent matches are in the previous round (r-1): Match 2m and Match 2m + 1
        const prevRoundPartais = roundPartaiIds[r - 1];
        const p1Id = prevRoundPartais[2 * m];
        const p2Id = prevRoundPartais[2 * m + 1];

        redNama = `PEMENANG PARTAI ${p1Id}`;
        redKontingen = `PREV P${p1Id}`;
        blueNama = `PEMENANG PARTAI ${p2Id}`;
        blueKontingen = `PREV P${p2Id}`;
      }

      matchesData.push({
        'Partai': String(currentPartaiId),
        'Kelas': mClass,
        'Gender': mGender,
        'Kategori Usia': mAgeGroup,
        'Tahap Pertandingan': stage,
        'Nama Pesilat Merah': redNama,
        'Kontingen Merah': redKontingen,
        'Nama Pesilat Biru': blueNama,
        'Kontingen Biru': blueKontingen
      });

      roundMatches.push(currentPartaiId);
      currentPartaiId++;
    }
    roundPartaiIds.push(roundMatches);
  }

  const worksheet = XLSX.utils.json_to_sheet(matchesData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Bagan_Kelas_${mClass}`);
  XLSX.writeFile(workbook, `Export_Jadwal_Bagan_Kelas_${mClass}.xlsx`);
}

// Parses excel file and extracts match data
export function parseExcelImport(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return reject(new Error('Invalid file data'));
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
