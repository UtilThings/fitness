/// <reference types="node" />

import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { csvFilename, downloadCsv, toCsv } from './csv';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('CSV', () => {
  it('writes BOM, Unicode, CRLF and round-trips embedded commas, quotes and line breaks', () => {
    const detail = 'Martínez, "mañana"\r\notra línea';
    const csv = toCsv(
      [{ key: 'name', label: 'Descripción' }],
      [{ name: detail }, { name: 'niñez' }],
    );
    expect(csv).toBe(
      '\uFEFFDescripción\r\n"Martínez, ""mañana""\r\notra línea"\r\nniñez',
    );
    const decoded = execFileSync(
      'python3',
      [
        '-c',
        'import csv, io, json, sys; print(json.dumps(list(csv.reader(io.StringIO(sys.stdin.buffer.read().decode("utf-8-sig"), newline="")))))',
      ],
      { input: csv, encoding: 'utf8' },
    );
    expect(JSON.parse(decoded)).toEqual([['Descripción'], [detail], ['niñez']]);
  });

  it('neutralizes formula prefixes and preserves numeric and money columns', () => {
    const csv = toCsv(
      [
        { key: 'text', label: 'Texto' },
        { key: 'number', label: 'Número', type: 'number' },
        { key: 'money', label: 'Importe', type: 'money' },
      ],
      [
        { text: '=HYPERLINK("http://x","a")', number: -5, money: 26800 },
        { text: '+1+1', number: '@SUM', money: -1 },
        { text: '@SUM' },
        { text: '-2+3' },
        { text: '-5 días' },
        { text: '\ttexto' },
        { text: '\rtexto' },
        { text: '  =texto' },
        { text: null, number: undefined, money: null },
      ],
    );
    expect(csv).toBe(
      [
        '\uFEFFTexto,Número,Importe',
        '"\'=HYPERLINK(""http://x"",""a"")",-5,268.00',
        "'+1+1,'@SUM,-0.01",
        "'@SUM,,",
        "'-2+3,,",
        "'-5 días,,",
        "'\ttexto,,",
        '"\'\rtexto",,',
        "'  =texto,,",
        ',,',
      ].join('\r\n'),
    );
  });

  it('sanitizes the report filename', () => {
    expect(csvFilename('revenue', '2026-11-01', '2026-11-30')).toBe(
      'jq-reportes-revenue-2026-11-01_2026-11-30.csv',
    );
    expect(csvFilename('../RévenuE', '2026/11/01', '2026:11:30')).toMatch(
      /^[a-z0-9_-]+\.csv$/,
    );
  });

  it('downloads a CSV blob and cleans up the link and object URL', () => {
    vi.useFakeTimers();
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:report');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('report.csv');
        expect(this.href).toBe('blob:report');
        expect(this.isConnected).toBe(true);
      });
    downloadCsv('report.csv', '\uFEFFTexto');
    expect(create.mock.calls[0][0]).toMatchObject({
      type: 'text/csv;charset=utf-8',
    });
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:report');
  });
});
