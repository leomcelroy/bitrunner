export let cfg = {
  dpi: 1000,
  thresh: 127,
  tool0_d_in: 1 / 64,
  tool1_d_in: 1 / 32,
  clr_iters: 3,
  otl_iters: 5,
  trc_depth_in: 0.005,
  otl_depth_in: 0.075,
  epsilon: 0.75,
  offset_x_in: 0,
  offset_y_in: 0,
  dz_ul_in: 0,
  dz_ur_in: 0,
  dz_ll_in: 0,
  dz_lr_in: 0,
  zero_z_in: 0,
  trc_roi: null,
  voro_mode: false,
  clr_stepover: 0.6,
  trc_stepover: 0.1,
};

let px_to_mm = (1 / cfg.dpi) * 25.4;
let px_to_unit = px_to_mm * 100;
let in_to_unit = 2540;

let tool0_d_px = (cfg.tool0_d_in * 25.4) / px_to_mm;
let tool1_d_px = (cfg.tool1_d_in * 25.4) / px_to_mm;

export function updateConfig(c) {
  Object.assign(cfg, c);
  px_to_mm = (1 / cfg.dpi) * 25.4;
  px_to_unit = px_to_mm * 100;
  in_to_unit = 2540;

  tool0_d_px = (cfg.tool0_d_in * 25.4) / px_to_mm;
  tool1_d_px = (cfg.tool1_d_in * 25.4) / px_to_mm;
}

/** Finding contours in binary images and approximating polylines.
 *  Implements the same algorithms as OpenCV's findContours and approxPolyDP.
 *  <p>
 *  Made possible with support from The Frank-Ratchye STUDIO For Creative Inquiry
 *  At Carnegie Mellon University. http://studioforcreativeinquiry.org/
 *  @author Lingdong Huang
 */
