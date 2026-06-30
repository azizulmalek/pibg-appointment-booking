import * as XLSX from "xlsx";
import { birthCertLookupKey, normalizeBirthCert, isValidBirthCert } from "./birth-cert";

export type StudentImportRow = {
  studentNo: string;
  name: string;
  birthCert: string;
  tahun: number;
  kelas: string;
};

export type ClassStudentImportRow = {
  studentNo: string;
  name: string;
  birthCert: string;
};

function parseBirthCertCell(row: Record<string, string>, index: number, errors: string[]) {
  const birthCert = String(row["No Sijil Lahir"] ?? row["NoSijilLahir"] ?? "").trim();
  if (!birthCert) {
    errors.push(`Baris ${index + 2}: No. Sijil Lahir diperlukan`);
    return null;
  }
  const normalized = normalizeBirthCert(birthCert);
  if (!isValidBirthCert(normalized)) {
    errors.push(`Baris ${index + 2}: format No. Sijil Lahir tidak sah`);
    return null;
  }
  return normalized;
}

/** Import rows for a pre-selected class (No Murid, Nama, No Sijil Lahir). */
export function parseClassStudentExcel(buffer: ArrayBuffer): {
  rows: ClassStudentImportRow[];
  errors: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
  const rows: ClassStudentImportRow[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const studentNo = String(row["No Murid"] ?? row["NoMurid"] ?? "").trim();
    const name = String(row["Nama"] ?? "").trim();
    const birthCert = parseBirthCertCell(row, index, errors);
    if (!birthCert) return;
    if (!studentNo || !name) {
      errors.push(`Baris ${index + 2}: data tidak lengkap`);
      return;
    }
    rows.push({ studentNo, name, birthCert });
  });

  return { rows, errors };
}

export function parseStudentExcel(buffer: ArrayBuffer): {
  rows: StudentImportRow[];
  errors: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
  const rows: StudentImportRow[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const studentNo = String(row["No Murid"] ?? row["NoMurid"] ?? "").trim();
    const name = String(row["Nama"] ?? "").trim();
    const birthCert = String(row["No Sijil Lahir"] ?? row["NoSijilLahir"] ?? "").trim();
    const tahunRaw = String(row["Tahun"] ?? "").trim();
    const kelas = String(row["Kelas"] ?? "").trim();
    const tahun = parseInt(tahunRaw.replace(/\D/g, ""), 10);

    if (!studentNo || !name || !birthCert || !kelas || !tahun) {
      errors.push(`Baris ${index + 2}: data tidak lengkap`);
      return;
    }

    const normalized = normalizeBirthCert(birthCert);
    if (!isValidBirthCert(normalized)) {
      errors.push(`Baris ${index + 2}: format No. Sijil Lahir tidak sah`);
      return;
    }

    if (tahun < 1 || tahun > 6) {
      errors.push(`Baris ${index + 2}: Tahun mesti 1-6`);
      return;
    }

    rows.push({ studentNo, name, birthCert: normalized, tahun, kelas });
  });

  return { rows, errors };
}

export function getBirthCertLookup(birthCert: string): string {
  return birthCertLookupKey(normalizeBirthCert(birthCert));
}

export function exportToCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}
