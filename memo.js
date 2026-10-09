// memo.js — Old Pochmann memo generator for 3x3 scrambles (pure JS, no dependencies)
// Speffz lettering. Edge buffer: UR (letter B). Corner buffer: ULB (letter A).
//
// Usage:
//   import { opMemo } from "./memo.js";
//   const m = opMemo("R U2 F' L D ...");
//   m.edges    -> ["B", "M", "K", ...]   edge targets in order
//   m.corners  -> ["C", "J", ...]        corner targets in order
//   m.parity   -> true if odd number of edge targets
//   m.text     -> { edges: "BM KD T", corners: "CJ LW" }   letter pairs

// ---------- 1. Sticker model of the cube ----------
// Each sticker is a position (x,y,z in -1..1) plus the face it points at.
const FACE_NORMAL = {
  U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
};

// Turnable layers: [axis normal, which layer coordinate gets turned]
const LAYERS = {
  U: [FACE_NORMAL.U, 1], D: [FACE_NORMAL.D, 1], R: [FACE_NORMAL.R, 1],
  L: [FACE_NORMAL.L, 1], F: [FACE_NORMAL.F, 1], B: [FACE_NORMAL.B, 1],
  M: [FACE_NORMAL.L, 0], E: [FACE_NORMAL.D, 0], S: [FACE_NORMAL.F, 0], // slices turn like L, D, F
};

const key = (p, n) => p.join(",") + "|" + n.join(",");
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Rotate vector v a quarter turn clockwise when looking at the face with normal n
const rot = (v, n) => { const c = cross(n, v), d = dot(n, v); return v.map((_, i) => -c[i] + n[i] * d); };

// All 54 stickers: list of { p, n }
const STICKERS = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
  const p = [x, y, z];
  for (const n of Object.values(FACE_NORMAL)) if (dot(p, n) === 1) STICKERS.push({ p, n });
}
const INDEX = new Map(STICKERS.map((s, i) => [key(s.p, s.n), i]));

// For each layer, a permutation: perm[i] = where sticker location i moves to
const PERMS = {};
for (const [name, [axis, layer]] of Object.entries(LAYERS)) {
  PERMS[name] = STICKERS.map((s, i) =>
    dot(s.p, axis) === layer ? INDEX.get(key(rot(s.p, axis), rot(s.n, axis))) : i);
}

// A state is an array: state[location] = home location of the sticker sitting there
const solvedState = () => STICKERS.map((_, i) => i);

function applyAlg(state, alg) {
  let s = state.slice();
  for (const t of alg.trim().split(/\s+/).filter(Boolean)) {
    const perm = PERMS[t[0]];
    if (!perm) throw new Error("Unknown move: " + t);
    const times = t.includes("2") ? 2 : t.includes("'") ? 3 : 1;
    for (let k = 0; k < times; k++) {
      const next = new Array(54);
      for (let i = 0; i < 54; i++) next[perm[i]] = s[i];
      s = next;
    }
  }
  return s;
}

// ---------- 2. Speffz letters ----------
// Piece positions written as the faces it touches; the first face is the sticker being lettered.
const sticker = (faces) => {
  const p = [0, 0, 0];
  for (const f of faces) FACE_NORMAL[f].forEach((v, i) => { if (v) p[i] = v; });
  return INDEX.get(key(p, FACE_NORMAL[faces[0]]));
};

const EDGE_LETTERS = {
  A: "UB", B: "UR", C: "UF", D: "UL",
  E: "LU", F: "LF", G: "LD", H: "LB",
  I: "FU", J: "FR", K: "FD", L: "FL",
  M: "RU", N: "RB", O: "RD", P: "RF",
  Q: "BU", R: "BL", S: "BD", T: "BR",
  U: "DF", V: "DR", W: "DB", X: "DL",
};
const CORNER_LETTERS = {
  A: "UBL", B: "UBR", C: "UFR", D: "UFL",
  E: "LUB", F: "LUF", G: "LDF", H: "LDB",
  I: "FUL", J: "FUR", K: "FDR", L: "FDL",
  M: "RUF", N: "RUB", O: "RDB", P: "RDF",
  Q: "BUR", R: "BUL", S: "BDL", T: "BDR",
  U: "DFL", V: "DFR", W: "DBR", X: "DBL",
};