var FindContours = new (function () {
  let that = this;

  let N_PIXEL_NEIGHBOR = 8;

  // give pixel neighborhood counter-clockwise ID's for
  // easier access with findContour algorithm
  function neighborIDToIndex(i, j, id) {
    if (id == 0) {
      return [i, j + 1];
    }
    if (id == 1) {
      return [i - 1, j + 1];
    }
    if (id == 2) {
      return [i - 1, j];
    }
    if (id == 3) {
      return [i - 1, j - 1];
    }
    if (id == 4) {
      return [i, j - 1];
    }
    if (id == 5) {
      return [i + 1, j - 1];
    }
    if (id == 6) {
      return [i + 1, j];
    }
    if (id == 7) {
      return [i + 1, j + 1];
    }
    return null;
  }
  function neighborIndexToID(i0, j0, i, j) {
    let di = i - i0;
    let dj = j - j0;
    if (di == 0 && dj == 1) {
      return 0;
    }
    if (di == -1 && dj == 1) {
      return 1;
    }
    if (di == -1 && dj == 0) {
      return 2;
    }
    if (di == -1 && dj == -1) {
      return 3;
    }
    if (di == 0 && dj == -1) {
      return 4;
    }
    if (di == 1 && dj == -1) {
      return 5;
    }
    if (di == 1 && dj == 0) {
      return 6;
    }
    if (di == 1 && dj == 1) {
      return 7;
    }
    return -1;
  }

  // first counter clockwise non-zero element in neighborhood
  function ccwNon0(F, w, h, i0, j0, i, j, offset) {
    let id = neighborIndexToID(i0, j0, i, j);
    for (let k = 0; k < N_PIXEL_NEIGHBOR; k++) {
      let kk = (k + id + offset + N_PIXEL_NEIGHBOR * 2) % N_PIXEL_NEIGHBOR;
      let ij = neighborIDToIndex(i0, j0, kk);
      if (F[ij[0] * w + ij[1]] != 0) {
        return ij;
      }
    }
    return null;
  }

  // first clockwise non-zero element in neighborhood
  function cwNon0(F, w, h, i0, j0, i, j, offset) {
    let id = neighborIndexToID(i0, j0, i, j);
    for (let k = 0; k < N_PIXEL_NEIGHBOR; k++) {
      let kk = (-k + id - offset + N_PIXEL_NEIGHBOR * 2) % N_PIXEL_NEIGHBOR;
      let ij = neighborIDToIndex(i0, j0, kk);
      if (F[ij[0] * w + ij[1]] != 0) {
        return ij;
      }
    }
    return null;
  }

  /**
   * Find contours in a binary image
   * <p>
   * Implements Suzuki, S. and Abe, K.
   * Topological Structural Analysis of Digitized Binary Images by Border Following.
   * <p>
   * See source code for step-by-step correspondence to the paper's algorithm
   * description.
   * @param  F    The bitmap, stored in 1-dimensional row-major form.
   *              0=background, 1=foreground, will be modified by the function
   *              to hold semantic information
   * @param  w    Width of the bitmap
   * @param  h    Height of the bitmap
   * @return      An array of contours found in the image.
   * @see         Contour
   */
  that.findContours = function (F, w, h) {
    // Topological Structural Analysis of Digitized Binary Images by Border Following.
    // Suzuki, S. and Abe, K., CVGIP 30 1, pp 32-46 (1985)
    let nbd = 1;
    let lnbd = 1;

    let contours = [];

    // Without loss of generality, we assume that 0-pixels fill the frame
    // of a binary picture
    for (let i = 1; i < h - 1; i++) {
      F[i * w] = 0;
      F[i * w + w - 1] = 0;
    }
    for (let i = 0; i < w; i++) {
      F[i] = 0;
      F[w * h - 1 - i] = 0;
    }

    //Scan the picture with a TV raster and perform the following steps
    //for each pixel such that fij # 0. Every time we begin to scan a
    //new row of the picture, reset LNBD to 1.
    for (let i = 1; i < h - 1; i++) {
      lnbd = 1;

      for (let j = 1; j < w - 1; j++) {
        let i2 = 0,
          j2 = 0;
        if (F[i * w + j] == 0) {
          continue;
        }
        //(a) If fij = 1 and fi, j-1 = 0, then decide that the pixel
        //(i, j) is the border following starting point of an outer
        //border, increment NBD, and (i2, j2) <- (i, j - 1).
        if (F[i * w + j] == 1 && F[i * w + (j - 1)] == 0) {
          nbd++;
          i2 = i;
          j2 = j - 1;

          //(b) Else if fij >= 1 and fi,j+1 = 0, then decide that the
          //pixel (i, j) is the border following starting point of a
          //hole border, increment NBD, (i2, j2) <- (i, j + 1), and
          //LNBD + fij in case fij > 1.
        } else if (F[i * w + j] >= 1 && F[i * w + j + 1] == 0) {
          nbd++;
          i2 = i;
          j2 = j + 1;
          if (F[i * w + j] > 1) {
            lnbd = F[i * w + j];
          }
        } else {
          //(c) Otherwise, go to (4).
          //(4) If fij != 1, then LNBD <- |fij| and resume the raster
          //scan from pixel (i,j+1). The algorithm terminates when the
          //scan reaches the lower right corner of the picture
          if (F[i * w + j] != 1) {
            lnbd = Math.abs(F[i * w + j]);
          }
          continue;
        }
        //(2) Depending on the types of the newly found border
        //and the border with the sequential number LNBD
        //(i.e., the last border met on the current row),
        //decide the parent of the current border as shown in Table 1.
        // TABLE 1
        // Decision Rule for the Parent Border of the Newly Found Border B
        // ----------------------------------------------------------------
        // Type of border B'
        // \    with the sequential
        //     \     number LNBD
        // Type of B \                Outer border         Hole border
        // ---------------------------------------------------------------
        // Outer border               The parent border    The border B'
        //                            of the border B'
        //
        // Hole border                The border B'      The parent border
        //                                               of the border B'
        // ----------------------------------------------------------------

        let B = {};
        B.points = [];
        B.points.push([j, i]);
        B.isHole = j2 == j + 1;
        B.id = nbd;
        contours.push(B);

        let B0 = {};
        for (let c = 0; c < contours.length; c++) {
          if (contours[c].id == lnbd) {
            B0 = contours[c];
            break;
          }
        }
        if (B0.isHole) {
          if (B.isHole) {
            B.parent = B0.parent;
          } else {
            B.parent = lnbd;
          }
        } else {
          if (B.isHole) {
            B.parent = lnbd;
          } else {
            B.parent = B0.parent;
          }
        }

        //(3) From the starting point (i, j), follow the detected border:
        //this is done by the following substeps (3.1) through (3.5).

        //(3.1) Starting from (i2, j2), look around clockwise the pixels
        //in the neigh- borhood of (i, j) and tind a nonzero pixel.
        //Let (i1, j1) be the first found nonzero pixel. If no nonzero
        //pixel is found, assign -NBD to fij and go to (4).
        let i1 = -1,
          j1 = -1;
        let i1j1 = cwNon0(F, w, h, i, j, i2, j2, 0);
        if (i1j1 == null) {
          F[i * w + j] = -nbd;
          //go to (4)
          if (F[i * w + j] != 1) {
            lnbd = Math.abs(F[i * w + j]);
          }
          continue;
        }
        i1 = i1j1[0];
        j1 = i1j1[1];

        // (3.2) (i2, j2) <- (i1, j1) ad (i3,j3) <- (i, j).
        i2 = i1;
        j2 = j1;
        let i3 = i;
        let j3 = j;

        while (true) {
          //(3.3) Starting from the next elementof the pixel (i2, j2)
          //in the counterclock- wise order, examine counterclockwise
          //the pixels in the neighborhood of the current pixel (i3, j3)
          //to find a nonzero pixel and let the first one be (i4, j4).

          let i4j4 = ccwNon0(F, w, h, i3, j3, i2, j2, 1);

          var i4 = i4j4[0];
          var j4 = i4j4[1];

          contours[contours.length - 1].points.push([j4, i4]);

          //(a) If the pixel (i3, j3 + 1) is a O-pixel examined in the
          //substep (3.3) then fi3, j3 <-  -NBD.
          if (F[i3 * w + j3 + 1] == 0) {
            F[i3 * w + j3] = -nbd;

            //(b) If the pixel (i3, j3 + 1) is not a O-pixel examined
            //in the substep (3.3) and fi3,j3 = 1, then fi3,j3 <- NBD.
          } else if (F[i3 * w + j3] == 1) {
            F[i3 * w + j3] = nbd;
          } else {
            //(c) Otherwise, do not change fi3, j3.
          }

          //(3.5) If (i4, j4) = (i, j) and (i3, j3) = (i1, j1)
          //(coming back to the starting point), then go to (4);
          if (i4 == i && j4 == j && i3 == i1 && j3 == j1) {
            if (F[i * w + j] != 1) {
              lnbd = Math.abs(F[i * w + j]);
            }
            break;

            //otherwise, (i2, j2) + (i3, j3),(i3, j3) + (i4, j4),
            //and go back to (3.3).
          } else {
            i2 = i3;
            j2 = j3;
            i3 = i4;
            j3 = j4;
          }
        }
      }
    }
    return contours;
  };

  function pointDistanceToSegment(p, p0, p1) {
    // https://stackoverflow.com/a/6853926
    let x = p[0];
    let y = p[1];
    let x1 = p0[0];
    let y1 = p0[1];
    let x2 = p1[0];
    let y2 = p1[1];
    let A = x - x1;
    let B = y - y1;
    let C = x2 - x1;
    let D = y2 - y1;
    let dot = A * C + B * D;
    let len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) {
      param = dot / len_sq;
    }
    let xx;
    let yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    let dx = x - xx;
    let dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Simplify contour by removing definately extraneous vertices,
   * without modifying shape of the contour.
   * @param  polyline  The vertices
   * @return           A simplified copy
   * @see              approxPolyDP
   */
  that.approxPolySimple = function (polyline) {
    let epsilon = 0.1;
    if (polyline.length <= 2) {
      return polyline;
    }
    let ret = [];
    ret.push(polyline[0].slice());

    for (let i = 1; i < polyline.length - 1; i++) {
      let d = pointDistanceToSegment(
        polyline[i],
        polyline[i - 1],
        polyline[i + 1],
      );
      if (d > epsilon) {
        ret.push(polyline[i].slice());
      }
    }
    ret.push(polyline[polyline.length - 1].slice());
    return ret;
  };

  /**
   * Simplify contour using Douglas Peucker algorithm.
   * <p>
   * Implements David Douglas and Thomas Peucker,
   * "Algorithms for the reduction of the number of points required to
   * represent a digitized line or its caricature",
   * The Canadian Cartographer 10(2), 112–122 (1973)
   * @param  polyline  The vertices
   * @param  epsilon   Maximum allowed error
   * @return           A simplified copy
   * @see              approxPolySimple
   */
  that.approxPolyDP = function (polyline, epsilon) {
    // https://en.wikipedia.org/wiki/Ramer–Douglas–Peucker_algorithm
    // David Douglas & Thomas Peucker,
    // "Algorithms for the reduction of the number of points required to
    // represent a digitized line or its caricature",
    // The Canadian Cartographer 10(2), 112–122 (1973)

    if (polyline.length <= 2) {
      return polyline;
    }
    let dmax = 0;
    let argmax = -1;
    for (let i = 1; i < polyline.length - 1; i++) {
      let d = pointDistanceToSegment(
        polyline[i],
        polyline[0],
        polyline[polyline.length - 1],
      );
      if (d > dmax) {
        dmax = d;
        argmax = i;
      }
    }
    // console.log(dmax)
    let ret = [];
    if (dmax > epsilon) {
      let L = that.approxPolyDP(polyline.slice(0, argmax + 1), epsilon);
      let R = that.approxPolyDP(
        polyline.slice(argmax, polyline.length),
        epsilon,
      );
      ret = ret.concat(L.slice(0, L.length - 1)).concat(R);
    } else {
      ret.push(polyline[0].slice());
      ret.push(polyline[polyline.length - 1].slice());
    }
    return ret;
  };
})();

