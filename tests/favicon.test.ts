import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('NEXUS Official Shield Favicon & Brand Lock Verification', () => {
  const indexHtmlPath = path.resolve(__dirname, '../index.html');
  const iconSvgPath = path.resolve(__dirname, '../public/icon.svg');
  const faviconIcoPath = path.resolve(__dirname, '../public/favicon.ico');
  const favicon32Path = path.resolve(__dirname, '../public/favicon-32x32.png');
  const favicon16Path = path.resolve(__dirname, '../public/favicon-16x16.png');
  const appleTouchPath = path.resolve(__dirname, '../public/apple-touch-icon.png');
  const manifestPath = path.resolve(__dirname, '../public/manifest.json');

  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
  const iconSvgContent = fs.readFileSync(iconSvgPath, 'utf-8');
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');

  it('1. public/icon.svg is valid XML and contains the official NEXUS shield', () => {
    expect(iconSvgContent).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(iconSvgContent).toContain('viewBox="0 0 512 512"');
    expect(iconSvgContent).toContain('stroke="#38BDF8"');
    expect(iconSvgContent).toContain('Shield Emblem');
    // Ensure no unquoted attributes
    expect(iconSvgContent).not.toMatch(/\w+=\s*[^"'\s>]+/);
    // Ensure no UTF-8 BOM
    expect(iconSvgContent.charCodeAt(0)).not.toBe(0xFEFF);
  });

  it('2. public/favicon.ico exists and has valid ICO header', () => {
    expect(fs.existsSync(faviconIcoPath)).toBe(true);
    const buf = fs.readFileSync(faviconIcoPath);
    expect(buf.length).toBeGreaterThan(100);
    // Standard ICO magic bytes: 0x0000 (reserved), 0x0001 (icon type)
    expect(buf[0]).toBe(0);
    expect(buf[1]).toBe(0);
    expect(buf[2]).toBe(1);
    expect(buf[3]).toBe(0);
  });

  it('3. PNG favicons exist and have valid PNG magic bytes', () => {
    const pngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (const file of [favicon32Path, favicon16Path, appleTouchPath]) {
      expect(fs.existsSync(file)).toBe(true);
      const buf = fs.readFileSync(file);
      for (let i = 0; i < pngMagic.length; i++) {
        expect(buf[i]).toBe(pngMagic[i]);
      }
    }
  });

  it('4. index.html configures standard favicon references without conflicts', () => {
    expect(indexHtmlContent).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico" />');
    expect(indexHtmlContent).toContain('<link rel="icon" type="image/svg+xml" href="/icon.svg" />');
    expect(indexHtmlContent).toContain('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />');
    expect(indexHtmlContent).toContain('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />');
    expect(indexHtmlContent).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />');
    expect(indexHtmlContent).toContain('<link rel="manifest" href="/manifest.json" />');
  });

  it('5. manifest.json is valid JSON referencing the official shield icons', () => {
    const manifest = JSON.parse(manifestContent);
    expect(manifest.name).toBe('NEXUS Private Messenger');
    expect(manifest.short_name).toBe('NEXUS');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    const iconSrcs = manifest.icons.map((i: { src: string }) => i.src);
    expect(iconSrcs).toContain('/icon.svg');
    expect(iconSrcs).toContain('/icon-192.png');
    expect(iconSrcs).toContain('/icon-512.png');
  });
});
