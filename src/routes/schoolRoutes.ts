/**
 * Vardhan Education Platform — School Domain Routes
 *
 * Secured endpoints for the School module. All routes require:
 *   - A valid tenant (via `x-tenant-id` header or `tenantId` query param)
 *   - A valid JWT (via `authenticate`)
 *   - An authorized role (via `authorizeRoles`)
 *
 * Bulk Import endpoints accept CSV or Excel (xlsx/xls) files via multer.
 */
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import readXlsxFile from 'read-excel-file/node';
import { authenticate, authorizeRoles } from '../middleware/rbacMiddleware';

const schoolRouter = Router();

// ---------------------------------------------------------------------------
// Multer — in-memory storage for CSV/Excel uploads
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!allowed.includes(ext) && !file.mimetype.includes('csv') && !file.mimetype.includes('excel') && !file.mimetype.includes('spreadsheetml')) {
      cb(new Error('Unsupported file type. Please upload a CSV or Excel (.xlsx/.xls) file.'));
      return;
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Tenant guard — validates the x-tenant-id header or tenantId query param
// ---------------------------------------------------------------------------
function requireTenant(req: Request, res: Response, next: NextFunction): void {
  const headerTenantId = (req.header('x-tenant-id') || '').trim();
  const queryTenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId.trim() : '';

  const tenantId = headerTenantId || queryTenantId;
  if (!tenantId) {
    res.status(400).json({
      error: 'Tenant ID header (x-tenant-id) or query parameter (tenantId) is required',
    });
    return;
  }

  (req as Request & { tenantId?: string }).tenantId = tenantId;
  next();
}

// ---------------------------------------------------------------------------
// In-memory demo student store (scoped per tenant)
// ---------------------------------------------------------------------------
interface Student {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  grade: string;
  parentPhone?: string;
  previousYearBalance: number;
  status: 'active' | 'inactive';
}

const students: Student[] = [
  { id: 'stu-001', tenantId: 'demo-school-001', name: 'Aarav Sharma', email: 'aarav@school.com', grade: 'Grade 10', parentPhone: '9876543210', previousYearBalance: 0, status: 'active' },
  { id: 'stu-002', tenantId: 'demo-school-001', name: 'Priya Patel', email: 'priya@school.com', grade: 'Grade 9', parentPhone: '9876543211', previousYearBalance: 2500, status: 'active' },
  { id: 'stu-003', tenantId: 'demo-school-001', name: 'Rohan Verma', email: 'rohan@school.com', grade: 'Grade 11', parentPhone: '9876543212', previousYearBalance: 0, status: 'inactive' },
];

// ---------------------------------------------------------------------------
// Bulk Import — column mapping & validation helpers
// ---------------------------------------------------------------------------
const REQUIRED_COLUMNS: Array<{ header: string; key: keyof StudentImportRow }> = [
  { header: 'Student Name', key: 'studentName' },
  { header: 'Class', key: 'className' },
  { header: 'Parent Phone', key: 'parentPhone' },
  { header: 'Previous Year Balance', key: 'previousYearBalance' },
];

interface StudentImportRow {
  studentName: string;
  className: string;
  parentPhone: string;
  previousYearBalance: string;
  [key: string]: string;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeRows(rows: unknown[][]): StudentImportRow[] {
  const headerRow = (rows[0] || []).map((h) => (h === null || h === undefined ? '' : String(h).trim()));
  const headerIndex: Map<string, number> = new Map();
  headerRow.forEach((h, idx) => {
    const key = normalizeHeader(h);
    if (key && !headerIndex.has(key)) headerIndex.set(key, idx);
  });

  const headerMap: Record<string, string> = {};
  REQUIRED_COLUMNS.forEach((col) => {
    const idx = headerIndex.get(normalizeHeader(col.header));
    if (idx !== undefined) {
      headerMap[col.key] = String(idx);
    }
  });

  return rows.slice(1).map((row) => {
    const record: StudentImportRow = {
      studentName: '',
      className: '',
      parentPhone: '',
      previousYearBalance: '',
    };
    for (const [key, idxStr] of Object.entries(headerMap)) {
      const idx = Number(idxStr);
      const raw = row[idx];
      record[key] = raw === null || raw === undefined ? '' : String(raw).trim();
    }
    return record;
  });
}

function validateRow(record: StudentImportRow, rowNumber: number): string | null {
  if (!record.studentName) return `Row ${rowNumber}: Student Name is required`;
  if (!record.className) return `Row ${rowNumber}: Class is required`;
  if (!record.parentPhone) return `Row ${rowNumber}: Parent Phone is required`;
  if (!/^[0-9+\-\s()]{7,15}$/.test(record.parentPhone)) {
    return `Row ${rowNumber}: Parent Phone '${record.parentPhone}' is invalid`;
  }
  if (record.previousYearBalance !== '' && !/^-?\d+(\.\d+)?$/.test(record.previousYearBalance)) {
    return `Row ${rowNumber}: Previous Year Balance '${record.previousYearBalance}' must be a number`;
  }
  return null;
}

function buildStudent(record: StudentImportRow, tenantId: string, inferredClass: string): Student {
  return {
    id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenantId,
    name: record.studentName,
    email: `${record.studentName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@school.com`,
    grade: inferredClass,
    parentPhone: record.parentPhone,
    previousYearBalance: record.previousYearBalance === '' ? 0 : Number(record.previousYearBalance),
    status: 'active',
  };
}

function inferClass(record: StudentImportRow): string {
  const cls = record.className.trim();
  if (/^\d+$/.test(cls)) return `Grade ${cls}`;
  return cls.replace(/^grade\s+/i, 'Grade ');
}

// ---------------------------------------------------------------------------
// GET /students — Protected: valid tenant & SUPER_ADMIN, ADMIN, or TEACHER
// ---------------------------------------------------------------------------
schoolRouter.get(
  '/students',
  requireTenant,
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TEACHER'),
  (req: Request, res: Response) => {
    const tenantId = (req as Request & { tenantId?: string }).tenantId as string;
    const scoped = students.filter((s) => s.tenantId === tenantId);
    res.json({
      status: 'OK',
      tenantId,
      count: scoped.length,
      students: scoped,
    });
  }
);

// ---------------------------------------------------------------------------
// POST /students — Protected: valid tenant & SUPER_ADMIN or ADMIN
// ---------------------------------------------------------------------------
schoolRouter.post(
  '/students',
  requireTenant,
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  (req: Request, res: Response) => {
    const tenantId = (req as Request & { tenantId?: string }).tenantId as string;
    const { name, email, grade } = req.body;

    if (!name || !email || !grade) {
      res.status(400).json({ error: 'name, email and grade are required' });
      return;
    }

    const student: Student = {
      id: `stu-${Date.now()}`,
      tenantId,
      name,
      email,
      grade,
      previousYearBalance: 0,
      status: 'active',
    };
    students.push(student);

    res.status(201).json({
      status: 'CREATED',
      tenantId,
      student,
    });
  }
);

// ---------------------------------------------------------------------------
// POST /import-students — Bulk CSV/Excel import
// Protected: valid tenant & SUPER_ADMIN or ADMIN
// ---------------------------------------------------------------------------
schoolRouter.post(
  '/import-students',
  requireTenant,
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  upload.single('file'),
  async (req: Request, res: Response, _next: NextFunction) => {
    const tenantId = (req as Request & { tenantId?: string }).tenantId as string;

    try {
      if (!req.file) {
        res.status(400).json({ error: 'CSV or Excel file is required (field name: file)' });
        return;
      }

      const originalName = req.file.originalname.toLowerCase();
      const ext = originalName.slice(originalName.lastIndexOf('.'));
      let rows: unknown[][] = [];

      if (ext === '.csv') {
        const records = parse(req.file.buffer, {
          columns: false,
          skip_empty_lines: true,
          relax_column_count: true,
          bom: true,
          encoding: 'utf8',
        });
        rows = records as unknown[][];
      } else if (ext === '.xlsx' || ext === '.xls') {
        const excelRows = await readXlsxFile(req.file.buffer);
        rows = excelRows.flatMap((sheet) => sheet.data) as unknown[][];
      } else {
        res.status(400).json({ error: 'Unsupported file type. Please upload a CSV or Excel (.xlsx/.xls) file.' });
        return;
      }

      if (rows.length < 2) {
        res.status(400).json({
          error: 'File must contain a header row and at least one data row',
          expectedColumns: REQUIRED_COLUMNS.map((c) => c.header),
        });
        return;
      }

      const parsedRows = normalizeRows(rows);
      const headerNames = (rows[0] || []).map((h) => String(h ?? '').trim().toLowerCase());
      const missingColumns = REQUIRED_COLUMNS.filter(
        (col) => !headerNames.includes(col.header.toLowerCase())
      ).map((col) => col.header);

      if (missingColumns.length > 0) {
        res.status(400).json({
          error: `Missing required column(s): ${missingColumns.join(', ')}`,
          expectedColumns: REQUIRED_COLUMNS.map((c) => c.header),
        });
        return;
      }

      const inserted: Student[] = [];
      const skipped: Array<{ row: number; reason: string }> = [];
      const errors: Array<{ row: number; error: string }> = [];

      parsedRows.forEach((record, index) => {
        const rowNumber = index + 2; // 1-based + header
        const validationError = validateRow(record, rowNumber);
        if (validationError) {
          errors.push({ row: rowNumber, error: validationError });
          return;
        }

        const normalizedName = record.studentName.toLowerCase().replace(/\s+/g, ' ');
        const isDuplicate = students.some(
          (s) =>
            s.tenantId === tenantId &&
            s.name.toLowerCase().replace(/\s+/g, ' ') === normalizedName &&
            s.parentPhone === record.parentPhone
        );

        if (isDuplicate) {
          skipped.push({ row: rowNumber, reason: `Duplicate student '${record.studentName}' (same name & parent phone)` });
          return;
        }

        const student = buildStudent(record, tenantId, inferClass(record));
        students.push(student);
        inserted.push(student);
      });

      res.status(200).json({
        status: 'IMPORT_COMPLETE',
        tenantId,
        file: req.file.originalname,
        summary: {
          totalRows: parsedRows.length,
          inserted: inserted.length,
          skippedDuplicates: skipped.length,
          errors: errors.length,
        },
        inserted,
        skipped,
        errors,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      res.status(400).json({ error: `Import failed: ${message}` });
    }
  }
);

export default schoolRouter;