function dist_transform(b, m, n) {
  // Meijster distance
  // adapted from https://github.com/parmanoir/Meijster-distance
  function EDT_f(x, i, g_i) {
    return (x - i) * (x - i) + g_i * g_i;
  }
  function EDT_Sep(i, u, g_i, g_u) {
    return Math.floor((u * u - i * i + g_u * g_u - g_i * g_i) / (2 * (u - i)));
  }
  // First phase
  let infinity = m + n;
  let g = new Array(m * n).fill(0);
  for (let x = 0; x < m; x++) {
    if (b[x + 0 * m]) {
      g[x + 0 * m] = 0;
    } else {
      g[x + 0 * m] = infinity;
    }
    // Scan 1
    for (let y = 1; y < n; y++) {
      if (b[x + y * m]) {
        g[x + y * m] = 0;
      } else {
        g[x + y * m] = 1 + g[x + (y - 1) * m];
      }
    }
    // Scan 2
    for (let y = n - 2; y >= 0; y--) {
      if (g[x + (y + 1) * m] < g[x + y * m]) {
        g[x + y * m] = 1 + g[x + (y + 1) * m];
      }
    }
  }

  // Second phase
  let dt = new Array(m * n).fill(0);
  let s = new Array(m).fill(0);
  let t = new Array(m).fill(0);
  let q = 0;
  let w;
  for (let y = 0; y < n; y++) {
    q = 0;
    s[0] = 0;
    t[0] = 0;

    // Scan 3
    for (let u = 1; u < m; u++) {
      while (
        q >= 0 &&
        EDT_f(t[q], s[q], g[s[q] + y * m]) > EDT_f(t[q], u, g[u + y * m])
      ) {
        q--;
      }
      if (q < 0) {
        q = 0;
        s[0] = u;
      } else {
        w = 1 + EDT_Sep(s[q], u, g[s[q] + y * m], g[u + y * m]);
        if (w < m) {
          q++;
          s[q] = u;
          t[q] = w;
        }
      }
    }
    // Scan 4
    for (let u = m - 1; u >= 0; u--) {
      let d = EDT_f(u, s[q], g[s[q] + y * m]);

      d = Math.floor(Math.sqrt(d));
      dt[u + y * m] = d;
      if (u == t[q]) q--;
    }
  }
  return dt;
}

