export function readPNG(bytes) {
  let w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  let h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];

  let chan = [1, null, 3, -1, 2, null, 4][bytes[25]];
  let bitdep = bytes[24];
  let lace = bytes[28];

  let ci = 33,
    ct;
  let zs = [];
  let plte = [];
  let trns = [];
  do {
    let l =
      (bytes[ci] << 24) |
      (bytes[ci + 1] << 16) |
      (bytes[ci + 2] << 8) |
      bytes[ci + 3];
    ct = String.fromCharCode(
      bytes[ci + 4],
      bytes[ci + 5],
      bytes[ci + 6],
      bytes[ci + 7],
    );

    if (ct == "IDAT") {
      for (let i = ci + 8; i < ci + 8 + l; i++) zs.push(bytes[i]);
    }
    if (ct == "PLTE" && chan == -1) {
      for (let i = ci + 8; i < ci + 8 + l; i += 3) {
        plte.push([bytes[i], bytes[i + 1], bytes[i + 2]]);
      }
    }
    if (ct == "tRNS") {
      for (let i = ci + 8; i < ci + 8 + l; i++) trns.push(bytes[i]);
    }
    ci += l + 12;
  } while (ct != "IEND");

  zs = zs.slice(2, -4);

  let cur = 0;
  function gbit(n = 1, rev = false) {
    function g(i) {
      let b = ~~(i / 8);
      return (zs[b] >> i % 8) & 1;
    }
    let o = 0;
    for (let j = 0; j < n; j++) {
      if (!rev) o = (o << 1) | g(cur++);
      else o |= g(cur++) << j;
    }
    return o;
  }
  let bfinal, btype;
  let dat = [];

  function glz(a, read_dst = null) {
    let len, ex0, dst, ex1;
    if (a <= 264) {
      len = a - 254;
    } else if (a <= 284) {
      let n = ~~((a - 265) / 4) + 1;
      let m = (a - 265) % 4;
      ex0 = gbit(n, true);
      len = ex0 + m * (1 << n) + [0, 11, 19, 35, 67, 131][n];
    } else {
      len = 258;
    }
    let d;
    if (read_dst) {
      d = read_dst();
    } else {
      d = gbit(5);
    }
    if (d <= 3) {
      dst = d + 1;
    } else {
      let n = ~~((d - 4) / 2) + 1;
      let m = (d - 4) % 2;
      ex1 = gbit(n, true);
      dst =
        ex1 +
        m * (1 << n) +
        [0, 5, 9, 17, 33, 65, 129, 257, 513, 1025, 2049, 4097, 8193, 16385][n];
    }

    let ptr = dat.length - dst;
    for (let i = 0; i < len; i++) {
      dat.push(dat[ptr++]);
    }
  }

  function mkhuff(lens, num) {
    let bl_count = new Array(num).fill(0);
    for (let i = 0; i < num; i++) {
      bl_count[lens[i]]++;
    }
    bl_count[0] = 0;
    let MAX_BITS = 15;
    let code = 0;
    let nextcode = new Array(16).fill(0);
    for (let bits = 1; bits <= MAX_BITS; bits++) {
      code = (code + bl_count[bits - 1]) << 1;
      nextcode[bits] = code;
    }
    let codes = {};
    for (let n = 0; n < num; n++) {
      let len = lens[n];
      if (len != 0) {
        codes[nextcode[len].toString(2).padStart(lens[n], "0")] = n;
        nextcode[len]++;
      }
    }
    // console.log(codes);
    return codes;
  }

  do {
    bfinal = gbit(1);
    btype = gbit(2, true);

    if (btype == 0) {
      zs.reverse();
      zs.pop();
      let len = zs.pop() | (zs.pop() << 8);
      let nle = zs.pop() | (zs.pop() << 8);
      for (let i = 0; i < len; i++) {
        dat.push(zs.pop());
      }
      zs.reverse();
      cur = 0;
    } else if (btype == 1) {
      while (1) {
        let a = gbit(7);
        if (a == 0) {
          break;
        } else if (a <= 0b0010111) {
          glz(a + 256);
        } else {
          a = (a << 1) | gbit(1);
          if (a <= 0b10111111) {
            dat.push(a - 0b00110000 + 0);
          } else if (a <= 0b11000111) {
            glz(a - 0b11000000 + 280);
          } else {
            a = (a << 1) | gbit(1);
            dat.push(a - 0b110010000 + 144);
          }
        }
      }
    } else if (btype == 2) {
      let hlit = gbit(5, true) + 257;
      let hdist = gbit(5, true) + 1;
      let hclen = gbit(4, true) + 4;
      let lens = new Array(19).fill(0);
      let ordr = [
        16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
      ];
      for (let i = 0; i < hclen; i++) {
        lens[ordr[i]] = gbit(3, true);
      }

      let codes = mkhuff(lens, 19);

      let n = 0;
      let b = "";
      let lencodes = [];
      while (n < hlit + hdist) {
        let a = gbit(1);
        b += "" + a;
        let c = codes[b];
        if (c != undefined) {
          b = "";
          let f = 0,
            m;
          if (c <= 15) {
            lencodes[n++] = c;
          } else if (c == 16) {
            m = gbit(2, true) + 3;
            f = lencodes[n - 1];
          } else if (c == 17) {
            m = gbit(3, true) + 3;
          } else if (c == 18) {
            m = gbit(7, true) + 11;
          }
          for (let j = 0; j < m; j++) lencodes[n++] = f;
        }
      }

      let zlen = mkhuff(lencodes.slice(0, hlit), hlit);
      let zdst = mkhuff(lencodes.slice(hlit), hdist);

      b = "";
      while (1) {
        b += "" + gbit(1);
        let c = zlen[b];
        if (c != undefined) {
          b = "";
          if (c < 256) {
            dat.push(c);
          } else if (c == 256) {
            break;
          } else {
            glz(c, function () {
              let bb = "";
              while (1) {
                bb += "" + gbit(1);
                let cc = zdst[bb];
                if (cc != undefined) return cc;
              }
            });
          }
        }
      }
    }
  } while (!bfinal);

  function paeth(a, b, c) {
    let p = a + b - c;
    let pa = Math.abs(p - a);
    let pb = Math.abs(p - b);
    let pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    else if (pb <= pc) return b;
    return c;
  }

  let bpp = chan >= 2 ? (chan * bitdep) / 8 : Math.ceil(bitdep / 8); // byte/pix

  function mkdata(bpl, h) {
    let data = [];
    for (let i = 0; i < h; i++) {
      let t = dat.pop();
      for (let j = 0; j < bpl / bpp; j++) {
        for (let k = 0; k < bpp; k++) {
          let v = dat.pop();
          let ua = j ? data[i * bpl + (j - 1) * bpp + k] : 0;
          let ub = i ? data[(i - 1) * bpl + j * bpp + k] : 0;
          let uc = i && j ? data[(i - 1) * bpl + (j - 1) * bpp + k] : 0;
          if (t == 0) {
            data.push(v);
          } else if (t == 1) {
            data.push((ua + v) % 256);
          } else if (t == 2) {
            data.push((ub + v) % 256);
          } else if (t == 3) {
            data.push((~~((ua + ub) / 2) + v) % 256);
          } else if (t == 4) {
            let u = paeth(ua, ub, uc);
            data.push((u + v) % 256);
          }
        }
      }
    }
    return data;
  }

  function mkrgba(data, w, h, bpl) {
    if (chan == 4 && bitdep == 8) {
      return data;
    }
    let kr, kg, kb, fix_chroma;
    if (
      (fix_chroma = trns.length && (chan == 3 || (chan == 1 && bitdep >= 8)))
    ) {
      kr = kg = kb = (trns[0] << 8) | trns[1];
      if (chan > 1) {
        kg = (trns[2] << 8) | trns[3];
        kb = (trns[4] << 8) | trns[5];
      }
    }

    let rgba = new Array(w * h * 4);
    function remap8(a, b, c, d) {
      for (let i = 0; i < w * h; i++) {
        rgba[i * 4] = a >= 0 ? data[i * chan + a] : 255;
        rgba[i * 4 + 1] = b >= 0 ? data[i * chan + b] : 255;
        rgba[i * 4 + 2] = c >= 0 ? data[i * chan + c] : 255;
        rgba[i * 4 + 3] = d >= 0 ? data[i * chan + d] : 255;
      }
    }
    function remap16(a, b, c, d, dont_scale = false) {
      let s = 1,
        q = 65535;
      if (!dont_scale) {
        s = 255 / 65535;
        q = 255;
      }
      for (let i = 0; i < w * h; i++) {
        rgba[i * 4] =
          a >= 0
            ? ((data[i * chan * 2 + a * 2] << 8) | data[i * chan * 2 + a * 2]) *
              s
            : q;
        rgba[i * 4 + 1] =
          b >= 0
            ? ((data[i * chan * 2 + b * 2] << 8) | data[i * chan * 2 + b * 2]) *
              s
            : q;
        rgba[i * 4 + 2] =
          c >= 0
            ? ((data[i * chan * 2 + c * 2] << 8) | data[i * chan * 2 + c * 2]) *
              s
            : q;
        rgba[i * 4 + 3] =
          d >= 0
            ? ((data[i * chan * 2 + d * 2] << 8) | data[i * chan * 2 + d * 2]) *
              s
            : q;
      }
    }
    function gpb(i) {
      let b = ~~((i * bitdep) / 8);
      let c = (i * bitdep) % 8;
      let s = 8 - bitdep - c;
      let d = (data[b] >>> s) & ((1 << bitdep) - 1);
      return d;
    }

    if (bitdep == 8) {
      if (chan == 4) remap8(0, 1, 2, 3);
      else if (chan == 3) remap8(0, 1, 2, -1);
      else if (chan == 2) remap8(0, 0, 0, 1);
      else if (chan == 1) remap8(0, 0, 0, -1);
      else {
        for (let i = 0; i < w * h; i++) {
          rgba[i * 4] = plte[data[i]][0];
          rgba[i * 4 + 1] = plte[data[i]][1];
          rgba[i * 4 + 2] = plte[data[i]][2];
          rgba[i * 4 + 3] = trns[data[i]] ?? 255;
        }
      }
    } else if (bitdep == 16) {
      if (chan == 4) remap16(0, 1, 2, 3);
      else if (chan == 3) remap16(0, 1, 2, -1, fix_chroma);
      else if (chan == 2) remap16(0, 0, 0, 1);
      else if (chan == 1) remap16(0, 0, 0, -1, fix_chroma);
      else {
        for (let i = 0; i < w * h; i++) {
          let idx = (data[i * 2] << 8) | data[i * 2 + 1];
          rgba[i * 4] = plte[idx][0];
          rgba[i * 4 + 1] = plte[idx][1];
          rgba[i * 4 + 2] = plte[idx][2];
          rgba[i * 4 + 3] = trns[idx] ?? 255;
        }
      }
    } else {
      if (chan == 1) {
        let key = trns.length ? (trns[0] << 8) | trns[1] : -1;

        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            let idx = gpb((bpl * i * 8) / bitdep + j);
            if (idx !== key) {
              let v = (idx / ((1 << bitdep) - 1)) * 255;
              rgba[(i * w + j) * 4] = v;
              rgba[(i * w + j) * 4 + 1] = v;
              rgba[(i * w + j) * 4 + 2] = v;
              rgba[(i * w + j) * 4 + 3] = 255;
            }
          }
        }
      } else {
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            let idx = gpb((bpl * i * 8) / bitdep + j);
            let v = plte[idx];
            rgba[(i * w + j) * 4] = v[0];
            rgba[(i * w + j) * 4 + 1] = v[1];
            rgba[(i * w + j) * 4 + 2] = v[2];
            rgba[(i * w + j) * 4 + 3] = trns[idx] ?? 255;
          }
        }
      }
    }
    if (fix_chroma) {
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] == kr && rgba[i + 1] == kg && rgba[i + 2] == kb)
          rgba[i + 3] = 0;
      }
      if (bitdep == 16) {
        for (let i = 0; i < rgba.length; i++) {
          rgba[i] *= 255 / 65535;
        }
      }
    }
    return rgba;
  }

  let bpl = Math.ceil((w * bitdep * Math.abs(chan)) / 8);
  let data, rgba;
  dat.reverse();

  function cpy4(i, j, b, k) {
    if (b && j < w && i < h) {
      let idx = i * w * 4 + j * 4;
      k *= 4;
      rgba[idx] = b[k];
      rgba[idx + 1] = b[k + 1];
      rgba[idx + 2] = b[k + 2];
      rgba[idx + 3] = b[k + 3];
    }
  }

  if (lace) {
    let sb, sh;
    let w0 = Math.ceil(w / 8),
      w1 = Math.ceil((w - 4) / 8),
      w2 = Math.ceil(w / 4);
    let w3 = Math.ceil((w - 2) / 4),
      w4 = Math.ceil(w / 2),
      w5 = Math.ceil((w - 1) / 2);
    let q = (bitdep * Math.abs(chan)) / 8;

    let im0 = mkrgba(
      mkdata((sb = Math.ceil(w0 * q)), (sh = Math.ceil(h / 8))),
      w0,
      sh,
      sb,
    );
    let im1 =
      w > 4
        ? mkrgba(
            mkdata((sb = Math.ceil(w1 * q)), (sh = Math.ceil(h / 8))),
            w1,
            sh,
            sb,
          )
        : null;
    let im2 =
      h > 4
        ? mkrgba(
            mkdata((sb = Math.ceil(w2 * q)), (sh = Math.ceil((h - 4) / 8))),
            w2,
            sh,
            sb,
          )
        : null;
    let im3 =
      w > 2
        ? mkrgba(
            mkdata((sb = Math.ceil(w3 * q)), (sh = Math.ceil(h / 4))),
            w3,
            sh,
            sb,
          )
        : null;
    let im4 =
      h > 2
        ? mkrgba(
            mkdata((sb = Math.ceil(w4 * q)), (sh = Math.ceil((h - 2) / 4))),
            w4,
            sh,
            sb,
          )
        : null;
    let im5 =
      w > 1
        ? mkrgba(
            mkdata((sb = Math.ceil(w5 * q)), (sh = Math.ceil(h / 2))),
            w5,
            sh,
            sb,
          )
        : null;
    let im6 =
      h > 1
        ? mkrgba(mkdata((sb = bpl), (sh = Math.ceil(h / 2))), w, sh, sb)
        : null;

    rgba = new Array(w * h * 4);
    for (let i = 0; i < h; i += 8) {
      for (let j = 0; j < w; j += 8) {
        cpy4(i, j, im0, ~~(i / 8) * w0 + ~~(j / 8));
        cpy4(i, j + 4, im1, ~~(i / 8) * w1 + ~~(j / 8));
        cpy4(i + 4, j, im2, ~~(i / 8) * w2 + ~~(j / 4));
        cpy4(i + 4, j + 4, im2, ~~(i / 8) * w2 + ~~(j / 4) + 1);
        cpy4(i, j + 2, im3, ~~(i / 4) * w3 + ~~(j / 4));
        cpy4(i, j + 6, im3, ~~(i / 4) * w3 + ~~(j / 4) + 1);
        cpy4(i + 4, j + 2, im3, ~~(i / 4 + 1) * w3 + ~~(j / 4));
        cpy4(i + 4, j + 6, im3, ~~(i / 4 + 1) * w3 + ~~(j / 4) + 1);
        for (let k = 0; k < 8; k++)
          cpy4(
            i + ~~(k / 4) * 4 + 2,
            j + (k % 4) * 2,
            im4,
            ~~(i / 4 + ~~(k / 4)) * w4 + ~~(j / 2) + ~~(k % 4),
          );
        for (let k = 0; k < 16; k++)
          cpy4(
            i + ~~(k / 4) * 2,
            j + (k % 4) * 2 + 1,
            im5,
            ~~(i / 2 + ~~(k / 4)) * w5 + ~~(j / 2) + ~~(k % 4),
          );
      }
    }
    for (let i = 0; i < h && im6; i += 2) {
      for (let j = 0; j < w * 4; j++)
        rgba[(i + 1) * w * 4 + j] = im6[(i / 2) * w * 4 + j];
    }
  } else {
    data = mkdata(bpl, h);
    rgba = mkrgba(data, w, h, bpl);
  }

  return [rgba, w, h];
}

