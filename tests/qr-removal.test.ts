import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Complete QR Functionality Removal Audit', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('ensures QR modal components have been deleted from disk', () => {
    const qrCodeModalPath = path.join(rootDir, 'src/client/components/QrCodeModal.tsx');
    const qrScannerModalPath = path.join(rootDir, 'src/client/components/QrScannerModal.tsx');

    expect(fs.existsSync(qrCodeModalPath)).toBe(false);
    expect(fs.existsSync(qrScannerModalPath)).toBe(false);
  });

  it('ensures package.json has no qrcode or jsqr dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    expect(allDeps['qrcode']).toBeUndefined();
    expect(allDeps['@types/qrcode']).toBeUndefined();
    expect(allDeps['jsqr']).toBeUndefined();
  });

  it('ensures Header.tsx has no QR button, prop, or import', () => {
    const content = fs.readFileSync(
      path.join(rootDir, 'src/client/components/Header.tsx'),
      'utf-8'
    );

    expect(content).not.toContain('header-qr-code-btn');
    expect(content).not.toContain('onOpenQrCode');
    expect(content).not.toContain('QrCode');
  });

  it('ensures LandingPage.tsx has no QR scanner button or import', () => {
    const content = fs.readFileSync(
      path.join(rootDir, 'src/client/pages/LandingPage.tsx'),
      'utf-8'
    );

    expect(content).not.toContain('landing-scan-qr-btn');
    expect(content).not.toContain('QrScannerModal');
    expect(content).not.toContain('onScanQr');
  });

  it('ensures JoinRoomPage.tsx has no QR scanner button or import', () => {
    const content = fs.readFileSync(
      path.join(rootDir, 'src/client/pages/JoinRoomPage.tsx'),
      'utf-8'
    );

    expect(content).not.toContain('QrScannerModal');
    expect(content).not.toContain('Scan QR');
  });

  it('ensures ChatRoomPage.tsx does not reference QrCodeModal', () => {
    const content = fs.readFileSync(
      path.join(rootDir, 'src/client/pages/ChatRoomPage.tsx'),
      'utf-8'
    );

    expect(content).not.toContain('QrCodeModal');
    expect(content).not.toContain('isQrCodeOpen');
  });

  it('ensures AboutModal.tsx has removed dynamic-qr feature', () => {
    const content = fs.readFileSync(
      path.join(rootDir, 'src/client/components/AboutModal.tsx'),
      'utf-8'
    );

    expect(content).not.toContain('dynamic-qr');
    expect(content).not.toContain('QrCode');
  });

  it('ensures GuideModal.tsx does not mention QR code', () => {
    const content = fs.readFileSync(
      path.join(rootDir, 'src/client/components/GuideModal.tsx'),
      'utf-8'
    );

    expect(content).not.toContain('QrCode');
    expect(content.toLowerCase()).not.toContain('qr code');
  });

  it('ensures AndroidManifest.xml does not request CAMERA permission', () => {
    const manifestPath = path.join(
      rootDir,
      'android/app/src/main/AndroidManifest.xml'
    );
    if (fs.existsSync(manifestPath)) {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      expect(content).not.toContain('android.permission.CAMERA');
    }
  });
});