function dist_transform_voro(b, c, m, n) {
  // Meijster distance
  // adapted from https://github.com/parmanoir/Meijster-distance
  function EDT_f(x, i, g_i) {
    return (x - i) * (x - i) + g_i * g_i;
  }
  function EDT_Sep(i, u, g_i, g_u) {
    return Math.floor((u * u - i * i + g_u * g_u - g_i * g_i) / (2 * (u - i)));
  }
  // First phase
  let infinity = m + n;
  let g = new Array(m * n).fill(0).map((_) => [0, 0]);
  for (let x = 0; x < m; x++) {
    if (b[x + 0 * m]) {
      g[x + 0 * m] = [0, c[x]];
    } else {
      g[x + 0 * m] = [infinity, 0];
    }
    // Scan 1
    for (let y = 1; y < n; y++) {
      if (b[x + y * m]) {
        g[x + y * m] = [0, c[x + y * m]];
      } else {
        g[x + y * m] = [1 + g[x + (y - 1) * m][0], g[x + (y - 1) * m][1]];
      }
    }
    // Scan 2
    for (let y = n - 2; y >= 0; y--) {
      if (g[x + (y + 1) * m][0] < g[x + y * m][0]) {
        g[x + y * m] = [1 + g[x + (y + 1) * m][0], g[x + (y + 1) * m][1]];
      }
    }
  }

  // Second phase
  let dt = new Array(m * n).fill(0).map((_) => [0, 0]);
  let s = new Array(m).fill(0);
  let t = new Array(m).fill(0);
  let q = 0;
  let w;
  for (let y = 0; y < n; y++) {
    q = 0;
    s[0] = 0;
    t[0] = 0;

    // Scan 3
    for (let u = 1; u < m; u++) {
      while (
        q >= 0 &&
        EDT_f(t[q], s[q], g[s[q] + y * m][0]) > EDT_f(t[q], u, g[u + y * m][0])
      ) {
        q--;
      }
      if (q < 0) {
        q = 0;
        s[0] = u;
      } else {
        w = 1 + EDT_Sep(s[q], u, g[s[q] + y * m][0], g[u + y * m][0]);
        if (w < m) {
          q++;
          s[q] = u;
          t[q] = w;
        }
      }
    }
    // Scan 4
    for (let u = m - 1; u >= 0; u--) {
      let d = EDT_f(u, s[q], g[s[q] + y * m][0]);

      d = Math.floor(Math.sqrt(d));
      dt[u + y * m] = [d, g[s[q] + y * m][1]];
      if (u == t[q]) q--;
    }
  }
  return dt;
}