function write_png(data, w, h, num_chan = 4, add_chunks = []) {
  function crc_8b(c) {
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    return c >>> 0;
  }
  function calc_crc(buf) {
    let c = 0xffffffff >>> 0;
    for (let n = 0; n < buf.length; n++) {
      c = (crc_8b((c ^ buf[n]) & 0xff) ^ (c >>> 8)) >>> 0;
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  function calc_adler32(buf) {
    let adler = 1;
    let s1 = adler & 0xffff;
    let s2 = (adler >>> 16) & 0xffff;
    let n;
    for (n = 0; n < buf.length; n++) {
      s1 = (s1 + buf[n]) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    return (s2 << 16) + s1;
  }

  let buf = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  function uint32be(x) {
    return [(x >> 24) & 0xff, (x >> 16) & 0xff, (x >> 8) & 0xff, x & 0xff];
  }
  function write_chunk(name, data) {
    buf.push(...uint32be(data.length));
    let bytes = [
      name.charCodeAt(0),
      name.charCodeAt(1),
      name.charCodeAt(2),
      name.charCodeAt(3),
    ].concat(data);
    let crc = calc_crc(bytes);
    for (let i = 0; i < bytes.length; i++) buf.push(bytes[i]);
    buf.push(...uint32be(crc));
  }

  write_chunk("IHDR", [
    ...uint32be(w),
    ...uint32be(h),
    8,
    [null, 0, 4, 2, 6][num_chan],
    0,
    0,
    0,
  ]);
  for (let i = 0; i < add_chunks.length; i++) {
    write_chunk(add_chunks[i][0], add_chunks[i].slice(1));
  }

  let cmf = 8;
  let flg = Math.ceil((cmf * 256) / 31) * 31 - cmf * 256;

  let idat = [cmf, flg];
  let raw = [];

  for (let i = 0; i < h; i++) {
    let imgdata = [0];
    for (let j = 0; j < w; j++) {
      for (let k = 0; k < num_chan; k++) {
        imgdata.push(~~data[(i * w + j) * num_chan + k]);
      }
    }
    let len = imgdata.length;
    let nlen = (~imgdata.length >>> 0) & 0xffff;
    idat.push(Number(i == h - 1));
    idat.push(len & 0xff, (len >> 8) & 0xff, nlen & 0xff, (nlen >> 8) & 0xff);
    imgdata.forEach((x) => {
      raw.push(x);
      idat.push(x);
    });
  }
  idat.push(...uint32be(calc_adler32(raw)));

  write_chunk("IDAT", idat);
  write_chunk("IEND", []);
  return buf;
}
