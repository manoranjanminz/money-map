/* ===== Password-protected Excel (.xlsx) support =====
   Implements the published Office encryption format (MS-OFFCRYPTO: "agile" and "standard" AES)
   using the browser's built-in WebCrypto. Runs entirely on this device. */
const OC = (() => {
  const subtle = (typeof crypto !== 'undefined' && crypto.subtle) || null;
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const cat = (...arrs) => { const n = arrs.reduce((a, x) => a + x.length, 0), out = new Uint8Array(n); let o = 0; for(const a of arrs){ out.set(a, o); o += a.length; } return out; };
  const le32 = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };
  const utf16 = s => { const b = new Uint8Array(s.length * 2); for(let i = 0; i < s.length; i++){ const c = s.charCodeAt(i); b[i * 2] = c & 255; b[i * 2 + 1] = c >> 8; } return b; };
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const eq = (a, b, n) => { for(let i = 0; i < n; i++) if(a[i] !== b[i]) return false; return true; };
  const pwErr = code => { const e = new Error(code === 2 ? 'Incorrect password' : 'Password required'); e.name = 'PasswordException'; e.code = code; return e; };

  /* ---- minimal OLE compound-file reader ---- */
  function isCFB(b){ return b.length > 512 && b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0; }
  function readCFB(b){
    const ss = 1 << u16(b, 0x1E), mss = 1 << u16(b, 0x20);
    const sec = n => b.subarray((n + 1) * ss, (n + 2) * ss);
    const fatSectors = [];
    for(let i = 0; i < 109; i++){ const s = u32(b, 0x4C + i * 4); if(s < 0xFFFFFFFA) fatSectors.push(s); }
    let difat = u32(b, 0x44), guard = 0;
    while(difat < 0xFFFFFFFA && guard++ < 10000){
      const d = sec(difat), per = ss / 4 - 1;
      for(let i = 0; i < per; i++){ const s = u32(d, i * 4); if(s < 0xFFFFFFFA) fatSectors.push(s); }
      difat = u32(d, per * 4);
    }
    const fat = [];
    for(const s of fatSectors){ const d = sec(s); for(let i = 0; i < ss; i += 4) fat.push(u32(d, i)); }
    const chain = (start, table) => { const out = []; let s = start, g = 0; while(s < 0xFFFFFFFA && g++ < 1e6){ out.push(s); s = table[s]; } return out; };
    const readBig = start => cat(...chain(start, fat).map(sec));
    const dir = readBig(u32(b, 0x30));
    const entries = [];
    for(let o = 0; o + 128 <= dir.length; o += 128){
      const nl = u16(dir, o + 64); if(!nl) continue;
      let name = ''; for(let i = 0; i < nl - 2; i += 2) name += String.fromCharCode(u16(dir, o + i));
      entries.push({name, type: dir[o + 66], start: u32(dir, o + 116), size: u32(dir, o + 120)});
    }
    const root = entries.find(e => e.type === 5);
    const cutoff = u32(b, 0x38) || 4096;
    let miniFat = null, miniStream = null;
    const get = name => {
      const e = entries.find(x => x.name === name && x.type === 2);
      if(!e) return null;
      if(e.size < cutoff){
        if(!miniFat){ miniFat = []; const mf = readBig(u32(b, 0x3C)); for(let i = 0; i < mf.length; i += 4) miniFat.push(u32(mf, i)); miniStream = readBig(root.start); }
        return cat(...chain(e.start, miniFat).map(s => miniStream.subarray(s * mss, (s + 1) * mss))).subarray(0, e.size);
      }
      return readBig(e.start).subarray(0, e.size);
    };
    return {get, names: entries.map(e => e.name)};
  }

  /* ---- AES via WebCrypto (raw CBC / ECB, no padding) ---- */
  async function aesKey(raw){ return subtle.importKey('raw', raw, 'AES-CBC', false, ['encrypt', 'decrypt']); }
  async function cbc(key, iv, data){
    data = data.subarray(0, data.length - (data.length % 16));
    if(!data.length) return new Uint8Array(0);
    // WebCrypto insists on PKCS#7 padding: append a block that decrypts to a full padding block
    const fake = new Uint8Array(await subtle.encrypt({name: 'AES-CBC', iv: data.slice(data.length - 16)}, key, new Uint8Array(16).fill(16))).subarray(0, 16);
    return new Uint8Array(await subtle.decrypt({name: 'AES-CBC', iv}, key, cat(data, fake)));
  }
  async function ecb(key, data){
    data = data.subarray(0, data.length - (data.length % 16));
    const p = await cbc(key, new Uint8Array(16), data);
    for(let i = 16; i < p.length; i++) p[i] ^= data[i - 16];
    return p;
  }
  const H = async (alg, ...parts) => new Uint8Array(await subtle.digest(alg, cat(...parts)));
  const algName = a => ({SHA512: 'SHA-512', SHA1: 'SHA-1', 'SHA-1': 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384'})[String(a).toUpperCase()] || 'SHA-512';
  async function spin(alg, salt, password, count){
    let h = await H(alg, salt, utf16(password));
    const buf = new Uint8Array(4 + h.length), dv = new DataView(buf.buffer);
    for(let i = 0; i < count; i++){ dv.setUint32(0, i, true); buf.set(h, 4); h = new Uint8Array(await subtle.digest(alg, buf)); }
    return h;
  }
  const fit = (h, n) => { const out = new Uint8Array(n).fill(0x36); out.set(h.subarray(0, n)); return out; };

  async function agile(info, pkg, password){
    const xml = new TextDecoder().decode(info.subarray(8));
    const attrs = tag => { const m = xml.match(new RegExp('<(?:\\w+:)?' + tag + '\\b([^>]*)>')); const o = {}; if(m) m[1].replace(/(\w+)="([^"]*)"/g, (_, k, v) => { o[k] = v; }); return o; };
    const kd = attrs('keyData'), ek = attrs('encryptedKey');
    if(!ek.encryptedKeyValue) throw new Error('Unsupported Excel encryption.');
    const alg = algName(ek.hashAlgorithm), keyLen = +ek.keyBits / 8, salt = b64(ek.saltValue);
    const base = await spin(alg, salt, password, +ek.spinCount);
    const derive = async block => aesKey(fit(await H(alg, base, Uint8Array.from(block)), keyLen));
    const bVI = [0xfe, 0xa7, 0xd2, 0x76, 0x3b, 0x4b, 0x9e, 0x79], bVH = [0xd7, 0xaa, 0x0f, 0x6d, 0x30, 0x61, 0x34, 0x4e], bK = [0x14, 0x6e, 0x0b, 0xe7, 0xab, 0xac, 0xd0, 0xd6];
    const vIn = (await cbc(await derive(bVI), salt, b64(ek.encryptedVerifierHashInput))).subarray(0, +ek.saltSize || 16);
    const vHash = await cbc(await derive(bVH), salt, b64(ek.encryptedVerifierHashValue));
    const want = await H(alg, vIn);
    if(!eq(want, vHash, +ek.hashSize || want.length)) throw pwErr(2);
    const secret = (await cbc(await derive(bK), salt, b64(ek.encryptedKeyValue))).subarray(0, keyLen);
    const pk = await aesKey(secret), dAlg = algName(kd.hashAlgorithm), dSalt = b64(kd.saltValue), bs = +kd.blockSize || 16;
    const size = u32(pkg, 0), body = pkg.subarray(8), parts = [];
    for(let i = 0, seg = 0; i < body.length; i += 4096, seg++){
      const iv = fit(await H(dAlg, dSalt, le32(seg)), bs);
      parts.push(await cbc(pk, iv, body.subarray(i, Math.min(i + 4096, body.length))));
    }
    return cat(...parts).subarray(0, size);
  }
  async function standard(info, pkg, password){
    const hSize = u32(info, 8), h = 12;
    const keyBits = u32(info, h + 16) || 128;
    const v = h + hSize, saltSize = u32(info, v), salt = info.subarray(v + 4, v + 4 + saltSize);
    const encVer = info.subarray(v + 4 + saltSize, v + 20 + saltSize);
    const encVerHash = info.subarray(v + 24 + saltSize, v + 24 + saltSize + 32);
    const base = await spin('SHA-1', salt, password, 50000);
    const hf = await H('SHA-1', base, le32(0));
    const x = c => { const b = new Uint8Array(64).fill(c); for(let i = 0; i < hf.length; i++) b[i] ^= hf[i]; return b; };
    const key = cat(await H('SHA-1', x(0x36)), await H('SHA-1', x(0x5c))).subarray(0, keyBits / 8);
    const k = await aesKey(key);
    const ver = await ecb(k, encVer), verHash = await ecb(k, encVerHash);
    if(!eq(await H('SHA-1', ver), verHash, 20)) throw pwErr(2);
    return (await ecb(k, pkg.subarray(8))).subarray(0, u32(pkg, 0));
  }

  /* Returns null if the file isn't an encrypted Office document, otherwise the decrypted .xlsx bytes */
  function isEncrypted(bytes){
    if(!isCFB(bytes)) return false;
    try{ const c = readCFB(bytes); return c.names.includes('EncryptionInfo') && c.names.includes('EncryptedPackage'); }catch(e){ return false; }
  }
  async function decrypt(bytes, password){
    if(!password) throw pwErr(1);
    if(!subtle) throw new Error('This browser cannot open password-protected Excel files.');
    const c = readCFB(bytes), info = c.get('EncryptionInfo'), pkg = c.get('EncryptedPackage');
    const major = u16(info, 0), minor = u16(info, 2);
    if(major === 4 && minor === 4) return agile(info, pkg, password);
    if((major === 3 || major === 4) && minor === 2) return standard(info, pkg, password);
    throw new Error('This Excel file uses an encryption type that is not supported. Save a copy without a password, or download the CSV / PDF version.');
  }
  return {isEncrypted, decrypt};
})();
if(typeof module !== 'undefined') module.exports = OC;