function draw_canvas(polys, colors, diams, w, h, scale) {
  const operations = [];

  // First pass: draw the colored paths
  for (let i = 0; i < polys.length; i++) {
    const pathOps = {
      type: "path",
      color: colors[i],
      strokeWidth: diams[i],
      points: [],
    };

    for (let j = 0; j < polys[i].length; j++) {
      let [x, y] = polys[i][j];
      x += (cfg.offset_x_in * 25.4) / px_to_mm;
      y = h - y + (cfg.offset_y_in * 25.4) / px_to_mm;
      pathOps.points.push([x * scale, y * scale]);
    }

    operations.push(pathOps);
  }

  // Second pass: draw the black outlines
  for (let i = 0; i < polys.length; i++) {
    const pathOps = {
      type: "path",
      color: "black",
      strokeWidth: 2,
      points: [],
    };

    for (let j = 0; j < polys[i].length; j++) {
      let [x, y] = polys[i][j];
      x += (cfg.offset_x_in * 25.4) / px_to_mm;
      y = h - y + (cfg.offset_y_in * 25.4) / px_to_mm;
      pathOps.points.push([x * scale, y * scale]);
    }

    operations.push(pathOps);
  }

  return operations;
}

function draw_svg(polys, colors, diams, w, h, scale) {
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${
    w * scale
  }" height="${h * scale}">`;
  for (let i = 0; i < polys.length; i++) {
    o += `<path stroke="${colors[i]}" stroke-width="${diams[i]}" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M `;
    for (let j = 0; j < polys[i].length; j++) {
      let [x, y] = polys[i][j];
      o += `${~~(x * scale * 1000) / 1000} ${~~(y * scale * 1000) / 1000} `;
    }
    o += `" />\n`;
  }
  for (let i = 0; i < polys.length; i++) {
    o += `<path stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M `;
    for (let j = 0; j < polys[i].length; j++) {
      let [x, y] = polys[i][j];
      o += `${~~(x * scale * 1000) / 1000} ${~~(y * scale * 1000) / 1000} `;
    }
    o += `" />\n`;
  }
  o += `</svg>`;
  return o;
}