function buildPieces(table) {
  const loc = {}, letterAt = {};
  for (const [letter, faces] of Object.entries(table)) {
    loc[letter] = sticker(faces.split(""));
    letterAt[loc[letter]] = letter;
  }
  // Group letters into pieces: stickers sharing the same position
  const pieceOf = {}, pieces = [];
  for (const letter of Object.keys(table)) {
    const pos = STICKERS[loc[letter]].p.join(",");
    let piece = pieces.find((pc) => pc.pos === pos);
    if (!piece) { piece = { pos, letters: [] }; pieces.push(piece); }
    piece.letters.push(letter);
    pieceOf[letter] = piece;
  }
  // Put each corner's stickers in one consistent (clockwise) order, so twists are tracked correctly
  for (const pc of pieces) {
    if (pc.letters.length !== 3) continue;
    const pos = pc.pos.split(",").map(Number);
    const [a, ...rest] = pc.letters;
    const na = STICKERS[loc[a]].n;
    const next = rest.find((l) => dot(cross(na, STICKERS[loc[l]].n), pos) > 0);
    pc.letters = [a, next, rest.find((l) => l !== next)];
  }
  return { loc, letterAt, pieceOf, pieces };
}
const EDGES = buildPieces(EDGE_LETTERS);
const CORNERS = buildPieces(CORNER_LETTERS);

// ---------- 3. Tracing ----------
// Simulates Old Pochmann exactly: look at the buffer sticker, shoot it to where it belongs,
// swap pieces, repeat. Cycle breaks and flipped/twisted pieces fall out naturally.
function trace(state, P, bufferLetter, breakFirst = []) {
  const s = state.slice();
  const bufPiece = P.pieceOf[bufferLetter];
  const homeLetter = (letter) => P.letterAt[s[P.loc[letter]]];  // which sticker sits at this letter's spot
  const pieceSolved = (pc) => pc.letters.every((l) => homeLetter(l) === l);

  // Swap the buffer piece with the piece at `target`, so that the buffer sticker lands on `target`
  function swap(target) {
    const tPiece = P.pieceOf[target];
    const n = bufPiece.letters.length;
    const bi = bufPiece.letters.indexOf(bufferLetter);
    const ti = tPiece.letters.indexOf(target);
    // stickers are listed in cyclic order, so pair them up by offset from the shot sticker
    const pairs = [];
    for (let k = 0; k < n; k++) {
      pairs.push([P.loc[bufPiece.letters[(bi + k) % n]], P.loc[tPiece.letters[(ti + k) % n]]]);
    }
    for (const [a, b] of pairs) [s[a], s[b]] = [s[b], s[a]];
  }

  const memo = [];
  for (let guard = 0; guard < 100; guard++) {
    const inBuffer = homeLetter(bufferLetter);
    let target;
    if (P.pieceOf[inBuffer] !== bufPiece) {
      target = inBuffer;                      // normal shot
    } else {
      // Cycle break: try the preferred letters first (e.g. D), then any unsolved piece
      const preferred = breakFirst.find((l) => P.pieceOf[l] !== bufPiece && !pieceSolved(P.pieceOf[l]));
      if (preferred) {
        target = preferred;
      } else {
        const unsolved = P.pieces.find((pc) => pc !== bufPiece && !pieceSolved(pc));
        if (!unsolved) break;                 // everything except possibly the buffer is solved
        target = unsolved.letters[0];
      }
    }
    memo.push(target);
    swap(target);
  }
  return memo;
}

const pairs = (letters) => letters.join("").replace(/(..)/g, "$1 ").trim();

const T_PERM = "R U R' U' R' F R2 U' R' U' R U R' F'";

export function opMemo(scramble) {
  if (typeof scramble !== "string") {
    throw new Error("opMemo needs the scramble as a string, but got: " + scramble);
  }
  const state = applyAlg(solvedState(), scramble);
  const edges = trace(state, EDGES, "B", ["D"]);   // edge cycle breaks go to D (UL) first
  const parity = edges.length % 2 === 1;

  // An odd number of T-perms leaves the UFR and UBR corners swapped. With parity, trace the
  // corners as they are AFTER the edges are done (UFR/UBR swapped) — then corners solve
  // normally and no extra parity algorithm is needed. Edges are unaffected for corner tracing.
  const cornerState = parity ? applyAlg(state, T_PERM) : state;
  const corners = trace(cornerState, CORNERS, "A", ["P"]);   // corner cycle breaks go to P (RDF) first

  return {
    edges,
    corners,
    parity,
    text: { edges: pairs(edges), corners: pairs(corners) },
  };
}

// Exposed for testing / extending (e.g. drawing the cube, setup-move finders)
export const _internal = { applyAlg, solvedState, EDGES, CORNERS, STICKERS, PERMS };