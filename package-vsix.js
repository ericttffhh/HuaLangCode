import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log("=== 正在打包華語 VSCode 擴充套件 (.vsix) ===");

const extDir = './vscode-extension';
const distDir = './dist-vsix';

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(path.join(distDir, 'extension'), { recursive: true });

// 複製所有擴充套件檔案至 dist-vsix/extension
fs.cpSync(extDir, path.join(distDir, 'extension'), { recursive: true });

// 產生 [Content_Types].xml
const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="js" ContentType="application/javascript"/>
  <Default Extension="vsixmanifest" ContentType="text/xml"/>
</Types>`;
fs.writeFileSync(path.join(distDir, '[Content_Types].xml'), contentTypesXml, 'utf-8');

// 產生 extension.vsixmanifest
const vsixManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Id="chine-lang" Version="1.0.0" Publisher="hualang"/>
    <DisplayName>華語 (HuaLang / .chine) 中文程式語言</DisplayName>
    <Description>華語 (.chine) 獨立高階語言官方 VS Code 擴充套件</Description>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>`;
fs.writeFileSync(path.join(distDir, 'extension.vsixmanifest'), vsixManifestXml, 'utf-8');

// 使用 zip 指令打包為 .vsix
const vsixOutputPath = path.resolve('./chine-lang-1.0.0.vsix');
fs.rmSync(vsixOutputPath, { force: true });
execSync(`cd "${distDir}" && zip -r "${vsixOutputPath}" ./*`, { stdio: 'pipe' });
fs.rmSync(distDir, { recursive: true, force: true });

console.log(`🎉 打包完成！VSIX 離線安裝檔：${vsixOutputPath}`);
