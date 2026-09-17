import { mkdir, copyFile, cp, readFile, rm } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import path from 'node:path';

async function validatePng(file) {
  const bytes = await readFile(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(signature)) throw new Error(`Invalid PNG signature: ${file}`);
  const idat = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error(`Truncated PNG chunk: ${file}`);
    if (type === 'IDAT') idat.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset = end;
  }
  if (!idat.length) throw new Error(`PNG has no image data: ${file}`);
  inflateSync(Buffer.concat(idat));
}

const target=path.resolve('dist');
if(path.dirname(target)!==process.cwd() || path.basename(target)!=='dist') throw new Error('Unsafe output directory');
await rm(target,{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await copyFile('index.html','dist/index.html');
await cp('src','dist/src',{recursive:true});
await cp('stages','dist/stages',{recursive:true});
await copyFile('sunrise_at_pixel_peak.mp3','dist/sunrise_at_pixel_peak.mp3');
await copyFile('ジャンプ.mp3','dist/ジャンプ.mp3');
await copyFile('可愛く着地.mp3','dist/可愛く着地.mp3');
await copyFile('029A536A-CC50-4049-B511-605245126177.png','dist/029A536A-CC50-4049-B511-605245126177.png');
await copyFile('7B1D2CC0-C6BB-4150-83C2-ACAF5D70B983.png','dist/7B1D2CC0-C6BB-4150-83C2-ACAF5D70B983.png');
await copyFile('B1003C9C-4C47-4249-B6A9-1507F723BB9B.png','dist/B1003C9C-4C47-4249-B6A9-1507F723BB9B.png');
await copyFile('9914630D-0C2F-469E-B82B-ED918A8EFB35.png','dist/9914630D-0C2F-469E-B82B-ED918A8EFB35.png');
await copyFile('594F8DAD-DC51-4DFF-9AC3-784FCB70FF74.png','dist/594F8DAD-DC51-4DFF-9AC3-784FCB70FF74.png');
await copyFile('90285534-ECDC-4BA6-96D4-BBA630AE34B7.png','dist/90285534-ECDC-4BA6-96D4-BBA630AE34B7.png');
await copyFile('70FE4599-3EA7-4DB1-A5DA-43DE8A833E60.png','dist/70FE4599-3EA7-4DB1-A5DA-43DE8A833E60.png');
await copyFile('CBED4124-3DEC-4943-8F26-61C3163030A8.png','dist/CBED4124-3DEC-4943-8F26-61C3163030A8.png');
await copyFile('631E092E-B66C-42C9-ACD8-BFDF3E25AFC7.png','dist/631E092E-B66C-42C9-ACD8-BFDF3E25AFC7.png');
await validatePng('TOA-alternating-walk.png');
await copyFile('TOA-alternating-walk.png','dist/TOA-alternating-walk.png');
console.log('Built dist/');