function poly_area(poly) {
  var n = poly.length;
  var a = 0.0;
  for (var p = n - 1, q = 0; q < n; p = q++) {
    a += poly[p][0] * poly[q][1] - poly[q][0] * poly[p][1];
  }
  return a * 0.5;
}

function floodblob(im0, x0, y0, val) {
  let Q = [];
  Q.push([x0, y0]);
  im0[y0 * W + x0] = val;
  while (Q.length) {
    let [x, y] = Q.pop();
    if (x > 0 && im0[y * W + (x - 1)] == 255) {
      im0[y * W + (x - 1)] = val;
      Q.push([x - 1, y]);
    }
    if (x < W - 1 && im0[y * W + (x + 1)] == 255) {
      im0[y * W + (x + 1)] = val;
      Q.push([x + 1, y]);
    }
    if (y > 0 && im0[(y - 1) * W + x] == 255) {
      im0[(y - 1) * W + x] = val;
      Q.push([x, y - 1]);
    }
    if (y < H - 1 && im0[(y + 1) * W + x] == 255) {
      im0[(y + 1) * W + x] = val;
      Q.push([x, y + 1]);
    }
  }
}

let _spiral_cache = [];
function spiral(n) {
  // https://math.stackexchange.com/a/2639611

  let _n = n;
  let u;
  if ((u = _spiral_cache[_n])) return u;

  function and_cache(x, y) {
    let v = [x, y];
    _spiral_cache[_n] = v;
    return v;
  }

  n += 1;
  let k = ~~Math.ceil((Math.sqrt(n) - 1.0) / 2.0);
  let t = 2 * k + 1;
  let m = t * t;
  t -= 1;
  if (n >= m - t) {
    return and_cache(k - (m - n), -k);
  } else {
    m -= t;
  }
  if (n >= m - t) {
    return and_cache(-k, -k + (m - n));
  } else {
    m -= t;
  }
  if (n >= m - t) {
    return and_cache(-k + (m - n), k);
  } else {
    return and_cache(k, k - (m - n - t));
  }
}

function colorize(im) {
  let im1 = im.slice();
  let k = 1;
  for (let i = 0; i < H; i++) {
    for (let j = 0; j < W; j++) {
      if (im1[i * W + j] == 255) {
        floodblob(im1, j, i, k++);
      }
    }
  }
  let im2 = dist_transform_voro(im, im1, W, H);
  return [k, im2.map((x) => x[1])];
}

