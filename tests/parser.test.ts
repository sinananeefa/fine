import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ingestTransactions,
  parseCurrencyAmount,
  tokenizeRawTextByTxnId,
  validateAndNormalizeDate,
  validateAndParseAmount,
} from '../src/services/parser';

describe('Parser & Ingestion Engine', () => {
  it('correctly normalizes currency amounts with dollar signs, negatives, and commas', () => {
    expect(parseCurrencyAmount('-$9,000.00')).toBe(-9000);
    expect(parseCurrencyAmount('$17,513.84')).toBe(17513.84);
    expect(parseCurrencyAmount('($1,043.52)')).toBe(-1043.52);
    expect(parseCurrencyAmount('-$650.00')).toBe(-650);
    expect(parseCurrencyAmount('$0.00')).toBe(0);
  });

  describe('validateAndParseAmount', () => {
    it('validates positive and negative numeric amounts', () => {
      expect(validateAndParseAmount('$1,234.56')).toEqual({ amount: 1234.56, isValid: true });
      expect(validateAndParseAmount('-$500.00')).toEqual({ amount: -500, isValid: true });
      expect(validateAndParseAmount('($250.75)')).toEqual({ amount: -250.75, isValid: true });
      expect(validateAndParseAmount('0.00')).toEqual({ amount: 0, isValid: true });
    });

    it('rejects alphabetic text like PENDING, VOID, N/A', () => {
      const pendingRes = validateAndParseAmount('PENDING');
      expect(pendingRes.isValid).toBe(false);
      expect(pendingRes.error).toContain('No numeric digits found');

      const voidRes = validateAndParseAmount('VOID');
      expect(voidRes.isValid).toBe(false);

      const emptyRes = validateAndParseAmount('');
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.error).toContain('Amount is empty');
    });

    it('rejects multiple decimal points', () => {
      const res = validateAndParseAmount('12.34.56');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Multiple decimal points found');
    });
  });

  describe('validateAndNormalizeDate', () => {
    it('validates and normalizes valid dates', () => {
      expect(validateAndNormalizeDate('2026-01-15')).toEqual({ date: '2026-01-15', isValid: true });
      expect(validateAndNormalizeDate('1/5/2026')).toEqual({ date: '2026-01-05', isValid: true });
      expect(validateAndNormalizeDate('2026/02/28')).toEqual({ date: '2026-02-28', isValid: true });
    });

    it('rejects impossible calendar date values like month 15 or day 99', () => {
      const res = validateAndNormalizeDate('2026-15-99');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Invalid calendar date values');
    });

    it('rejects non-date garbage text', () => {
      const res = validateAndNormalizeDate('not-a-date');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Unrecognized or invalid date format');

      const emptyRes = validateAndNormalizeDate('   ');
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.error).toContain('Date field is empty or missing');
    });
  });

  it('tokenizes concatenated lines by T\\d{4} anchor', () => {
    const fused = 'Bank depositT1070 2026-02-15 POS batch deposit - beverage sales week 2 Toast POS $6,299.96 Bank depositT1071 2026-02-15 Catering invoice payment week 2 Corporate Catering Client $2,439.71 ACH deposit';
    const tokens = tokenizeRawTextByTxnId(fused);
    expect(tokens.length).toBe(2);
    expect(tokens[0].id).toBe('T1070');
    expect(tokens[1].id).toBe('T1071');
  });

  it('ingests the benchmark CSV file and validates all 181 contiguous rows', () => {
    const csvPath = path.resolve(__dirname, '../data/NYC_Restaurant_Co__-_Raw_Transactions.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const result = ingestTransactions(content);

    expect(result.report.totalRows).toBe(181);
    expect(result.report.expectedRows).toBe(181);
    expect(result.report.isContiguous).toBe(true);
    expect(result.report.missingIds.length).toBe(0);
    expect(result.report.duplicateIds.length).toBe(0);
    expect(result.report.invalidDates.length).toBe(0);
    expect(result.report.unparsedAmounts.length).toBe(0);
    expect(result.report.netCashMatches).toBe(true);
    expect(result.report.isValid).toBe(true);

    // Check specific known rows
    const t1061 = result.transactions.find((t) => t.id === 'T1061');
    expect(t1061).toBeDefined();
    expect(t1061?.amount).toBe(-7800.00);

    const t1062 = result.transactions.find((t) => t.id === 'T1062');
    expect(t1062?.amount).toBe(-6150.00);

    const t1117 = result.transactions.find((t) => t.id === 'T1117');
    expect(t1117?.amount).toBe(2400.00);

    const t1181 = result.transactions.find((t) => t.id === 'T1181');
    expect(t1181?.amount).toBe(-900.00);
  });

  it('correctly ingests uploaded CSV with BOM, unquoted commas, and custom rows', () => {
    const customCsv = `\uFEFFDate,Description,Counterparty,Amount,Method
2026-01-15,Table service dinner,Dining Room,$1,450.50,Square POS
2026-01-16,Vegetable supplies,Local Farm,-$320.00,ACH
2026-01-17,Equipment repair,Kitchen Fixers,-$1,200.00,Credit Card`;

    const result = ingestTransactions(customCsv);
    expect(result.transactions.length).toBe(3);
    expect(result.report.totalRows).toBe(3);
    expect(result.report.isValid).toBe(true);
    expect(result.transactions[0].amount).toBe(1450.50);
    expect(result.transactions[1].amount).toBe(-320.00);
    expect(result.transactions[2].amount).toBe(-1200.00);
    expect(result.report.netCashMatches).toBe(true);
  });

  it('normalizes various date formats in uploaded CSV', () => {
    const mixedDatesCsv = `Transaction ID,Date,Description,Counterparty,Amount,Method
TXN01,1/5/2026,Service fee,Stripe,-$45.00,Direct
TXN02,2026/02/14,Valentine dinner,Guests,$4200.00,POS`;

    const result = ingestTransactions(mixedDatesCsv);
    expect(result.transactions.length).toBe(2);
    expect(result.transactions[0].date).toBe('2026-01-05');
    expect(result.transactions[1].date).toBe('2026-02-14');
  });

  describe('Robust Error Handling for Malformed CSV Rows', () => {
    it('skips empty rows, delimiter-only lines, and summary rows without adding errors', () => {
      const csvWithEmptyAndSummaries = `Date,Description,Counterparty,Amount,Method
2026-01-10,Valid Sales,POS,$1000.00,Card

,,,,,
\t\t\t
2026-01-11,Valid Supplies,Sysco,-$250.00,ACH
Total Monthly Sales,,,,$750.00,
Ending Balance: $50000.00`;

      const result = ingestTransactions(csvWithEmptyAndSummaries);
      expect(result.transactions.length).toBe(2);
      expect(result.report.totalRows).toBe(2);
      expect(result.report.skippedRowsCount).toBeGreaterThanOrEqual(1);
      expect(result.report.errors.length).toBe(0);
      expect(result.report.isValid).toBe(true);
    });

    it('rejects rows with invalid date formats and generates actionable row errors', () => {
      const csvWithBadDate = `Transaction ID,Date,Description,Counterparty,Amount,Method
T1001,2026-01-10,Valid Row,Toast,$500.00,Card
T1002,2026-15-99,Impossible Date,Vendor,-$200.00,ACH
T1003,not-a-date,Broken Date,Vendor,-$150.00,Check`;

      const result = ingestTransactions(csvWithBadDate);
      // Only T1001 should be accepted
      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0].id).toBe('T1001');
      expect(result.report.isValid).toBe(false);
      expect(result.report.errors.length).toBe(2);
      expect(result.report.errors[0]).toContain('Row 3: Invalid date "2026-15-99"');
      expect(result.report.errors[1]).toContain('Row 4: Invalid date "not-a-date"');
      expect(result.report.rowIssues?.length).toBe(2);
      expect(result.report.rowIssues?.[0].issueType).toBe('invalid_date');
    });

    it('rejects rows with invalid amount formats (e.g. PENDING, multiple decimals) and isolates them', () => {
      const csvWithBadAmount = `Transaction ID,Date,Description,Counterparty,Amount,Method
T1001,2026-01-10,Valid Row,Toast,$500.00,Card
T1002,2026-01-11,Pending Settlement,Bank,PENDING,Wire
T1003,2026-01-12,Corrupt Decimals,Wholesale,-$12.34.56,ACH`;

      const result = ingestTransactions(csvWithBadAmount);
      // Only T1001 should be accepted
      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0].id).toBe('T1001');
      expect(result.report.isValid).toBe(false);
      expect(result.report.errors.length).toBe(2);
      expect(result.report.errors[0]).toContain('Row 3: Invalid currency amount "PENDING"');
      expect(result.report.errors[1]).toContain('Row 4: Invalid currency amount "-$12.34.56"');
      expect(result.report.rowIssues?.some((i) => i.issueType === 'invalid_amount')).toBe(true);
    });

    it('rejects malformed garbage rows with insufficient columns and reports row number', () => {
      const csvWithGarbageRow = `Transaction ID,Date,Description,Counterparty,Amount,Method
T01,2026-01-10,Valid Row,Toast,$500.00,Card
Random unformatted garbage row with no commas
T02,2026-01-12,Valid Row 2,Toast,$300.00,Card`;

      const result = ingestTransactions(csvWithGarbageRow);
      expect(result.transactions.length).toBe(2);
      expect(result.report.errors.length).toBe(1);
      expect(result.report.errors[0]).toContain('Row 3: Malformed row structure');
      expect(result.report.rowIssues?.[0].issueType).toBe('malformed_structure');
      expect(result.report.rowIssues?.[0].rowNumber).toBe(3);
    });

    it('correctly parses mixed CSV containing valid rows, empty rows, bad dates, bad amounts, and garbage', () => {
      const mixedCsv = `Transaction ID,Date,Description,Counterparty,Amount,Method
T2001,2026-01-05,Regular dining sales,Toast POS,$4250.00,Credit Card
T2002,2026-15-99,Impossible date values,Vendor Supply,-$320.00,ACH
,,,,,
T2003,2026-01-08,Unsettled transaction,Bank of America,PENDING,Wire
Garbage unformatted text row without any csv commas or columns
T2004,not-a-date,Kitchen repairs,Fixer Pros,-$850.00,Check
T2005,2026-01-12,Dual decimal corruption,Wholesale Co,-$12.34.56,Credit Card
T2006,2026-01-14,Valid bar revenue,Toast POS,$1890.50,Credit Card
Total Monthly Sales,,,,$6140.50,`;

      const result = ingestTransactions(mixedCsv);
      // Valid rows: T2001 ($4250.00) and T2006 ($1890.50)
      expect(result.transactions.length).toBe(2);
      expect(result.transactions[0].id).toBe('T2001');
      expect(result.transactions[0].amount).toBe(4250.00);
      expect(result.transactions[1].id).toBe('T2006');
      expect(result.transactions[1].amount).toBe(1890.50);

      // Report assertions
      expect(result.report.totalRows).toBe(2);
      expect(result.report.totalParsedNetCash).toBe(6140.50);
      expect(result.report.netCashMatches).toBe(true);
      expect(result.report.isValid).toBe(false); // Because malformed rows were quarantined
      expect(result.report.errors.length).toBe(5); // T2002 (date), T2003 (amount), garbage, T2004 (date), T2005 (amount)
      expect(result.report.rowIssues?.length).toBe(5);

      // Verify specific issue classifications
      const dateIssues = result.report.rowIssues?.filter((i) => i.issueType === 'invalid_date');
      const amountIssues = result.report.rowIssues?.filter((i) => i.issueType === 'invalid_amount');
      const structIssues = result.report.rowIssues?.filter((i) => i.issueType === 'malformed_structure');

      expect(dateIssues?.length).toBe(2); // T2002 and T2004
      expect(amountIssues?.length).toBe(2); // T2003 and T2005
      expect(structIssues?.length).toBe(1); // Garbage row
    });
  });
});