export function pngToRML(im0, W0, H0, im1, W1, H1) {
  im0 = im0.filter((_, i) => i % 4 == 0).map((x) => (x > cfg.thresh ? 255 : 0));

  im1 = im1.filter((_, i) => i % 4 == 0).map((x) => (x > cfg.thresh ? 255 : 0));
  console.assert(W0 == W1 && H0 == H1);
  let [W, H] = [W0, H0];

  let polys0 = [];
  let polys1 = [];

  if (cfg.voro_mode) {
    let [k, imv] = colorize(im0);
    for (let i = 1; i < k; i++) {
      let bim = imv.map((x) => (x == i ? 1 : 0));
      FindContours.findContours(bim, W, H)
        .map((x) => FindContours.approxPolyDP(x.points, cfg.epsilon))
        .forEach((x) => polys0.push(x));
    }
  } else {
    let dt0 = dist_transform(im0, W, H);

    let imc = dt0.map((x, i) =>
      Math.max(x <= tool0_d_px * cfg.trc_stepover ? 255 : 0, 255 - im1[i]),
    );

    let dt1 = dist_transform(imc, W, H);

    let bim0 = dt0.map((x) => (x <= tool0_d_px / 2 ? 1 : 0));

    polys0 = FindContours.findContours(bim0, W, H).map((x) =>
      FindContours.approxPolyDP(x.points, cfg.epsilon),
    );

    for (let i = 0; i < cfg.clr_iters; i++) {
      let bim = dt1.map((x) =>
        x <= tool1_d_px / 2 + tool1_d_px * i * cfg.clr_stepover ? 0 : 1,
      );
      FindContours.findContours(bim, W, H)
        .map((x) => FindContours.approxPolyDP(x.points, cfg.epsilon))
        .forEach((x) => polys1.push(x));
    }
  }

  let dt2 = dist_transform(im1, W, H);
  let bim2 = dt2.map((x) => (x <= tool1_d_px / 2 ? 1 : 0));
  let polys2 = FindContours.findContours(bim2, W, H).map((x) =>
    FindContours.approxPolyDP(x.points, cfg.epsilon),
  );

  polys2.sort((a, b) => Math.abs(poly_area(a)) - Math.abs(poly_area(b)));
  // polys2 = [];

  if (cfg.trc_roi) {
    let roi = cfg.trc_roi; //{x:3000,y:1000,w:2000,h:2000};
    let polysc = [[]];
    for (let i = 0; i < polys0.length; i++) {
      polysc.push([]);
      for (let j = 0; j < polys0[i].length; j++) {
        let [x, y] = polys0[i][j];
        if (x > roi.x && x < roi.x + roi.w && y > roi.y && y < roi.y + roi.h) {
          polysc.at(-1).push([x, y]);
        } else {
          polysc.push([]);
        }
      }
    }
    polys0 = polysc.filter((x) => x.length);
  }

  let svg = draw_svg(
    polys0.concat(polys1).concat(polys2),
    new Array(polys0.length)
      .fill("blue")
      .concat(new Array(polys1.length).fill("red"))
      .concat(new Array(polys2.length).fill("green")),
    new Array(polys0.length)
      .fill(tool0_d_px)
      .concat(new Array(polys1.length).fill(tool1_d_px))
      .concat(new Array(polys2.length).fill(tool1_d_px)),
    W,
    H,
    1,
  );

  let canvasOps = draw_canvas(
    polys0.concat(polys1).concat(polys2),
    new Array(polys0.length)
      .fill("blue")
      .concat(new Array(polys1.length).fill("red"))
      .concat(new Array(polys2.length).fill("green")),
    new Array(polys0.length)
      .fill(tool0_d_px)
      .concat(new Array(polys1.length).fill(tool1_d_px))
      .concat(new Array(polys2.length).fill(tool1_d_px)),
    W,
    H,
    1,
  );

  function plot_polys(polys, zs) {
    let o = ``;
    for (let i = 0; i < polys.length; i++) {
      for (let k = 0; k < zs.length; k++) {
        let z = zs[k];
        for (let j = 0; j < polys[i].length; j++) {
          let [x, y] = polys[i][j];
          let fx = x / W;
          let fy = y / H;
          let fu = cfg.dz_ul_in * (1 - fx) + cfg.dz_ur_in * fx;
          let fl = cfg.dz_ll_in * (1 - fx) + cfg.dz_lr_in * fx;
          let ff = fu * (1 - fy) + fl * fy;
          let zz = -Math.round(z + ff * in_to_unit);
          x = Math.round(cfg.offset_x_in * in_to_unit + x * px_to_unit);
          y = Math.round(cfg.offset_y_in * in_to_unit + (H - y) * px_to_unit);
          // if (i == 0 && j == 0 && k == 0){
          //   o += `Z${x},${y},${zz+5000};\n`;
          // }
          if (j == 0 && k == 0) {
            o += `PU${x},${y};\n`;
          }
          o += `Z${x},${y},${zz};\n`;
          if (k == zs.length - 1 && j == polys[i].length - 1) {
            o += `PU${x},${y};\n`;
          }
        }
      }
    }
    return o;
  }

  let rml0 =
    `PA;PA;VS4;!VZ4;!PZ0,${-cfg.zero_z_in * in_to_unit + 160};!MC1;\n` +
    plot_polys(polys0, [(cfg.zero_z_in + cfg.trc_depth_in) * in_to_unit]) +
    `PA;PA;!PZ0,${-cfg.zero_z_in * in_to_unit + 160};PU0,0;!MC0;`;

  let rml1 =
    `PA;PA;VS4;!VZ4;!PZ0,${-cfg.zero_z_in * in_to_unit + 160};!MC1;\n` +
    plot_polys(polys1, [(cfg.zero_z_in + cfg.trc_depth_in) * in_to_unit]);

  let zs = [];
  for (let i = 0; i < cfg.otl_iters; i++) {
    zs.push(
      (cfg.zero_z_in + (cfg.otl_depth_in / cfg.otl_iters) * (i + 1)) *
        in_to_unit,
    );
  }
  rml1 += plot_polys(polys2, zs);
  rml1 += `PA;PA;!PZ0,${-cfg.zero_z_in * in_to_unit + 160};PU0,0;!MC0;`;

  // function square(x, y, r) {
  //   return [
  //     [x - r, y - r],
  //     [x + r, y - r],
  //     [x + r, y + r],
  //     [x - r, y + r],
  //   ];
  // }

  // let polysx = [
  //   square(0, 0, 10 / px_to_unit),
  //   square(W, 0, 10 / px_to_unit),
  //   square(W, H, 10 / px_to_unit),
  //   square(0, H, 10 / px_to_unit),
  // ];

  // let rmlx =
  //   `PA;PA;VS4;!VZ4;!PZ0,${cfg.zero_z_in+160};!MC1;\n` +
  //   plot_polys(polysx, [(cfg.zero_z_in + cfg.trc_depth_in) * in_to_unit]) +
  //   `PA;PA;!PZ0,${cfg.zero_z_in+160};PU0,0;!MC0;`;

  // fs.writeFileSync(
  //   "receipts/" + new Date() + ".json",
  //   JSON.stringify(Object.assign({ basepath: basepth }, cfg), null, 2),
  // );

  // fs.writeFileSync("test.svg", svg);

  // fs.writeFileSync(basepth + ".tool0.rml", rml0);
  // fs.writeFileSync(basepth + ".tool1.rml", rml1);
  // fs.writeFileSync(basepth + ".toolx.rml", rmlx);

  return { svg, rml0, rml1, canvasOps, pxToMM: px_to_mm };
  // dist_transform();
}
