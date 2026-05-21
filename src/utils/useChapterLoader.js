/**
 * useChapterLoader
 *
 * Dynamically imports chapter JSON files by stage_index. Keeps only the
 * current chapter in memory. Exposes helpers to advance to the next chapter.
 *
 * Chapter files must:
 *  - Live in src/data/verses/
 *  - Follow the naming pattern: <book>-<chapter>.json  (e.g. genesis-1.json)
 *  - Contain a top-level "stage_index" integer (1-based, sequential)
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Static chapter registry ─────────────────────────────────────────────────
// All chapters in canonical order, keyed by stage_index.
// Auto-generated from src/data/verses/*.json — do not edit manually.
export const CHAPTER_REGISTRY = [
  { stageIndex: 1, id: 'genesis-1', book: 'Genesis', chapter: 1, totalVerses: 31, firstWordOrder: 1, lastWordOrder: 434 },
  { stageIndex: 2, id: 'genesis-2', book: 'Genesis', chapter: 2, totalVerses: 25, firstWordOrder: 435, lastWordOrder: 762 },
  { stageIndex: 3, id: 'genesis-3', book: 'Genesis', chapter: 3, totalVerses: 24, firstWordOrder: 763, lastWordOrder: 1109 },
  { stageIndex: 4, id: 'genesis-4', book: 'Genesis', chapter: 4, totalVerses: 26, firstWordOrder: 1110, lastWordOrder: 1450 },
  { stageIndex: 5, id: 'genesis-5', book: 'Genesis', chapter: 5, totalVerses: 32, firstWordOrder: 1451, lastWordOrder: 1815 },
  { stageIndex: 6, id: 'genesis-6', book: 'Genesis', chapter: 6, totalVerses: 22, firstWordOrder: 1816, lastWordOrder: 2120 },
  { stageIndex: 7, id: 'genesis-7', book: 'Genesis', chapter: 7, totalVerses: 24, firstWordOrder: 2121, lastWordOrder: 2452 },
  { stageIndex: 8, id: 'genesis-8', book: 'Genesis', chapter: 8, totalVerses: 22, firstWordOrder: 2453, lastWordOrder: 2761 },
  { stageIndex: 9, id: 'genesis-9', book: 'Genesis', chapter: 9, totalVerses: 29, firstWordOrder: 2762, lastWordOrder: 3114 },
  { stageIndex: 10, id: 'genesis-10', book: 'Genesis', chapter: 10, totalVerses: 32, firstWordOrder: 3115, lastWordOrder: 3401 },
  { stageIndex: 11, id: 'genesis-11', book: 'Genesis', chapter: 11, totalVerses: 32, firstWordOrder: 3402, lastWordOrder: 3793 },
  { stageIndex: 12, id: 'genesis-12', book: 'Genesis', chapter: 12, totalVerses: 20, firstWordOrder: 3794, lastWordOrder: 4061 },
  { stageIndex: 13, id: 'genesis-13', book: 'Genesis', chapter: 13, totalVerses: 18, firstWordOrder: 4062, lastWordOrder: 4303 },
  { stageIndex: 14, id: 'genesis-14', book: 'Genesis', chapter: 14, totalVerses: 24, firstWordOrder: 4304, lastWordOrder: 4646 },
  { stageIndex: 15, id: 'genesis-15', book: 'Genesis', chapter: 15, totalVerses: 21, firstWordOrder: 4647, lastWordOrder: 4904 },
  { stageIndex: 16, id: 'genesis-16', book: 'Genesis', chapter: 16, totalVerses: 16, firstWordOrder: 4905, lastWordOrder: 5127 },
  { stageIndex: 17, id: 'genesis-17', book: 'Genesis', chapter: 17, totalVerses: 27, firstWordOrder: 5128, lastWordOrder: 5482 },
  { stageIndex: 18, id: 'genesis-18', book: 'Genesis', chapter: 18, totalVerses: 33, firstWordOrder: 5483, lastWordOrder: 5919 },
  { stageIndex: 19, id: 'genesis-19', book: 'Genesis', chapter: 19, totalVerses: 38, firstWordOrder: 5920, lastWordOrder: 6482 },
  { stageIndex: 20, id: 'genesis-20', book: 'Genesis', chapter: 20, totalVerses: 18, firstWordOrder: 6483, lastWordOrder: 6764 },
  { stageIndex: 21, id: 'genesis-21', book: 'Genesis', chapter: 21, totalVerses: 34, firstWordOrder: 6765, lastWordOrder: 7200 },
  { stageIndex: 22, id: 'genesis-22', book: 'Genesis', chapter: 22, totalVerses: 24, firstWordOrder: 7201, lastWordOrder: 7567 },
  { stageIndex: 23, id: 'genesis-23', book: 'Genesis', chapter: 23, totalVerses: 20, firstWordOrder: 7568, lastWordOrder: 7842 },
  { stageIndex: 24, id: 'genesis-24', book: 'Genesis', chapter: 24, totalVerses: 67, firstWordOrder: 7843, lastWordOrder: 8761 },
  { stageIndex: 25, id: 'genesis-25', book: 'Genesis', chapter: 25, totalVerses: 34, firstWordOrder: 8762, lastWordOrder: 9167 },
  { stageIndex: 26, id: 'genesis-26', book: 'Genesis', chapter: 26, totalVerses: 35, firstWordOrder: 9168, lastWordOrder: 9633 },
  { stageIndex: 27, id: 'genesis-27', book: 'Genesis', chapter: 27, totalVerses: 46, firstWordOrder: 9634, lastWordOrder: 10273 },
  { stageIndex: 28, id: 'genesis-28', book: 'Genesis', chapter: 28, totalVerses: 22, firstWordOrder: 10274, lastWordOrder: 10596 },
  { stageIndex: 29, id: 'genesis-29', book: 'Genesis', chapter: 29, totalVerses: 35, firstWordOrder: 10597, lastWordOrder: 11067 },
  { stageIndex: 30, id: 'genesis-30', book: 'Genesis', chapter: 30, totalVerses: 43, firstWordOrder: 11068, lastWordOrder: 11629 },
  { stageIndex: 31, id: 'genesis-31', book: 'Genesis', chapter: 31, totalVerses: 54, firstWordOrder: 11630, lastWordOrder: 12397 },
  { stageIndex: 32, id: 'genesis-32', book: 'Genesis', chapter: 32, totalVerses: 33, firstWordOrder: 12398, lastWordOrder: 12850 },
  { stageIndex: 33, id: 'genesis-33', book: 'Genesis', chapter: 33, totalVerses: 20, firstWordOrder: 12851, lastWordOrder: 13118 },
  { stageIndex: 34, id: 'genesis-34', book: 'Genesis', chapter: 34, totalVerses: 31, firstWordOrder: 13119, lastWordOrder: 13539 },
  { stageIndex: 35, id: 'genesis-35', book: 'Genesis', chapter: 35, totalVerses: 29, firstWordOrder: 13540, lastWordOrder: 13917 },
  { stageIndex: 36, id: 'genesis-36', book: 'Genesis', chapter: 36, totalVerses: 43, firstWordOrder: 13918, lastWordOrder: 14406 },
  { stageIndex: 37, id: 'genesis-37', book: 'Genesis', chapter: 37, totalVerses: 36, firstWordOrder: 14407, lastWordOrder: 14900 },
  { stageIndex: 38, id: 'genesis-38', book: 'Genesis', chapter: 38, totalVerses: 30, firstWordOrder: 14901, lastWordOrder: 15305 },
  { stageIndex: 39, id: 'genesis-39', book: 'Genesis', chapter: 39, totalVerses: 23, firstWordOrder: 15306, lastWordOrder: 15653 },
  { stageIndex: 40, id: 'genesis-40', book: 'Genesis', chapter: 40, totalVerses: 23, firstWordOrder: 15654, lastWordOrder: 15965 },
  { stageIndex: 41, id: 'genesis-41', book: 'Genesis', chapter: 41, totalVerses: 57, firstWordOrder: 15966, lastWordOrder: 16741 },
  { stageIndex: 42, id: 'genesis-42', book: 'Genesis', chapter: 42, totalVerses: 38, firstWordOrder: 16742, lastWordOrder: 17269 },
  { stageIndex: 43, id: 'genesis-43', book: 'Genesis', chapter: 43, totalVerses: 34, firstWordOrder: 17270, lastWordOrder: 17755 },
  { stageIndex: 44, id: 'genesis-44', book: 'Genesis', chapter: 44, totalVerses: 34, firstWordOrder: 17756, lastWordOrder: 18210 },
  { stageIndex: 45, id: 'genesis-45', book: 'Genesis', chapter: 45, totalVerses: 28, firstWordOrder: 18211, lastWordOrder: 18607 },
  { stageIndex: 46, id: 'genesis-46', book: 'Genesis', chapter: 46, totalVerses: 34, firstWordOrder: 18608, lastWordOrder: 19021 },
  { stageIndex: 47, id: 'genesis-47', book: 'Genesis', chapter: 47, totalVerses: 31, firstWordOrder: 19022, lastWordOrder: 19533 },
  { stageIndex: 48, id: 'genesis-48', book: 'Genesis', chapter: 48, totalVerses: 22, firstWordOrder: 19534, lastWordOrder: 19883 },
  { stageIndex: 49, id: 'genesis-49', book: 'Genesis', chapter: 49, totalVerses: 33, firstWordOrder: 19884, lastWordOrder: 20254 },
  { stageIndex: 50, id: 'genesis-50', book: 'Genesis', chapter: 50, totalVerses: 26, firstWordOrder: 20255, lastWordOrder: 20629 },
  { stageIndex: 51, id: 'exodus-1', book: 'Exodus', chapter: 1, totalVerses: 22, firstWordOrder: 20630, lastWordOrder: 20869 },
  { stageIndex: 52, id: 'exodus-2', book: 'Exodus', chapter: 2, totalVerses: 25, firstWordOrder: 20870, lastWordOrder: 21209 },
  { stageIndex: 53, id: 'exodus-3', book: 'Exodus', chapter: 3, totalVerses: 22, firstWordOrder: 21210, lastWordOrder: 21604 },
  { stageIndex: 54, id: 'exodus-4', book: 'Exodus', chapter: 4, totalVerses: 31, firstWordOrder: 21605, lastWordOrder: 22059 },
  { stageIndex: 55, id: 'exodus-5', book: 'Exodus', chapter: 5, totalVerses: 23, firstWordOrder: 22060, lastWordOrder: 22377 },
  { stageIndex: 56, id: 'exodus-6', book: 'Exodus', chapter: 6, totalVerses: 30, firstWordOrder: 22378, lastWordOrder: 22781 },
  { stageIndex: 57, id: 'exodus-7', book: 'Exodus', chapter: 7, totalVerses: 29, firstWordOrder: 22782, lastWordOrder: 23199 },
  { stageIndex: 58, id: 'exodus-8', book: 'Exodus', chapter: 8, totalVerses: 28, firstWordOrder: 23200, lastWordOrder: 23621 },
  { stageIndex: 59, id: 'exodus-9', book: 'Exodus', chapter: 9, totalVerses: 35, firstWordOrder: 23622, lastWordOrder: 24142 },
  { stageIndex: 60, id: 'exodus-10', book: 'Exodus', chapter: 10, totalVerses: 29, firstWordOrder: 24143, lastWordOrder: 24639 },
  { stageIndex: 61, id: 'exodus-11', book: 'Exodus', chapter: 11, totalVerses: 10, firstWordOrder: 24640, lastWordOrder: 24813 },
  { stageIndex: 62, id: 'exodus-12', book: 'Exodus', chapter: 12, totalVerses: 51, firstWordOrder: 24814, lastWordOrder: 25564 },
  { stageIndex: 63, id: 'exodus-13', book: 'Exodus', chapter: 13, totalVerses: 22, firstWordOrder: 25565, lastWordOrder: 25889 },
  { stageIndex: 64, id: 'exodus-14', book: 'Exodus', chapter: 14, totalVerses: 31, firstWordOrder: 25890, lastWordOrder: 26363 },
  { stageIndex: 65, id: 'exodus-15', book: 'Exodus', chapter: 15, totalVerses: 27, firstWordOrder: 26364, lastWordOrder: 26684 },
  { stageIndex: 66, id: 'exodus-16', book: 'Exodus', chapter: 16, totalVerses: 36, firstWordOrder: 26685, lastWordOrder: 27234 },
  { stageIndex: 67, id: 'exodus-17', book: 'Exodus', chapter: 17, totalVerses: 16, firstWordOrder: 27235, lastWordOrder: 27480 },
  { stageIndex: 68, id: 'exodus-18', book: 'Exodus', chapter: 18, totalVerses: 27, firstWordOrder: 27481, lastWordOrder: 27898 },
  { stageIndex: 69, id: 'exodus-19', book: 'Exodus', chapter: 19, totalVerses: 25, firstWordOrder: 27899, lastWordOrder: 28273 },
  { stageIndex: 70, id: 'exodus-20', book: 'Exodus', chapter: 20, totalVerses: 26, firstWordOrder: 28274, lastWordOrder: 28585 },
  { stageIndex: 71, id: 'exodus-21', book: 'Exodus', chapter: 21, totalVerses: 37, firstWordOrder: 28586, lastWordOrder: 29037 },
  { stageIndex: 72, id: 'exodus-22', book: 'Exodus', chapter: 22, totalVerses: 30, firstWordOrder: 29038, lastWordOrder: 29400 },
  { stageIndex: 73, id: 'exodus-23', book: 'Exodus', chapter: 23, totalVerses: 33, firstWordOrder: 29401, lastWordOrder: 29798 },
  { stageIndex: 74, id: 'exodus-24', book: 'Exodus', chapter: 24, totalVerses: 18, firstWordOrder: 29799, lastWordOrder: 30050 },
  { stageIndex: 75, id: 'exodus-25', book: 'Exodus', chapter: 25, totalVerses: 40, firstWordOrder: 30051, lastWordOrder: 30490 },
  { stageIndex: 76, id: 'exodus-26', book: 'Exodus', chapter: 26, totalVerses: 37, firstWordOrder: 30491, lastWordOrder: 30970 },
  { stageIndex: 77, id: 'exodus-27', book: 'Exodus', chapter: 27, totalVerses: 21, firstWordOrder: 30971, lastWordOrder: 31233 },
  { stageIndex: 78, id: 'exodus-28', book: 'Exodus', chapter: 28, totalVerses: 43, firstWordOrder: 31234, lastWordOrder: 31829 },
  { stageIndex: 79, id: 'exodus-29', book: 'Exodus', chapter: 29, totalVerses: 46, firstWordOrder: 31830, lastWordOrder: 32478 },
  { stageIndex: 80, id: 'exodus-30', book: 'Exodus', chapter: 30, totalVerses: 38, firstWordOrder: 32479, lastWordOrder: 32946 },
  { stageIndex: 81, id: 'exodus-31', book: 'Exodus', chapter: 31, totalVerses: 18, firstWordOrder: 32947, lastWordOrder: 33175 },
  { stageIndex: 82, id: 'exodus-32', book: 'Exodus', chapter: 32, totalVerses: 35, firstWordOrder: 33176, lastWordOrder: 33720 },
  { stageIndex: 83, id: 'exodus-33', book: 'Exodus', chapter: 33, totalVerses: 23, firstWordOrder: 33721, lastWordOrder: 34074 },
  { stageIndex: 84, id: 'exodus-34', book: 'Exodus', chapter: 34, totalVerses: 35, firstWordOrder: 34075, lastWordOrder: 34612 },
  { stageIndex: 85, id: 'exodus-35', book: 'Exodus', chapter: 35, totalVerses: 35, firstWordOrder: 34613, lastWordOrder: 35052 },
  { stageIndex: 86, id: 'exodus-36', book: 'Exodus', chapter: 36, totalVerses: 38, firstWordOrder: 35053, lastWordOrder: 35566 },
  { stageIndex: 87, id: 'exodus-37', book: 'Exodus', chapter: 37, totalVerses: 29, firstWordOrder: 35567, lastWordOrder: 35933 },
  { stageIndex: 88, id: 'exodus-38', book: 'Exodus', chapter: 38, totalVerses: 31, firstWordOrder: 35934, lastWordOrder: 36345 },
  { stageIndex: 89, id: 'exodus-39', book: 'Exodus', chapter: 39, totalVerses: 43, firstWordOrder: 36346, lastWordOrder: 36915 },
  { stageIndex: 90, id: 'exodus-40', book: 'Exodus', chapter: 40, totalVerses: 38, firstWordOrder: 36916, lastWordOrder: 37355 },
  { stageIndex: 91, id: 'leviticus-1', book: 'Leviticus', chapter: 1, totalVerses: 17, firstWordOrder: 37356, lastWordOrder: 37607 },
  { stageIndex: 92, id: 'leviticus-2', book: 'Leviticus', chapter: 2, totalVerses: 16, firstWordOrder: 37608, lastWordOrder: 37807 },
  { stageIndex: 93, id: 'leviticus-3', book: 'Leviticus', chapter: 3, totalVerses: 17, firstWordOrder: 37808, lastWordOrder: 38056 },
  { stageIndex: 94, id: 'leviticus-4', book: 'Leviticus', chapter: 4, totalVerses: 35, firstWordOrder: 38057, lastWordOrder: 38598 },
  { stageIndex: 95, id: 'leviticus-5', book: 'Leviticus', chapter: 5, totalVerses: 26, firstWordOrder: 38599, lastWordOrder: 39028 },
  { stageIndex: 96, id: 'leviticus-6', book: 'Leviticus', chapter: 6, totalVerses: 23, firstWordOrder: 39029, lastWordOrder: 39331 },
  { stageIndex: 97, id: 'leviticus-7', book: 'Leviticus', chapter: 7, totalVerses: 38, firstWordOrder: 39332, lastWordOrder: 39811 },
  { stageIndex: 98, id: 'leviticus-8', book: 'Leviticus', chapter: 8, totalVerses: 36, firstWordOrder: 39812, lastWordOrder: 40381 },
  { stageIndex: 99, id: 'leviticus-9', book: 'Leviticus', chapter: 9, totalVerses: 24, firstWordOrder: 40382, lastWordOrder: 40700 },
  { stageIndex: 100, id: 'leviticus-10', book: 'Leviticus', chapter: 10, totalVerses: 20, firstWordOrder: 40701, lastWordOrder: 41027 },
  { stageIndex: 101, id: 'leviticus-11', book: 'Leviticus', chapter: 11, totalVerses: 47, firstWordOrder: 41028, lastWordOrder: 41621 },
  { stageIndex: 102, id: 'leviticus-12', book: 'Leviticus', chapter: 12, totalVerses: 8, firstWordOrder: 41622, lastWordOrder: 41738 },
  { stageIndex: 103, id: 'leviticus-13', book: 'Leviticus', chapter: 13, totalVerses: 59, firstWordOrder: 41739, lastWordOrder: 42631 },
  { stageIndex: 104, id: 'leviticus-14', book: 'Leviticus', chapter: 14, totalVerses: 57, firstWordOrder: 42632, lastWordOrder: 43449 },
  { stageIndex: 105, id: 'leviticus-15', book: 'Leviticus', chapter: 15, totalVerses: 33, firstWordOrder: 43450, lastWordOrder: 43905 },
  { stageIndex: 106, id: 'leviticus-16', book: 'Leviticus', chapter: 16, totalVerses: 34, firstWordOrder: 43906, lastWordOrder: 44458 },
  { stageIndex: 107, id: 'leviticus-17', book: 'Leviticus', chapter: 17, totalVerses: 16, firstWordOrder: 44459, lastWordOrder: 44732 },
  { stageIndex: 108, id: 'leviticus-18', book: 'Leviticus', chapter: 18, totalVerses: 30, firstWordOrder: 44733, lastWordOrder: 45076 },
  { stageIndex: 109, id: 'leviticus-19', book: 'Leviticus', chapter: 19, totalVerses: 37, firstWordOrder: 45077, lastWordOrder: 45516 },
  { stageIndex: 110, id: 'leviticus-20', book: 'Leviticus', chapter: 20, totalVerses: 27, firstWordOrder: 45517, lastWordOrder: 45944 },
  { stageIndex: 111, id: 'leviticus-21', book: 'Leviticus', chapter: 21, totalVerses: 24, firstWordOrder: 45945, lastWordOrder: 46250 },
  { stageIndex: 112, id: 'leviticus-22', book: 'Leviticus', chapter: 22, totalVerses: 33, firstWordOrder: 46251, lastWordOrder: 46689 },
  { stageIndex: 113, id: 'leviticus-23', book: 'Leviticus', chapter: 23, totalVerses: 44, firstWordOrder: 46690, lastWordOrder: 47282 },
  { stageIndex: 114, id: 'leviticus-24', book: 'Leviticus', chapter: 24, totalVerses: 23, firstWordOrder: 47283, lastWordOrder: 47559 },
  { stageIndex: 115, id: 'leviticus-25', book: 'Leviticus', chapter: 25, totalVerses: 55, firstWordOrder: 47560, lastWordOrder: 48270 },
  { stageIndex: 116, id: 'leviticus-26', book: 'Leviticus', chapter: 26, totalVerses: 46, firstWordOrder: 48271, lastWordOrder: 48852 },
  { stageIndex: 117, id: 'leviticus-27', book: 'Leviticus', chapter: 27, totalVerses: 34, firstWordOrder: 48853, lastWordOrder: 49310 },
  { stageIndex: 118, id: 'numbers-1', book: 'Numbers', chapter: 1, totalVerses: 54, firstWordOrder: 49311, lastWordOrder: 49899 },
  { stageIndex: 119, id: 'numbers-2', book: 'Numbers', chapter: 2, totalVerses: 34, firstWordOrder: 49900, lastWordOrder: 50240 },
  { stageIndex: 120, id: 'numbers-3', book: 'Numbers', chapter: 3, totalVerses: 51, firstWordOrder: 50241, lastWordOrder: 50839 },
  { stageIndex: 121, id: 'numbers-4', book: 'Numbers', chapter: 4, totalVerses: 49, firstWordOrder: 50840, lastWordOrder: 51507 },
  { stageIndex: 122, id: 'numbers-5', book: 'Numbers', chapter: 5, totalVerses: 31, firstWordOrder: 51508, lastWordOrder: 51969 },
  { stageIndex: 123, id: 'numbers-6', book: 'Numbers', chapter: 6, totalVerses: 27, firstWordOrder: 51970, lastWordOrder: 52329 },
  { stageIndex: 124, id: 'numbers-7', book: 'Numbers', chapter: 7, totalVerses: 89, firstWordOrder: 52330, lastWordOrder: 53401 },
  { stageIndex: 125, id: 'numbers-8', book: 'Numbers', chapter: 8, totalVerses: 26, firstWordOrder: 53402, lastWordOrder: 53762 },
  { stageIndex: 126, id: 'numbers-9', book: 'Numbers', chapter: 9, totalVerses: 23, firstWordOrder: 53763, lastWordOrder: 54116 },
  { stageIndex: 127, id: 'numbers-10', book: 'Numbers', chapter: 10, totalVerses: 36, firstWordOrder: 54117, lastWordOrder: 54498 },
  { stageIndex: 128, id: 'numbers-11', book: 'Numbers', chapter: 11, totalVerses: 35, firstWordOrder: 54499, lastWordOrder: 55047 },
  { stageIndex: 129, id: 'numbers-12', book: 'Numbers', chapter: 12, totalVerses: 16, firstWordOrder: 55048, lastWordOrder: 55244 },
  { stageIndex: 130, id: 'numbers-13', book: 'Numbers', chapter: 13, totalVerses: 33, firstWordOrder: 55245, lastWordOrder: 55638 },
  { stageIndex: 131, id: 'numbers-14', book: 'Numbers', chapter: 14, totalVerses: 45, firstWordOrder: 55639, lastWordOrder: 56274 },
  { stageIndex: 132, id: 'numbers-15', book: 'Numbers', chapter: 15, totalVerses: 41, firstWordOrder: 56275, lastWordOrder: 56785 },
  { stageIndex: 133, id: 'numbers-16', book: 'Numbers', chapter: 16, totalVerses: 35, firstWordOrder: 56786, lastWordOrder: 57279 },
  { stageIndex: 134, id: 'numbers-17', book: 'Numbers', chapter: 17, totalVerses: 28, firstWordOrder: 57280, lastWordOrder: 57674 },
  { stageIndex: 135, id: 'numbers-18', book: 'Numbers', chapter: 18, totalVerses: 32, firstWordOrder: 57675, lastWordOrder: 58195 },
  { stageIndex: 136, id: 'numbers-19', book: 'Numbers', chapter: 19, totalVerses: 22, firstWordOrder: 58196, lastWordOrder: 58541 },
  { stageIndex: 137, id: 'numbers-20', book: 'Numbers', chapter: 20, totalVerses: 29, firstWordOrder: 58542, lastWordOrder: 58959 },
  { stageIndex: 138, id: 'numbers-21', book: 'Numbers', chapter: 21, totalVerses: 35, firstWordOrder: 58960, lastWordOrder: 59432 },
  { stageIndex: 139, id: 'numbers-22', book: 'Numbers', chapter: 22, totalVerses: 41, firstWordOrder: 59433, lastWordOrder: 60084 },
  { stageIndex: 140, id: 'numbers-23', book: 'Numbers', chapter: 23, totalVerses: 30, firstWordOrder: 60085, lastWordOrder: 60474 },
  { stageIndex: 141, id: 'numbers-24', book: 'Numbers', chapter: 24, totalVerses: 25, firstWordOrder: 60475, lastWordOrder: 60780 },
  { stageIndex: 142, id: 'numbers-25', book: 'Numbers', chapter: 25, totalVerses: 19, firstWordOrder: 60781, lastWordOrder: 61012 },
  { stageIndex: 143, id: 'numbers-26', book: 'Numbers', chapter: 26, totalVerses: 65, firstWordOrder: 61013, lastWordOrder: 61687 },
  { stageIndex: 144, id: 'numbers-27', book: 'Numbers', chapter: 27, totalVerses: 23, firstWordOrder: 61688, lastWordOrder: 62006 },
  { stageIndex: 145, id: 'numbers-28', book: 'Numbers', chapter: 28, totalVerses: 31, firstWordOrder: 62007, lastWordOrder: 62354 },
  { stageIndex: 146, id: 'numbers-29', book: 'Numbers', chapter: 29, totalVerses: 39, firstWordOrder: 62355, lastWordOrder: 62774 },
  { stageIndex: 147, id: 'numbers-30', book: 'Numbers', chapter: 30, totalVerses: 17, firstWordOrder: 62775, lastWordOrder: 63037 },
  { stageIndex: 148, id: 'numbers-31', book: 'Numbers', chapter: 31, totalVerses: 54, firstWordOrder: 63038, lastWordOrder: 63714 },
  { stageIndex: 149, id: 'numbers-32', book: 'Numbers', chapter: 32, totalVerses: 42, firstWordOrder: 63715, lastWordOrder: 64270 },
  { stageIndex: 150, id: 'numbers-33', book: 'Numbers', chapter: 33, totalVerses: 56, firstWordOrder: 64271, lastWordOrder: 64734 },
  { stageIndex: 151, id: 'numbers-34', book: 'Numbers', chapter: 34, totalVerses: 29, firstWordOrder: 64735, lastWordOrder: 65038 },
  { stageIndex: 152, id: 'numbers-35', book: 'Numbers', chapter: 35, totalVerses: 34, firstWordOrder: 65039, lastWordOrder: 65520 },
  { stageIndex: 153, id: 'numbers-36', book: 'Numbers', chapter: 36, totalVerses: 13, firstWordOrder: 65521, lastWordOrder: 65732 },
  { stageIndex: 154, id: 'deuteronomy-1', book: 'Deuteronomy', chapter: 1, totalVerses: 46, firstWordOrder: 65733, lastWordOrder: 66386 },
  { stageIndex: 155, id: 'deuteronomy-2', book: 'Deuteronomy', chapter: 2, totalVerses: 37, firstWordOrder: 66387, lastWordOrder: 66919 },
  { stageIndex: 156, id: 'deuteronomy-3', book: 'Deuteronomy', chapter: 3, totalVerses: 29, firstWordOrder: 66920, lastWordOrder: 67380 },
  { stageIndex: 157, id: 'deuteronomy-4', book: 'Deuteronomy', chapter: 4, totalVerses: 49, firstWordOrder: 67381, lastWordOrder: 68193 },
  { stageIndex: 158, id: 'deuteronomy-5', book: 'Deuteronomy', chapter: 5, totalVerses: 33, firstWordOrder: 68194, lastWordOrder: 68666 },
  { stageIndex: 159, id: 'deuteronomy-6', book: 'Deuteronomy', chapter: 6, totalVerses: 25, firstWordOrder: 68667, lastWordOrder: 68984 },
  { stageIndex: 160, id: 'deuteronomy-7', book: 'Deuteronomy', chapter: 7, totalVerses: 26, firstWordOrder: 68985, lastWordOrder: 69397 },
  { stageIndex: 161, id: 'deuteronomy-8', book: 'Deuteronomy', chapter: 8, totalVerses: 20, firstWordOrder: 69398, lastWordOrder: 69691 },
  { stageIndex: 162, id: 'deuteronomy-9', book: 'Deuteronomy', chapter: 9, totalVerses: 29, firstWordOrder: 69692, lastWordOrder: 70190 },
  { stageIndex: 163, id: 'deuteronomy-10', book: 'Deuteronomy', chapter: 10, totalVerses: 22, firstWordOrder: 70191, lastWordOrder: 70514 },
  { stageIndex: 164, id: 'deuteronomy-11', book: 'Deuteronomy', chapter: 11, totalVerses: 32, firstWordOrder: 70515, lastWordOrder: 71022 },
  { stageIndex: 165, id: 'deuteronomy-12', book: 'Deuteronomy', chapter: 12, totalVerses: 31, firstWordOrder: 71023, lastWordOrder: 71542 },
  { stageIndex: 166, id: 'deuteronomy-13', book: 'Deuteronomy', chapter: 13, totalVerses: 19, firstWordOrder: 71543, lastWordOrder: 71871 },
  { stageIndex: 167, id: 'deuteronomy-14', book: 'Deuteronomy', chapter: 14, totalVerses: 29, firstWordOrder: 71872, lastWordOrder: 72222 },
  { stageIndex: 168, id: 'deuteronomy-15', book: 'Deuteronomy', chapter: 15, totalVerses: 23, firstWordOrder: 72223, lastWordOrder: 72576 },
  { stageIndex: 169, id: 'deuteronomy-16', book: 'Deuteronomy', chapter: 16, totalVerses: 22, firstWordOrder: 72577, lastWordOrder: 72910 },
  { stageIndex: 170, id: 'deuteronomy-17', book: 'Deuteronomy', chapter: 17, totalVerses: 20, firstWordOrder: 72911, lastWordOrder: 73278 },
  { stageIndex: 171, id: 'deuteronomy-18', book: 'Deuteronomy', chapter: 18, totalVerses: 22, firstWordOrder: 73279, lastWordOrder: 73582 },
  { stageIndex: 172, id: 'deuteronomy-19', book: 'Deuteronomy', chapter: 19, totalVerses: 21, firstWordOrder: 73583, lastWordOrder: 73914 },
  { stageIndex: 173, id: 'deuteronomy-20', book: 'Deuteronomy', chapter: 20, totalVerses: 20, firstWordOrder: 73915, lastWordOrder: 74230 },
  { stageIndex: 174, id: 'deuteronomy-21', book: 'Deuteronomy', chapter: 21, totalVerses: 23, firstWordOrder: 74231, lastWordOrder: 74585 },
  { stageIndex: 175, id: 'deuteronomy-22', book: 'Deuteronomy', chapter: 22, totalVerses: 29, firstWordOrder: 74586, lastWordOrder: 75035 },
  { stageIndex: 176, id: 'deuteronomy-23', book: 'Deuteronomy', chapter: 23, totalVerses: 26, firstWordOrder: 75036, lastWordOrder: 75374 },
  { stageIndex: 177, id: 'deuteronomy-24', book: 'Deuteronomy', chapter: 24, totalVerses: 22, firstWordOrder: 75375, lastWordOrder: 75701 },
  { stageIndex: 178, id: 'deuteronomy-25', book: 'Deuteronomy', chapter: 25, totalVerses: 19, firstWordOrder: 75702, lastWordOrder: 75961 },
  { stageIndex: 179, id: 'deuteronomy-26', book: 'Deuteronomy', chapter: 26, totalVerses: 19, firstWordOrder: 75962, lastWordOrder: 76280 },
  { stageIndex: 180, id: 'deuteronomy-27', book: 'Deuteronomy', chapter: 27, totalVerses: 26, firstWordOrder: 76281, lastWordOrder: 76606 },
  { stageIndex: 181, id: 'deuteronomy-28', book: 'Deuteronomy', chapter: 28, totalVerses: 69, firstWordOrder: 76607, lastWordOrder: 77602 },
  { stageIndex: 182, id: 'deuteronomy-29', book: 'Deuteronomy', chapter: 29, totalVerses: 28, firstWordOrder: 77603, lastWordOrder: 78042 },
  { stageIndex: 183, id: 'deuteronomy-30', book: 'Deuteronomy', chapter: 30, totalVerses: 20, firstWordOrder: 78043, lastWordOrder: 78368 },
  { stageIndex: 184, id: 'deuteronomy-31', book: 'Deuteronomy', chapter: 31, totalVerses: 30, firstWordOrder: 78369, lastWordOrder: 78921 },
  { stageIndex: 185, id: 'deuteronomy-32', book: 'Deuteronomy', chapter: 32, totalVerses: 52, firstWordOrder: 78922, lastWordOrder: 79537 },
  { stageIndex: 186, id: 'deuteronomy-33', book: 'Deuteronomy', chapter: 33, totalVerses: 29, firstWordOrder: 79538, lastWordOrder: 79876 },
  { stageIndex: 187, id: 'deuteronomy-34', book: 'Deuteronomy', chapter: 34, totalVerses: 12, firstWordOrder: 79877, lastWordOrder: 80052 },
  { stageIndex: 188, id: 'joshua-1', book: 'Joshua', chapter: 1, totalVerses: 18, firstWordOrder: 80053, lastWordOrder: 80372 },
  { stageIndex: 189, id: 'joshua-2', book: 'Joshua', chapter: 2, totalVerses: 24, firstWordOrder: 80373, lastWordOrder: 80776 },
  { stageIndex: 190, id: 'joshua-3', book: 'Joshua', chapter: 3, totalVerses: 17, firstWordOrder: 80777, lastWordOrder: 81071 },
  { stageIndex: 191, id: 'joshua-4', book: 'Joshua', chapter: 4, totalVerses: 24, firstWordOrder: 81072, lastWordOrder: 81462 },
  { stageIndex: 192, id: 'joshua-5', book: 'Joshua', chapter: 5, totalVerses: 15, firstWordOrder: 81463, lastWordOrder: 81751 },
  { stageIndex: 193, id: 'joshua-6', book: 'Joshua', chapter: 6, totalVerses: 27, firstWordOrder: 81752, lastWordOrder: 82229 },
  { stageIndex: 194, id: 'joshua-7', book: 'Joshua', chapter: 7, totalVerses: 26, firstWordOrder: 82230, lastWordOrder: 82724 },
  { stageIndex: 195, id: 'joshua-8', book: 'Joshua', chapter: 8, totalVerses: 35, firstWordOrder: 82725, lastWordOrder: 83342 },
  { stageIndex: 196, id: 'joshua-9', book: 'Joshua', chapter: 9, totalVerses: 27, firstWordOrder: 83343, lastWordOrder: 83758 },
  { stageIndex: 197, id: 'joshua-10', book: 'Joshua', chapter: 10, totalVerses: 43, firstWordOrder: 83759, lastWordOrder: 84524 },
  { stageIndex: 198, id: 'joshua-11', book: 'Joshua', chapter: 11, totalVerses: 23, firstWordOrder: 84525, lastWordOrder: 84933 },
  { stageIndex: 199, id: 'joshua-12', book: 'Joshua', chapter: 12, totalVerses: 24, firstWordOrder: 84934, lastWordOrder: 85181 },
  { stageIndex: 200, id: 'joshua-13', book: 'Joshua', chapter: 13, totalVerses: 33, firstWordOrder: 85182, lastWordOrder: 85620 },
  { stageIndex: 201, id: 'joshua-14', book: 'Joshua', chapter: 14, totalVerses: 15, firstWordOrder: 85621, lastWordOrder: 85898 },
  { stageIndex: 202, id: 'joshua-15', book: 'Joshua', chapter: 15, totalVerses: 63, firstWordOrder: 85899, lastWordOrder: 86455 },
  { stageIndex: 203, id: 'joshua-16', book: 'Joshua', chapter: 16, totalVerses: 10, firstWordOrder: 86456, lastWordOrder: 86579 },
  { stageIndex: 204, id: 'joshua-17', book: 'Joshua', chapter: 17, totalVerses: 18, firstWordOrder: 86580, lastWordOrder: 86916 },
  { stageIndex: 205, id: 'joshua-18', book: 'Joshua', chapter: 18, totalVerses: 28, firstWordOrder: 86917, lastWordOrder: 87326 },
  { stageIndex: 206, id: 'joshua-19', book: 'Joshua', chapter: 19, totalVerses: 51, firstWordOrder: 87327, lastWordOrder: 87813 },
  { stageIndex: 207, id: 'joshua-20', book: 'Joshua', chapter: 20, totalVerses: 9, firstWordOrder: 87814, lastWordOrder: 87986 },
  { stageIndex: 208, id: 'joshua-21', book: 'Joshua', chapter: 21, totalVerses: 45, firstWordOrder: 87987, lastWordOrder: 88570 },
  { stageIndex: 209, id: 'joshua-22', book: 'Joshua', chapter: 22, totalVerses: 34, firstWordOrder: 88571, lastWordOrder: 89259 },
  { stageIndex: 210, id: 'joshua-23', book: 'Joshua', chapter: 23, totalVerses: 16, firstWordOrder: 89260, lastWordOrder: 89558 },
  { stageIndex: 211, id: 'joshua-24', book: 'Joshua', chapter: 24, totalVerses: 33, firstWordOrder: 89559, lastWordOrder: 90135 },
  { stageIndex: 212, id: 'judges-1', book: 'Judges', chapter: 1, totalVerses: 36, firstWordOrder: 90136, lastWordOrder: 90665 },
  { stageIndex: 213, id: 'judges-2', book: 'Judges', chapter: 2, totalVerses: 23, firstWordOrder: 90666, lastWordOrder: 91028 },
  { stageIndex: 214, id: 'judges-3', book: 'Judges', chapter: 3, totalVerses: 31, firstWordOrder: 91029, lastWordOrder: 91509 },
  { stageIndex: 215, id: 'judges-4', book: 'Judges', chapter: 4, totalVerses: 24, firstWordOrder: 91510, lastWordOrder: 91932 },
  { stageIndex: 216, id: 'judges-5', book: 'Judges', chapter: 5, totalVerses: 31, firstWordOrder: 91933, lastWordOrder: 92296 },
  { stageIndex: 217, id: 'judges-6', book: 'Judges', chapter: 6, totalVerses: 40, firstWordOrder: 92297, lastWordOrder: 92976 },
  { stageIndex: 218, id: 'judges-7', book: 'Judges', chapter: 7, totalVerses: 25, firstWordOrder: 92977, lastWordOrder: 93482 },
  { stageIndex: 219, id: 'judges-8', book: 'Judges', chapter: 8, totalVerses: 35, firstWordOrder: 93483, lastWordOrder: 94009 },
  { stageIndex: 220, id: 'judges-9', book: 'Judges', chapter: 9, totalVerses: 57, firstWordOrder: 94010, lastWordOrder: 94886 },
  { stageIndex: 221, id: 'judges-10', book: 'Judges', chapter: 10, totalVerses: 18, firstWordOrder: 94887, lastWordOrder: 95146 },
  { stageIndex: 222, id: 'judges-11', book: 'Judges', chapter: 11, totalVerses: 40, firstWordOrder: 95147, lastWordOrder: 95810 },
  { stageIndex: 223, id: 'judges-12', book: 'Judges', chapter: 12, totalVerses: 15, firstWordOrder: 95811, lastWordOrder: 96033 },
  { stageIndex: 224, id: 'judges-13', book: 'Judges', chapter: 13, totalVerses: 25, firstWordOrder: 96034, lastWordOrder: 96428 },
  { stageIndex: 225, id: 'judges-14', book: 'Judges', chapter: 14, totalVerses: 20, firstWordOrder: 96429, lastWordOrder: 96764 },
  { stageIndex: 226, id: 'judges-15', book: 'Judges', chapter: 15, totalVerses: 20, firstWordOrder: 96765, lastWordOrder: 97085 },
  { stageIndex: 227, id: 'judges-16', book: 'Judges', chapter: 16, totalVerses: 31, firstWordOrder: 97086, lastWordOrder: 97644 },
  { stageIndex: 228, id: 'judges-17', book: 'Judges', chapter: 17, totalVerses: 13, firstWordOrder: 97645, lastWordOrder: 97837 },
  { stageIndex: 229, id: 'judges-18', book: 'Judges', chapter: 18, totalVerses: 31, firstWordOrder: 97838, lastWordOrder: 98385 },
  { stageIndex: 230, id: 'judges-19', book: 'Judges', chapter: 19, totalVerses: 30, firstWordOrder: 98386, lastWordOrder: 98916 },
  { stageIndex: 231, id: 'judges-20', book: 'Judges', chapter: 20, totalVerses: 48, firstWordOrder: 98917, lastWordOrder: 99663 },
  { stageIndex: 232, id: 'judges-21', book: 'Judges', chapter: 21, totalVerses: 25, firstWordOrder: 99664, lastWordOrder: 100040 },
  { stageIndex: 233, id: 'ruth-1', book: 'Ruth', chapter: 1, totalVerses: 22, firstWordOrder: 100041, lastWordOrder: 100366 },
  { stageIndex: 234, id: 'ruth-2', book: 'Ruth', chapter: 2, totalVerses: 23, firstWordOrder: 100367, lastWordOrder: 100745 },
  { stageIndex: 235, id: 'ruth-3', book: 'Ruth', chapter: 3, totalVerses: 18, firstWordOrder: 100746, lastWordOrder: 101008 },
  { stageIndex: 236, id: 'ruth-4', book: 'Ruth', chapter: 4, totalVerses: 22, firstWordOrder: 101009, lastWordOrder: 101346 },
  { stageIndex: 237, id: '1-samuel-1', book: '1 Samuel', chapter: 1, totalVerses: 28, firstWordOrder: 101347, lastWordOrder: 101761 },
  { stageIndex: 238, id: '1-samuel-2', book: '1 Samuel', chapter: 2, totalVerses: 36, firstWordOrder: 101762, lastWordOrder: 102322 },
  { stageIndex: 239, id: '1-samuel-3', book: '1 Samuel', chapter: 3, totalVerses: 21, firstWordOrder: 102323, lastWordOrder: 102627 },
  { stageIndex: 240, id: '1-samuel-4', book: '1 Samuel', chapter: 4, totalVerses: 22, firstWordOrder: 102628, lastWordOrder: 102998 },
  { stageIndex: 241, id: '1-samuel-5', book: '1 Samuel', chapter: 5, totalVerses: 12, firstWordOrder: 102999, lastWordOrder: 103219 },
  { stageIndex: 242, id: '1-samuel-6', book: '1 Samuel', chapter: 6, totalVerses: 21, firstWordOrder: 103220, lastWordOrder: 103616 },
  { stageIndex: 243, id: '1-samuel-7', book: '1 Samuel', chapter: 7, totalVerses: 17, firstWordOrder: 103617, lastWordOrder: 103904 },
  { stageIndex: 244, id: '1-samuel-8', book: '1 Samuel', chapter: 8, totalVerses: 22, firstWordOrder: 103905, lastWordOrder: 104176 },
  { stageIndex: 245, id: '1-samuel-9', book: '1 Samuel', chapter: 9, totalVerses: 27, firstWordOrder: 104177, lastWordOrder: 104673 },
  { stageIndex: 246, id: '1-samuel-10', book: '1 Samuel', chapter: 10, totalVerses: 27, firstWordOrder: 104674, lastWordOrder: 105117 },
  { stageIndex: 247, id: '1-samuel-11', book: '1 Samuel', chapter: 11, totalVerses: 15, firstWordOrder: 105118, lastWordOrder: 105376 },
  { stageIndex: 248, id: '1-samuel-12', book: '1 Samuel', chapter: 12, totalVerses: 25, firstWordOrder: 105377, lastWordOrder: 105802 },
  { stageIndex: 249, id: '1-samuel-13', book: '1 Samuel', chapter: 13, totalVerses: 23, firstWordOrder: 105803, lastWordOrder: 106159 },
  { stageIndex: 250, id: '1-samuel-14', book: '1 Samuel', chapter: 14, totalVerses: 52, firstWordOrder: 106160, lastWordOrder: 107007 },
  { stageIndex: 251, id: '1-samuel-15', book: '1 Samuel', chapter: 15, totalVerses: 35, firstWordOrder: 107008, lastWordOrder: 107537 },
  { stageIndex: 252, id: '1-samuel-16', book: '1 Samuel', chapter: 16, totalVerses: 23, firstWordOrder: 107538, lastWordOrder: 107910 },
  { stageIndex: 253, id: '1-samuel-17', book: '1 Samuel', chapter: 17, totalVerses: 58, firstWordOrder: 107911, lastWordOrder: 108826 },
  { stageIndex: 254, id: '1-samuel-18', book: '1 Samuel', chapter: 18, totalVerses: 30, firstWordOrder: 108827, lastWordOrder: 109262 },
  { stageIndex: 255, id: '1-samuel-19', book: '1 Samuel', chapter: 19, totalVerses: 24, firstWordOrder: 109263, lastWordOrder: 109662 },
  { stageIndex: 256, id: '1-samuel-20', book: '1 Samuel', chapter: 20, totalVerses: 42, firstWordOrder: 109663, lastWordOrder: 110370 },
  { stageIndex: 257, id: '1-samuel-21', book: '1 Samuel', chapter: 21, totalVerses: 16, firstWordOrder: 110371, lastWordOrder: 110655 },
  { stageIndex: 258, id: '1-samuel-22', book: '1 Samuel', chapter: 22, totalVerses: 23, firstWordOrder: 110656, lastWordOrder: 111080 },
  { stageIndex: 259, id: '1-samuel-23', book: '1 Samuel', chapter: 23, totalVerses: 28, firstWordOrder: 111081, lastWordOrder: 111517 },
  { stageIndex: 260, id: '1-samuel-24', book: '1 Samuel', chapter: 24, totalVerses: 23, firstWordOrder: 111518, lastWordOrder: 111894 },
  { stageIndex: 261, id: '1-samuel-25', book: '1 Samuel', chapter: 25, totalVerses: 44, firstWordOrder: 111895, lastWordOrder: 112648 },
  { stageIndex: 262, id: '1-samuel-26', book: '1 Samuel', chapter: 26, totalVerses: 25, firstWordOrder: 112649, lastWordOrder: 113129 },
  { stageIndex: 263, id: '1-samuel-27', book: '1 Samuel', chapter: 27, totalVerses: 12, firstWordOrder: 113130, lastWordOrder: 113340 },
  { stageIndex: 264, id: '1-samuel-28', book: '1 Samuel', chapter: 28, totalVerses: 25, firstWordOrder: 113341, lastWordOrder: 113772 },
  { stageIndex: 265, id: '1-samuel-29', book: '1 Samuel', chapter: 29, totalVerses: 11, firstWordOrder: 113773, lastWordOrder: 113991 },
  { stageIndex: 266, id: '1-samuel-30', book: '1 Samuel', chapter: 30, totalVerses: 31, firstWordOrder: 113992, lastWordOrder: 114479 },
  { stageIndex: 267, id: '1-samuel-31', book: '1 Samuel', chapter: 31, totalVerses: 13, firstWordOrder: 114480, lastWordOrder: 114681 },
  { stageIndex: 268, id: '2-samuel-1', book: '2 Samuel', chapter: 1, totalVerses: 27, firstWordOrder: 114682, lastWordOrder: 115051 },
  { stageIndex: 269, id: '2-samuel-2', book: '2 Samuel', chapter: 2, totalVerses: 32, firstWordOrder: 115052, lastWordOrder: 115568 },
  { stageIndex: 270, id: '2-samuel-3', book: '2 Samuel', chapter: 3, totalVerses: 39, firstWordOrder: 115569, lastWordOrder: 116229 },
  { stageIndex: 271, id: '2-samuel-4', book: '2 Samuel', chapter: 4, totalVerses: 12, firstWordOrder: 116230, lastWordOrder: 116466 },
  { stageIndex: 272, id: '2-samuel-5', book: '2 Samuel', chapter: 5, totalVerses: 25, firstWordOrder: 116467, lastWordOrder: 116822 },
  { stageIndex: 273, id: '2-samuel-6', book: '2 Samuel', chapter: 6, totalVerses: 23, firstWordOrder: 116823, lastWordOrder: 117199 },
  { stageIndex: 274, id: '2-samuel-7', book: '2 Samuel', chapter: 7, totalVerses: 29, firstWordOrder: 117200, lastWordOrder: 117660 },
  { stageIndex: 275, id: '2-samuel-8', book: '2 Samuel', chapter: 8, totalVerses: 18, firstWordOrder: 117661, lastWordOrder: 117922 },
  { stageIndex: 276, id: '2-samuel-9', book: '2 Samuel', chapter: 9, totalVerses: 13, firstWordOrder: 117923, lastWordOrder: 118144 },
  { stageIndex: 277, id: '2-samuel-10', book: '2 Samuel', chapter: 10, totalVerses: 19, firstWordOrder: 118145, lastWordOrder: 118459 },
  { stageIndex: 278, id: '2-samuel-11', book: '2 Samuel', chapter: 11, totalVerses: 27, firstWordOrder: 118460, lastWordOrder: 118903 },
  { stageIndex: 279, id: '2-samuel-12', book: '2 Samuel', chapter: 12, totalVerses: 31, firstWordOrder: 118904, lastWordOrder: 119435 },
  { stageIndex: 280, id: '2-samuel-13', book: '2 Samuel', chapter: 13, totalVerses: 39, firstWordOrder: 119436, lastWordOrder: 120086 },
  { stageIndex: 281, id: '2-samuel-14', book: '2 Samuel', chapter: 14, totalVerses: 33, firstWordOrder: 120087, lastWordOrder: 120688 },
  { stageIndex: 282, id: '2-samuel-15', book: '2 Samuel', chapter: 15, totalVerses: 37, firstWordOrder: 120689, lastWordOrder: 121294 },
  { stageIndex: 283, id: '2-samuel-16', book: '2 Samuel', chapter: 16, totalVerses: 23, firstWordOrder: 121295, lastWordOrder: 121689 },
  { stageIndex: 284, id: '2-samuel-17', book: '2 Samuel', chapter: 17, totalVerses: 29, firstWordOrder: 121690, lastWordOrder: 122211 },
  { stageIndex: 285, id: '2-samuel-18', book: '2 Samuel', chapter: 18, totalVerses: 32, firstWordOrder: 122212, lastWordOrder: 122807 },
  { stageIndex: 286, id: '2-samuel-19', book: '2 Samuel', chapter: 19, totalVerses: 44, firstWordOrder: 122808, lastWordOrder: 123628 },
  { stageIndex: 287, id: '2-samuel-20', book: '2 Samuel', chapter: 20, totalVerses: 26, firstWordOrder: 123629, lastWordOrder: 124076 },
  { stageIndex: 288, id: '2-samuel-21', book: '2 Samuel', chapter: 21, totalVerses: 22, firstWordOrder: 124077, lastWordOrder: 124507 },
  { stageIndex: 289, id: '2-samuel-22', book: '2 Samuel', chapter: 22, totalVerses: 51, firstWordOrder: 124508, lastWordOrder: 124895 },
  { stageIndex: 290, id: '2-samuel-23', book: '2 Samuel', chapter: 23, totalVerses: 39, firstWordOrder: 124896, lastWordOrder: 125351 },
  { stageIndex: 291, id: '2-samuel-24', book: '2 Samuel', chapter: 24, totalVerses: 25, firstWordOrder: 125352, lastWordOrder: 125811 },
  { stageIndex: 292, id: '1-kings-1', book: '1 Kings', chapter: 1, totalVerses: 53, firstWordOrder: 125812, lastWordOrder: 126627 },
  { stageIndex: 293, id: '1-kings-2', book: '1 Kings', chapter: 2, totalVerses: 46, firstWordOrder: 126628, lastWordOrder: 127434 },
  { stageIndex: 294, id: '1-kings-3', book: '1 Kings', chapter: 3, totalVerses: 28, firstWordOrder: 127435, lastWordOrder: 127906 },
  { stageIndex: 295, id: '1-kings-4', book: '1 Kings', chapter: 4, totalVerses: 20, firstWordOrder: 127907, lastWordOrder: 128107 },
  { stageIndex: 296, id: '1-kings-5', book: '1 Kings', chapter: 5, totalVerses: 32, firstWordOrder: 128108, lastWordOrder: 128611 },
  { stageIndex: 297, id: '1-kings-6', book: '1 Kings', chapter: 6, totalVerses: 38, firstWordOrder: 128612, lastWordOrder: 129127 },
  { stageIndex: 298, id: '1-kings-7', book: '1 Kings', chapter: 7, totalVerses: 51, firstWordOrder: 129128, lastWordOrder: 129922 },
  { stageIndex: 299, id: '1-kings-8', book: '1 Kings', chapter: 8, totalVerses: 66, firstWordOrder: 129923, lastWordOrder: 131070 },
  { stageIndex: 300, id: '1-kings-9', book: '1 Kings', chapter: 9, totalVerses: 28, firstWordOrder: 131071, lastWordOrder: 131544 },
  { stageIndex: 301, id: '1-kings-10', book: '1 Kings', chapter: 10, totalVerses: 29, firstWordOrder: 131545, lastWordOrder: 132007 },
  { stageIndex: 302, id: '1-kings-11', book: '1 Kings', chapter: 11, totalVerses: 43, firstWordOrder: 132008, lastWordOrder: 132697 },
  { stageIndex: 303, id: '1-kings-12', book: '1 Kings', chapter: 12, totalVerses: 33, firstWordOrder: 132698, lastWordOrder: 133286 },
  { stageIndex: 304, id: '1-kings-13', book: '1 Kings', chapter: 13, totalVerses: 34, firstWordOrder: 133287, lastWordOrder: 133888 },
  { stageIndex: 305, id: '1-kings-14', book: '1 Kings', chapter: 14, totalVerses: 31, firstWordOrder: 133889, lastWordOrder: 134409 },
  { stageIndex: 306, id: '1-kings-15', book: '1 Kings', chapter: 15, totalVerses: 34, firstWordOrder: 134410, lastWordOrder: 134934 },
  { stageIndex: 307, id: '1-kings-16', book: '1 Kings', chapter: 16, totalVerses: 34, firstWordOrder: 134935, lastWordOrder: 135482 },
  { stageIndex: 308, id: '1-kings-17', book: '1 Kings', chapter: 17, totalVerses: 24, firstWordOrder: 135483, lastWordOrder: 135841 },
  { stageIndex: 309, id: '1-kings-18', book: '1 Kings', chapter: 18, totalVerses: 46, firstWordOrder: 135842, lastWordOrder: 136584 },
  { stageIndex: 310, id: '1-kings-19', book: '1 Kings', chapter: 19, totalVerses: 21, firstWordOrder: 136585, lastWordOrder: 136956 },
  { stageIndex: 311, id: '1-kings-20', book: '1 Kings', chapter: 20, totalVerses: 43, firstWordOrder: 136957, lastWordOrder: 137703 },
  { stageIndex: 312, id: '1-kings-21', book: '1 Kings', chapter: 21, totalVerses: 29, firstWordOrder: 137704, lastWordOrder: 138186 },
  { stageIndex: 313, id: '1-kings-22', book: '1 Kings', chapter: 22, totalVerses: 54, firstWordOrder: 138187, lastWordOrder: 138997 },
  { stageIndex: 314, id: '2-kings-1', book: '2 Kings', chapter: 1, totalVerses: 18, firstWordOrder: 138998, lastWordOrder: 139356 },
  { stageIndex: 315, id: '2-kings-2', book: '2 Kings', chapter: 2, totalVerses: 25, firstWordOrder: 139357, lastWordOrder: 139784 },
  { stageIndex: 316, id: '2-kings-3', book: '2 Kings', chapter: 3, totalVerses: 27, firstWordOrder: 139785, lastWordOrder: 140220 },
  { stageIndex: 317, id: '2-kings-4', book: '2 Kings', chapter: 4, totalVerses: 44, firstWordOrder: 140221, lastWordOrder: 140900 },
  { stageIndex: 318, id: '2-kings-5', book: '2 Kings', chapter: 5, totalVerses: 27, firstWordOrder: 140901, lastWordOrder: 141392 },
  { stageIndex: 319, id: '2-kings-6', book: '2 Kings', chapter: 6, totalVerses: 33, firstWordOrder: 141393, lastWordOrder: 141923 },
  { stageIndex: 320, id: '2-kings-7', book: '2 Kings', chapter: 7, totalVerses: 20, firstWordOrder: 141924, lastWordOrder: 142334 },
  { stageIndex: 321, id: '2-kings-8', book: '2 Kings', chapter: 8, totalVerses: 29, firstWordOrder: 142335, lastWordOrder: 142853 },
  { stageIndex: 322, id: '2-kings-9', book: '2 Kings', chapter: 9, totalVerses: 37, firstWordOrder: 142854, lastWordOrder: 143468 },
  { stageIndex: 323, id: '2-kings-10', book: '2 Kings', chapter: 10, totalVerses: 36, firstWordOrder: 143469, lastWordOrder: 144090 },
  { stageIndex: 324, id: '2-kings-11', book: '2 Kings', chapter: 11, totalVerses: 20, firstWordOrder: 144091, lastWordOrder: 144456 },
  { stageIndex: 325, id: '2-kings-12', book: '2 Kings', chapter: 12, totalVerses: 22, firstWordOrder: 144457, lastWordOrder: 144821 },
  { stageIndex: 326, id: '2-kings-13', book: '2 Kings', chapter: 13, totalVerses: 25, firstWordOrder: 144822, lastWordOrder: 145238 },
  { stageIndex: 327, id: '2-kings-14', book: '2 Kings', chapter: 14, totalVerses: 29, firstWordOrder: 145239, lastWordOrder: 145722 },
  { stageIndex: 328, id: '2-kings-15', book: '2 Kings', chapter: 15, totalVerses: 38, firstWordOrder: 145723, lastWordOrder: 146310 },
  { stageIndex: 329, id: '2-kings-16', book: '2 Kings', chapter: 16, totalVerses: 20, firstWordOrder: 146311, lastWordOrder: 146677 },
  { stageIndex: 330, id: '2-kings-17', book: '2 Kings', chapter: 17, totalVerses: 41, firstWordOrder: 146678, lastWordOrder: 147371 },
  { stageIndex: 331, id: '2-kings-18', book: '2 Kings', chapter: 18, totalVerses: 37, firstWordOrder: 147372, lastWordOrder: 148042 },
  { stageIndex: 332, id: '2-kings-19', book: '2 Kings', chapter: 19, totalVerses: 37, firstWordOrder: 148043, lastWordOrder: 148614 },
  { stageIndex: 333, id: '2-kings-20', book: '2 Kings', chapter: 20, totalVerses: 21, firstWordOrder: 148615, lastWordOrder: 148979 },
  { stageIndex: 334, id: '2-kings-21', book: '2 Kings', chapter: 21, totalVerses: 26, firstWordOrder: 148980, lastWordOrder: 149377 },
  { stageIndex: 335, id: '2-kings-22', book: '2 Kings', chapter: 22, totalVerses: 20, firstWordOrder: 149378, lastWordOrder: 149750 },
  { stageIndex: 336, id: '2-kings-23', book: '2 Kings', chapter: 23, totalVerses: 37, firstWordOrder: 149751, lastWordOrder: 150526 },
  { stageIndex: 337, id: '2-kings-24', book: '2 Kings', chapter: 24, totalVerses: 20, firstWordOrder: 150527, lastWordOrder: 150842 },
  { stageIndex: 338, id: '2-kings-25', book: '2 Kings', chapter: 25, totalVerses: 30, firstWordOrder: 150843, lastWordOrder: 151351 },
  { stageIndex: 339, id: '1-chronicles-1', book: '1 Chronicles', chapter: 1, totalVerses: 54, firstWordOrder: 151352, lastWordOrder: 151776 },
  { stageIndex: 340, id: '1-chronicles-2', book: '1 Chronicles', chapter: 2, totalVerses: 55, firstWordOrder: 151777, lastWordOrder: 152313 },
  { stageIndex: 341, id: '1-chronicles-3', book: '1 Chronicles', chapter: 3, totalVerses: 24, firstWordOrder: 152314, lastWordOrder: 152509 },
  { stageIndex: 342, id: '1-chronicles-4', book: '1 Chronicles', chapter: 4, totalVerses: 43, firstWordOrder: 152510, lastWordOrder: 152987 },
  { stageIndex: 343, id: '1-chronicles-5', book: '1 Chronicles', chapter: 5, totalVerses: 41, firstWordOrder: 152988, lastWordOrder: 153438 },
  { stageIndex: 344, id: '1-chronicles-6', book: '1 Chronicles', chapter: 6, totalVerses: 66, firstWordOrder: 153439, lastWordOrder: 154069 },
  { stageIndex: 345, id: '1-chronicles-7', book: '1 Chronicles', chapter: 7, totalVerses: 40, firstWordOrder: 154070, lastWordOrder: 154500 },
  { stageIndex: 346, id: '1-chronicles-8', book: '1 Chronicles', chapter: 8, totalVerses: 40, firstWordOrder: 154501, lastWordOrder: 154802 },
  { stageIndex: 347, id: '1-chronicles-9', book: '1 Chronicles', chapter: 9, totalVerses: 44, firstWordOrder: 154803, lastWordOrder: 155296 },
  { stageIndex: 348, id: '1-chronicles-10', book: '1 Chronicles', chapter: 10, totalVerses: 14, firstWordOrder: 155297, lastWordOrder: 155500 },
  { stageIndex: 349, id: '1-chronicles-11', book: '1 Chronicles', chapter: 11, totalVerses: 47, firstWordOrder: 155501, lastWordOrder: 156024 },
  { stageIndex: 350, id: '1-chronicles-12', book: '1 Chronicles', chapter: 12, totalVerses: 41, firstWordOrder: 156025, lastWordOrder: 156523 },
  { stageIndex: 351, id: '1-chronicles-13', book: '1 Chronicles', chapter: 13, totalVerses: 14, firstWordOrder: 156524, lastWordOrder: 156735 },
  { stageIndex: 352, id: '1-chronicles-14', book: '1 Chronicles', chapter: 14, totalVerses: 17, firstWordOrder: 156736, lastWordOrder: 156931 },
  { stageIndex: 353, id: '1-chronicles-15', book: '1 Chronicles', chapter: 15, totalVerses: 29, firstWordOrder: 156932, lastWordOrder: 157297 },
  { stageIndex: 354, id: '1-chronicles-16', book: '1 Chronicles', chapter: 16, totalVerses: 43, firstWordOrder: 157298, lastWordOrder: 157706 },
  { stageIndex: 355, id: '1-chronicles-17', book: '1 Chronicles', chapter: 17, totalVerses: 27, firstWordOrder: 157707, lastWordOrder: 158114 },
  { stageIndex: 356, id: '1-chronicles-18', book: '1 Chronicles', chapter: 18, totalVerses: 17, firstWordOrder: 158115, lastWordOrder: 158358 },
  { stageIndex: 357, id: '1-chronicles-19', book: '1 Chronicles', chapter: 19, totalVerses: 19, firstWordOrder: 158359, lastWordOrder: 158677 },
  { stageIndex: 358, id: '1-chronicles-20', book: '1 Chronicles', chapter: 20, totalVerses: 8, firstWordOrder: 158678, lastWordOrder: 158821 },
  { stageIndex: 359, id: '1-chronicles-21', book: '1 Chronicles', chapter: 21, totalVerses: 30, firstWordOrder: 158822, lastWordOrder: 159313 },
  { stageIndex: 360, id: '1-chronicles-22', book: '1 Chronicles', chapter: 22, totalVerses: 19, firstWordOrder: 159314, lastWordOrder: 159621 },
  { stageIndex: 361, id: '1-chronicles-23', book: '1 Chronicles', chapter: 23, totalVerses: 32, firstWordOrder: 159622, lastWordOrder: 159955 },
  { stageIndex: 362, id: '1-chronicles-24', book: '1 Chronicles', chapter: 24, totalVerses: 31, firstWordOrder: 159956, lastWordOrder: 160226 },
  { stageIndex: 363, id: '1-chronicles-25', book: '1 Chronicles', chapter: 25, totalVerses: 31, firstWordOrder: 160227, lastWordOrder: 160514 },
  { stageIndex: 364, id: '1-chronicles-26', book: '1 Chronicles', chapter: 26, totalVerses: 32, firstWordOrder: 160515, lastWordOrder: 160870 },
  { stageIndex: 365, id: '1-chronicles-27', book: '1 Chronicles', chapter: 27, totalVerses: 34, firstWordOrder: 160871, lastWordOrder: 161279 },
  { stageIndex: 366, id: '1-chronicles-28', book: '1 Chronicles', chapter: 28, totalVerses: 21, firstWordOrder: 161280, lastWordOrder: 161660 },
  { stageIndex: 367, id: '1-chronicles-29', book: '1 Chronicles', chapter: 29, totalVerses: 30, firstWordOrder: 161661, lastWordOrder: 162141 },
  { stageIndex: 368, id: '2-chronicles-1', book: '2 Chronicles', chapter: 1, totalVerses: 18, firstWordOrder: 162142, lastWordOrder: 162425 },
  { stageIndex: 369, id: '2-chronicles-2', book: '2 Chronicles', chapter: 2, totalVerses: 17, firstWordOrder: 162426, lastWordOrder: 162752 },
  { stageIndex: 370, id: '2-chronicles-3', book: '2 Chronicles', chapter: 3, totalVerses: 17, firstWordOrder: 162753, lastWordOrder: 162991 },
  { stageIndex: 371, id: '2-chronicles-4', book: '2 Chronicles', chapter: 4, totalVerses: 22, firstWordOrder: 162992, lastWordOrder: 163303 },
  { stageIndex: 372, id: '2-chronicles-5', book: '2 Chronicles', chapter: 5, totalVerses: 14, firstWordOrder: 163304, lastWordOrder: 163551 },
  { stageIndex: 373, id: '2-chronicles-6', book: '2 Chronicles', chapter: 6, totalVerses: 42, firstWordOrder: 163552, lastWordOrder: 164292 },
  { stageIndex: 374, id: '2-chronicles-7', book: '2 Chronicles', chapter: 7, totalVerses: 22, firstWordOrder: 164293, lastWordOrder: 164688 },
  { stageIndex: 375, id: '2-chronicles-8', book: '2 Chronicles', chapter: 8, totalVerses: 18, firstWordOrder: 164689, lastWordOrder: 164981 },
  { stageIndex: 376, id: '2-chronicles-9', book: '2 Chronicles', chapter: 9, totalVerses: 31, firstWordOrder: 164982, lastWordOrder: 165469 },
  { stageIndex: 377, id: '2-chronicles-10', book: '2 Chronicles', chapter: 10, totalVerses: 19, firstWordOrder: 165470, lastWordOrder: 165780 },
  { stageIndex: 378, id: '2-chronicles-11', book: '2 Chronicles', chapter: 11, totalVerses: 23, firstWordOrder: 165781, lastWordOrder: 166074 },
  { stageIndex: 379, id: '2-chronicles-12', book: '2 Chronicles', chapter: 12, totalVerses: 16, firstWordOrder: 166075, lastWordOrder: 166327 },
  { stageIndex: 380, id: '2-chronicles-13', book: '2 Chronicles', chapter: 13, totalVerses: 23, firstWordOrder: 166328, lastWordOrder: 166692 },
  { stageIndex: 381, id: '2-chronicles-14', book: '2 Chronicles', chapter: 14, totalVerses: 14, firstWordOrder: 166693, lastWordOrder: 166909 },
  { stageIndex: 382, id: '2-chronicles-15', book: '2 Chronicles', chapter: 15, totalVerses: 19, firstWordOrder: 166910, lastWordOrder: 167161 },
  { stageIndex: 383, id: '2-chronicles-16', book: '2 Chronicles', chapter: 16, totalVerses: 14, firstWordOrder: 167162, lastWordOrder: 167420 },
  { stageIndex: 384, id: '2-chronicles-17', book: '2 Chronicles', chapter: 17, totalVerses: 19, firstWordOrder: 167421, lastWordOrder: 167660 },
  { stageIndex: 385, id: '2-chronicles-18', book: '2 Chronicles', chapter: 18, totalVerses: 34, firstWordOrder: 167661, lastWordOrder: 168220 },
  { stageIndex: 386, id: '2-chronicles-19', book: '2 Chronicles', chapter: 19, totalVerses: 11, firstWordOrder: 168221, lastWordOrder: 168402 },
  { stageIndex: 387, id: '2-chronicles-20', book: '2 Chronicles', chapter: 20, totalVerses: 37, firstWordOrder: 168403, lastWordOrder: 168982 },
  { stageIndex: 388, id: '2-chronicles-21', book: '2 Chronicles', chapter: 21, totalVerses: 20, firstWordOrder: 168983, lastWordOrder: 169303 },
  { stageIndex: 389, id: '2-chronicles-22', book: '2 Chronicles', chapter: 22, totalVerses: 12, firstWordOrder: 169304, lastWordOrder: 169546 },
  { stageIndex: 390, id: '2-chronicles-23', book: '2 Chronicles', chapter: 23, totalVerses: 21, firstWordOrder: 169547, lastWordOrder: 169931 },
  { stageIndex: 391, id: '2-chronicles-24', book: '2 Chronicles', chapter: 24, totalVerses: 27, firstWordOrder: 169932, lastWordOrder: 170388 },
  { stageIndex: 392, id: '2-chronicles-25', book: '2 Chronicles', chapter: 25, totalVerses: 28, firstWordOrder: 170389, lastWordOrder: 170882 },
  { stageIndex: 393, id: '2-chronicles-26', book: '2 Chronicles', chapter: 26, totalVerses: 23, firstWordOrder: 170883, lastWordOrder: 171255 },
  { stageIndex: 394, id: '2-chronicles-27', book: '2 Chronicles', chapter: 27, totalVerses: 9, firstWordOrder: 171256, lastWordOrder: 171384 },
  { stageIndex: 395, id: '2-chronicles-28', book: '2 Chronicles', chapter: 28, totalVerses: 27, firstWordOrder: 171385, lastWordOrder: 171834 },
  { stageIndex: 396, id: '2-chronicles-29', book: '2 Chronicles', chapter: 29, totalVerses: 36, firstWordOrder: 171835, lastWordOrder: 172378 },
  { stageIndex: 397, id: '2-chronicles-30', book: '2 Chronicles', chapter: 30, totalVerses: 27, firstWordOrder: 172379, lastWordOrder: 172811 },
  { stageIndex: 398, id: '2-chronicles-31', book: '2 Chronicles', chapter: 31, totalVerses: 21, firstWordOrder: 172812, lastWordOrder: 173145 },
  { stageIndex: 399, id: '2-chronicles-32', book: '2 Chronicles', chapter: 32, totalVerses: 33, firstWordOrder: 173146, lastWordOrder: 173695 },
  { stageIndex: 400, id: '2-chronicles-33', book: '2 Chronicles', chapter: 33, totalVerses: 25, firstWordOrder: 173696, lastWordOrder: 174076 },
  { stageIndex: 401, id: '2-chronicles-34', book: '2 Chronicles', chapter: 34, totalVerses: 33, firstWordOrder: 174077, lastWordOrder: 174695 },
  { stageIndex: 402, id: '2-chronicles-35', book: '2 Chronicles', chapter: 35, totalVerses: 27, firstWordOrder: 174696, lastWordOrder: 175128 },
  { stageIndex: 403, id: '2-chronicles-36', book: '2 Chronicles', chapter: 36, totalVerses: 23, firstWordOrder: 175129, lastWordOrder: 175495 },
  { stageIndex: 404, id: 'ezra-1', book: 'Ezra', chapter: 1, totalVerses: 11, firstWordOrder: 175496, lastWordOrder: 175681 },
  { stageIndex: 405, id: 'ezra-2', book: 'Ezra', chapter: 2, totalVerses: 70, firstWordOrder: 175682, lastWordOrder: 176227 },
  { stageIndex: 406, id: 'ezra-3', book: 'Ezra', chapter: 3, totalVerses: 13, firstWordOrder: 176228, lastWordOrder: 176479 },
  { stageIndex: 407, id: 'ezra-4', book: 'Ezra', chapter: 4, totalVerses: 24, firstWordOrder: 176480, lastWordOrder: 176892 },
  { stageIndex: 408, id: 'ezra-5', book: 'Ezra', chapter: 5, totalVerses: 17, firstWordOrder: 176893, lastWordOrder: 177226 },
  { stageIndex: 409, id: 'ezra-6', book: 'Ezra', chapter: 6, totalVerses: 22, firstWordOrder: 177227, lastWordOrder: 177621 },
  { stageIndex: 410, id: 'ezra-7', book: 'Ezra', chapter: 7, totalVerses: 28, firstWordOrder: 177622, lastWordOrder: 178061 },
  { stageIndex: 411, id: 'ezra-8', book: 'Ezra', chapter: 8, totalVerses: 36, firstWordOrder: 178062, lastWordOrder: 178528 },
  { stageIndex: 412, id: 'ezra-9', book: 'Ezra', chapter: 9, totalVerses: 15, firstWordOrder: 178529, lastWordOrder: 178814 },
  { stageIndex: 413, id: 'ezra-10', book: 'Ezra', chapter: 10, totalVerses: 44, firstWordOrder: 178815, lastWordOrder: 179286 },
  { stageIndex: 414, id: 'nehemiah-1', book: 'Nehemiah', chapter: 1, totalVerses: 11, firstWordOrder: 179287, lastWordOrder: 179490 },
  { stageIndex: 415, id: 'nehemiah-2', book: 'Nehemiah', chapter: 2, totalVerses: 20, firstWordOrder: 179491, lastWordOrder: 179862 },
  { stageIndex: 416, id: 'nehemiah-3', book: 'Nehemiah', chapter: 3, totalVerses: 38, firstWordOrder: 179863, lastWordOrder: 180421 },
  { stageIndex: 417, id: 'nehemiah-4', book: 'Nehemiah', chapter: 4, totalVerses: 17, firstWordOrder: 180422, lastWordOrder: 180673 },
  { stageIndex: 418, id: 'nehemiah-5', book: 'Nehemiah', chapter: 5, totalVerses: 19, firstWordOrder: 180674, lastWordOrder: 181003 },
  { stageIndex: 419, id: 'nehemiah-6', book: 'Nehemiah', chapter: 6, totalVerses: 19, firstWordOrder: 181004, lastWordOrder: 181308 },
  { stageIndex: 420, id: 'nehemiah-7', book: 'Nehemiah', chapter: 7, totalVerses: 72, firstWordOrder: 181309, lastWordOrder: 181936 },
  { stageIndex: 421, id: 'nehemiah-8', book: 'Nehemiah', chapter: 8, totalVerses: 18, firstWordOrder: 181937, lastWordOrder: 182293 },
  { stageIndex: 422, id: 'nehemiah-9', book: 'Nehemiah', chapter: 9, totalVerses: 37, firstWordOrder: 182294, lastWordOrder: 182951 },
  { stageIndex: 423, id: 'nehemiah-10', book: 'Nehemiah', chapter: 10, totalVerses: 40, firstWordOrder: 182952, lastWordOrder: 183293 },
  { stageIndex: 424, id: 'nehemiah-11', book: 'Nehemiah', chapter: 11, totalVerses: 36, firstWordOrder: 183294, lastWordOrder: 183672 },
  { stageIndex: 425, id: 'nehemiah-12', book: 'Nehemiah', chapter: 12, totalVerses: 47, firstWordOrder: 183673, lastWordOrder: 184147 },
  { stageIndex: 426, id: 'nehemiah-13', book: 'Nehemiah', chapter: 13, totalVerses: 31, firstWordOrder: 184148, lastWordOrder: 184622 },
  { stageIndex: 427, id: 'esther-1', book: 'Esther', chapter: 1, totalVerses: 22, firstWordOrder: 184623, lastWordOrder: 184994 },
  { stageIndex: 428, id: 'esther-2', book: 'Esther', chapter: 2, totalVerses: 23, firstWordOrder: 184995, lastWordOrder: 185432 },
  { stageIndex: 429, id: 'esther-3', book: 'Esther', chapter: 3, totalVerses: 15, firstWordOrder: 185433, lastWordOrder: 185736 },
  { stageIndex: 430, id: 'esther-4', book: 'Esther', chapter: 4, totalVerses: 17, firstWordOrder: 185737, lastWordOrder: 186022 },
  { stageIndex: 431, id: 'esther-5', book: 'Esther', chapter: 5, totalVerses: 14, firstWordOrder: 186023, lastWordOrder: 186287 },
  { stageIndex: 432, id: 'esther-6', book: 'Esther', chapter: 6, totalVerses: 14, firstWordOrder: 186288, lastWordOrder: 186550 },
  { stageIndex: 433, id: 'esther-7', book: 'Esther', chapter: 7, totalVerses: 10, firstWordOrder: 186551, lastWordOrder: 186737 },
  { stageIndex: 434, id: 'esther-8', book: 'Esther', chapter: 8, totalVerses: 17, firstWordOrder: 186738, lastWordOrder: 187084 },
  { stageIndex: 435, id: 'esther-9', book: 'Esther', chapter: 9, totalVerses: 32, firstWordOrder: 187085, lastWordOrder: 187632 },
  { stageIndex: 436, id: 'esther-10', book: 'Esther', chapter: 10, totalVerses: 3, firstWordOrder: 187633, lastWordOrder: 187679 },
  { stageIndex: 437, id: 'job-1', book: 'Job', chapter: 1, totalVerses: 22, firstWordOrder: 187680, lastWordOrder: 188027 },
  { stageIndex: 438, id: 'job-2', book: 'Job', chapter: 2, totalVerses: 13, firstWordOrder: 188028, lastWordOrder: 188237 },
  { stageIndex: 439, id: 'job-3', book: 'Job', chapter: 3, totalVerses: 26, firstWordOrder: 188238, lastWordOrder: 188441 },
  { stageIndex: 440, id: 'job-4', book: 'Job', chapter: 4, totalVerses: 21, firstWordOrder: 188442, lastWordOrder: 188590 },
  { stageIndex: 441, id: 'job-5', book: 'Job', chapter: 5, totalVerses: 27, firstWordOrder: 188591, lastWordOrder: 188796 },
  { stageIndex: 442, id: 'job-6', book: 'Job', chapter: 6, totalVerses: 30, firstWordOrder: 188797, lastWordOrder: 189019 },
  { stageIndex: 443, id: 'job-7', book: 'Job', chapter: 7, totalVerses: 21, firstWordOrder: 189020, lastWordOrder: 189193 },
  { stageIndex: 444, id: 'job-8', book: 'Job', chapter: 8, totalVerses: 22, firstWordOrder: 189194, lastWordOrder: 189359 },
  { stageIndex: 445, id: 'job-9', book: 'Job', chapter: 9, totalVerses: 35, firstWordOrder: 189360, lastWordOrder: 189620 },
  { stageIndex: 446, id: 'job-10', book: 'Job', chapter: 10, totalVerses: 22, firstWordOrder: 189621, lastWordOrder: 189791 },
  { stageIndex: 447, id: 'job-11', book: 'Job', chapter: 11, totalVerses: 20, firstWordOrder: 189792, lastWordOrder: 189939 },
  { stageIndex: 448, id: 'job-12', book: 'Job', chapter: 12, totalVerses: 25, firstWordOrder: 189940, lastWordOrder: 190122 },
  { stageIndex: 449, id: 'job-13', book: 'Job', chapter: 13, totalVerses: 28, firstWordOrder: 190123, lastWordOrder: 190326 },
  { stageIndex: 450, id: 'job-14', book: 'Job', chapter: 14, totalVerses: 22, firstWordOrder: 190327, lastWordOrder: 190504 },
  { stageIndex: 451, id: 'job-15', book: 'Job', chapter: 15, totalVerses: 35, firstWordOrder: 190505, lastWordOrder: 190768 },
  { stageIndex: 452, id: 'job-16', book: 'Job', chapter: 16, totalVerses: 22, firstWordOrder: 190769, lastWordOrder: 190941 },
  { stageIndex: 453, id: 'job-17', book: 'Job', chapter: 17, totalVerses: 16, firstWordOrder: 190942, lastWordOrder: 191053 },
  { stageIndex: 454, id: 'job-18', book: 'Job', chapter: 18, totalVerses: 21, firstWordOrder: 191054, lastWordOrder: 191196 },
  { stageIndex: 455, id: 'job-19', book: 'Job', chapter: 19, totalVerses: 29, firstWordOrder: 191197, lastWordOrder: 191410 },
  { stageIndex: 456, id: 'job-20', book: 'Job', chapter: 20, totalVerses: 29, firstWordOrder: 191411, lastWordOrder: 191619 },
  { stageIndex: 457, id: 'job-21', book: 'Job', chapter: 21, totalVerses: 34, firstWordOrder: 191620, lastWordOrder: 191861 },
  { stageIndex: 458, id: 'job-22', book: 'Job', chapter: 22, totalVerses: 30, firstWordOrder: 191862, lastWordOrder: 192071 },
  { stageIndex: 459, id: 'job-23', book: 'Job', chapter: 23, totalVerses: 17, firstWordOrder: 192072, lastWordOrder: 192189 },
  { stageIndex: 460, id: 'job-24', book: 'Job', chapter: 24, totalVerses: 25, firstWordOrder: 192190, lastWordOrder: 192394 },
  { stageIndex: 461, id: 'job-25', book: 'Job', chapter: 25, totalVerses: 6, firstWordOrder: 192395, lastWordOrder: 192437 },
  { stageIndex: 462, id: 'job-26', book: 'Job', chapter: 26, totalVerses: 14, firstWordOrder: 192438, lastWordOrder: 192540 },
  { stageIndex: 463, id: 'job-27', book: 'Job', chapter: 27, totalVerses: 23, firstWordOrder: 192541, lastWordOrder: 192710 },
  { stageIndex: 464, id: 'job-28', book: 'Job', chapter: 28, totalVerses: 28, firstWordOrder: 192711, lastWordOrder: 192917 },
  { stageIndex: 465, id: 'job-29', book: 'Job', chapter: 29, totalVerses: 25, firstWordOrder: 192918, lastWordOrder: 193086 },
  { stageIndex: 466, id: 'job-30', book: 'Job', chapter: 30, totalVerses: 31, firstWordOrder: 193087, lastWordOrder: 193315 },
  { stageIndex: 467, id: 'job-31', book: 'Job', chapter: 31, totalVerses: 40, firstWordOrder: 193316, lastWordOrder: 193628 },
  { stageIndex: 468, id: 'job-32', book: 'Job', chapter: 32, totalVerses: 22, firstWordOrder: 193629, lastWordOrder: 193825 },
  { stageIndex: 469, id: 'job-33', book: 'Job', chapter: 33, totalVerses: 33, firstWordOrder: 193826, lastWordOrder: 194075 },
  { stageIndex: 470, id: 'job-34', book: 'Job', chapter: 34, totalVerses: 37, firstWordOrder: 194076, lastWordOrder: 194372 },
  { stageIndex: 471, id: 'job-35', book: 'Job', chapter: 35, totalVerses: 16, firstWordOrder: 194373, lastWordOrder: 194488 },
  { stageIndex: 472, id: 'job-36', book: 'Job', chapter: 36, totalVerses: 33, firstWordOrder: 194489, lastWordOrder: 194728 },
  { stageIndex: 473, id: 'job-37', book: 'Job', chapter: 37, totalVerses: 24, firstWordOrder: 194729, lastWordOrder: 194917 },
  { stageIndex: 474, id: 'job-38', book: 'Job', chapter: 38, totalVerses: 41, firstWordOrder: 194918, lastWordOrder: 195221 },
  { stageIndex: 475, id: 'job-39', book: 'Job', chapter: 39, totalVerses: 30, firstWordOrder: 195222, lastWordOrder: 195437 },
  { stageIndex: 476, id: 'job-40', book: 'Job', chapter: 40, totalVerses: 32, firstWordOrder: 195438, lastWordOrder: 195655 },
  { stageIndex: 477, id: 'job-41', book: 'Job', chapter: 41, totalVerses: 26, firstWordOrder: 195656, lastWordOrder: 195833 },
  { stageIndex: 478, id: 'job-42', book: 'Job', chapter: 42, totalVerses: 17, firstWordOrder: 195834, lastWordOrder: 196078 },
  { stageIndex: 479, id: 'psalms-1', book: 'Psalms', chapter: 1, totalVerses: 6, firstWordOrder: 196079, lastWordOrder: 196145 },
  { stageIndex: 480, id: 'psalms-2', book: 'Psalms', chapter: 2, totalVerses: 12, firstWordOrder: 196146, lastWordOrder: 196237 },
  { stageIndex: 481, id: 'psalms-3', book: 'Psalms', chapter: 3, totalVerses: 9, firstWordOrder: 196238, lastWordOrder: 196307 },
  { stageIndex: 482, id: 'psalms-4', book: 'Psalms', chapter: 4, totalVerses: 9, firstWordOrder: 196308, lastWordOrder: 196384 },
  { stageIndex: 483, id: 'psalms-5', book: 'Psalms', chapter: 5, totalVerses: 13, firstWordOrder: 196385, lastWordOrder: 196496 },
  { stageIndex: 484, id: 'psalms-6', book: 'Psalms', chapter: 6, totalVerses: 11, firstWordOrder: 196497, lastWordOrder: 196581 },
  { stageIndex: 485, id: 'psalms-7', book: 'Psalms', chapter: 7, totalVerses: 18, firstWordOrder: 196582, lastWordOrder: 196723 },
  { stageIndex: 486, id: 'psalms-8', book: 'Psalms', chapter: 8, totalVerses: 10, firstWordOrder: 196724, lastWordOrder: 196800 },
  { stageIndex: 487, id: 'psalms-9', book: 'Psalms', chapter: 9, totalVerses: 21, firstWordOrder: 196801, lastWordOrder: 196966 },
  { stageIndex: 488, id: 'psalms-10', book: 'Psalms', chapter: 10, totalVerses: 18, firstWordOrder: 196967, lastWordOrder: 197133 },
  { stageIndex: 489, id: 'psalms-11', book: 'Psalms', chapter: 11, totalVerses: 7, firstWordOrder: 197134, lastWordOrder: 197202 },
  { stageIndex: 490, id: 'psalms-12', book: 'Psalms', chapter: 12, totalVerses: 9, firstWordOrder: 197203, lastWordOrder: 197281 },
  { stageIndex: 491, id: 'psalms-13', book: 'Psalms', chapter: 13, totalVerses: 6, firstWordOrder: 197282, lastWordOrder: 197336 },
  { stageIndex: 492, id: 'psalms-14', book: 'Psalms', chapter: 14, totalVerses: 7, firstWordOrder: 197337, lastWordOrder: 197409 },
  { stageIndex: 493, id: 'psalms-15', book: 'Psalms', chapter: 15, totalVerses: 5, firstWordOrder: 197410, lastWordOrder: 197464 },
  { stageIndex: 494, id: 'psalms-16', book: 'Psalms', chapter: 16, totalVerses: 11, firstWordOrder: 197465, lastWordOrder: 197561 },
  { stageIndex: 495, id: 'psalms-17', book: 'Psalms', chapter: 17, totalVerses: 15, firstWordOrder: 197562, lastWordOrder: 197687 },
  { stageIndex: 496, id: 'psalms-18', book: 'Psalms', chapter: 18, totalVerses: 51, firstWordOrder: 197688, lastWordOrder: 198085 },
  { stageIndex: 497, id: 'psalms-19', book: 'Psalms', chapter: 19, totalVerses: 15, firstWordOrder: 198086, lastWordOrder: 198211 },
  { stageIndex: 498, id: 'psalms-20', book: 'Psalms', chapter: 20, totalVerses: 10, firstWordOrder: 198212, lastWordOrder: 198281 },
  { stageIndex: 499, id: 'psalms-21', book: 'Psalms', chapter: 21, totalVerses: 14, firstWordOrder: 198282, lastWordOrder: 198386 },
  { stageIndex: 500, id: 'psalms-22', book: 'Psalms', chapter: 22, totalVerses: 32, firstWordOrder: 198387, lastWordOrder: 198639 },
  { stageIndex: 501, id: 'psalms-23', book: 'Psalms', chapter: 23, totalVerses: 6, firstWordOrder: 198640, lastWordOrder: 198696 },
  { stageIndex: 502, id: 'psalms-24', book: 'Psalms', chapter: 24, totalVerses: 10, firstWordOrder: 198697, lastWordOrder: 198786 },
  { stageIndex: 503, id: 'psalms-25', book: 'Psalms', chapter: 25, totalVerses: 22, firstWordOrder: 198787, lastWordOrder: 198945 },
  { stageIndex: 504, id: 'psalms-26', book: 'Psalms', chapter: 26, totalVerses: 12, firstWordOrder: 198946, lastWordOrder: 199031 },
  { stageIndex: 505, id: 'psalms-27', book: 'Psalms', chapter: 27, totalVerses: 14, firstWordOrder: 199032, lastWordOrder: 199180 },
  { stageIndex: 506, id: 'psalms-28', book: 'Psalms', chapter: 28, totalVerses: 9, firstWordOrder: 199181, lastWordOrder: 199276 },
  { stageIndex: 507, id: 'psalms-29', book: 'Psalms', chapter: 29, totalVerses: 11, firstWordOrder: 199277, lastWordOrder: 199367 },
  { stageIndex: 508, id: 'psalms-30', book: 'Psalms', chapter: 30, totalVerses: 13, firstWordOrder: 199368, lastWordOrder: 199465 },
  { stageIndex: 509, id: 'psalms-31', book: 'Psalms', chapter: 31, totalVerses: 25, firstWordOrder: 199466, lastWordOrder: 199685 },
  { stageIndex: 510, id: 'psalms-32', book: 'Psalms', chapter: 32, totalVerses: 11, firstWordOrder: 199686, lastWordOrder: 199795 },
  { stageIndex: 511, id: 'psalms-33', book: 'Psalms', chapter: 33, totalVerses: 22, firstWordOrder: 199796, lastWordOrder: 199956 },
  { stageIndex: 512, id: 'psalms-34', book: 'Psalms', chapter: 34, totalVerses: 23, firstWordOrder: 199957, lastWordOrder: 200121 },
  { stageIndex: 513, id: 'psalms-35', book: 'Psalms', chapter: 35, totalVerses: 28, firstWordOrder: 200122, lastWordOrder: 200350 },
  { stageIndex: 514, id: 'psalms-36', book: 'Psalms', chapter: 36, totalVerses: 13, firstWordOrder: 200351, lastWordOrder: 200450 },
  { stageIndex: 515, id: 'psalms-37', book: 'Psalms', chapter: 37, totalVerses: 40, firstWordOrder: 200451, lastWordOrder: 200748 },
  { stageIndex: 516, id: 'psalms-38', book: 'Psalms', chapter: 38, totalVerses: 23, firstWordOrder: 200749, lastWordOrder: 200917 },
  { stageIndex: 517, id: 'psalms-39', book: 'Psalms', chapter: 39, totalVerses: 14, firstWordOrder: 200918, lastWordOrder: 201047 },
  { stageIndex: 518, id: 'psalms-40', book: 'Psalms', chapter: 40, totalVerses: 18, firstWordOrder: 201048, lastWordOrder: 201232 },
  { stageIndex: 519, id: 'psalms-41', book: 'Psalms', chapter: 41, totalVerses: 14, firstWordOrder: 201233, lastWordOrder: 201352 },
  { stageIndex: 520, id: 'psalms-42', book: 'Psalms', chapter: 42, totalVerses: 12, firstWordOrder: 201353, lastWordOrder: 201485 },
  { stageIndex: 521, id: 'psalms-43', book: 'Psalms', chapter: 43, totalVerses: 5, firstWordOrder: 201486, lastWordOrder: 201544 },
  { stageIndex: 522, id: 'psalms-44', book: 'Psalms', chapter: 44, totalVerses: 27, firstWordOrder: 201545, lastWordOrder: 201742 },
  { stageIndex: 523, id: 'psalms-45', book: 'Psalms', chapter: 45, totalVerses: 18, firstWordOrder: 201743, lastWordOrder: 201902 },
  { stageIndex: 524, id: 'psalms-46', book: 'Psalms', chapter: 46, totalVerses: 12, firstWordOrder: 201903, lastWordOrder: 202002 },
  { stageIndex: 525, id: 'psalms-47', book: 'Psalms', chapter: 47, totalVerses: 10, firstWordOrder: 202003, lastWordOrder: 202079 },
  { stageIndex: 526, id: 'psalms-48', book: 'Psalms', chapter: 48, totalVerses: 15, firstWordOrder: 202080, lastWordOrder: 202190 },
  { stageIndex: 527, id: 'psalms-49', book: 'Psalms', chapter: 49, totalVerses: 21, firstWordOrder: 202191, lastWordOrder: 202358 },
  { stageIndex: 528, id: 'psalms-50', book: 'Psalms', chapter: 50, totalVerses: 23, firstWordOrder: 202359, lastWordOrder: 202536 },
  { stageIndex: 529, id: 'psalms-51', book: 'Psalms', chapter: 51, totalVerses: 21, firstWordOrder: 202537, lastWordOrder: 202690 },
  { stageIndex: 530, id: 'psalms-52', book: 'Psalms', chapter: 52, totalVerses: 11, firstWordOrder: 202691, lastWordOrder: 202780 },
  { stageIndex: 531, id: 'psalms-53', book: 'Psalms', chapter: 53, totalVerses: 7, firstWordOrder: 202781, lastWordOrder: 202857 },
  { stageIndex: 532, id: 'psalms-54', book: 'Psalms', chapter: 54, totalVerses: 9, firstWordOrder: 202858, lastWordOrder: 202920 },
  { stageIndex: 533, id: 'psalms-55', book: 'Psalms', chapter: 55, totalVerses: 24, firstWordOrder: 202921, lastWordOrder: 203114 },
  { stageIndex: 534, id: 'psalms-56', book: 'Psalms', chapter: 56, totalVerses: 14, firstWordOrder: 203115, lastWordOrder: 203235 },
  { stageIndex: 535, id: 'psalms-57', book: 'Psalms', chapter: 57, totalVerses: 12, firstWordOrder: 203236, lastWordOrder: 203341 },
  { stageIndex: 536, id: 'psalms-58', book: 'Psalms', chapter: 58, totalVerses: 12, firstWordOrder: 203342, lastWordOrder: 203442 },
  { stageIndex: 537, id: 'psalms-59', book: 'Psalms', chapter: 59, totalVerses: 18, firstWordOrder: 203443, lastWordOrder: 203600 },
  { stageIndex: 538, id: 'psalms-60', book: 'Psalms', chapter: 60, totalVerses: 14, firstWordOrder: 203601, lastWordOrder: 203714 },
  { stageIndex: 539, id: 'psalms-61', book: 'Psalms', chapter: 61, totalVerses: 9, firstWordOrder: 203715, lastWordOrder: 203782 },
  { stageIndex: 540, id: 'psalms-62', book: 'Psalms', chapter: 62, totalVerses: 13, firstWordOrder: 203783, lastWordOrder: 203899 },
  { stageIndex: 541, id: 'psalms-63', book: 'Psalms', chapter: 63, totalVerses: 12, firstWordOrder: 203900, lastWordOrder: 203992 },
  { stageIndex: 542, id: 'psalms-64', book: 'Psalms', chapter: 64, totalVerses: 11, firstWordOrder: 203993, lastWordOrder: 204074 },
  { stageIndex: 543, id: 'psalms-65', book: 'Psalms', chapter: 65, totalVerses: 14, firstWordOrder: 204075, lastWordOrder: 204183 },
  { stageIndex: 544, id: 'psalms-66', book: 'Psalms', chapter: 66, totalVerses: 20, firstWordOrder: 204184, lastWordOrder: 204338 },
  { stageIndex: 545, id: 'psalms-67', book: 'Psalms', chapter: 67, totalVerses: 8, firstWordOrder: 204339, lastWordOrder: 204391 },
  { stageIndex: 546, id: 'psalms-68', book: 'Psalms', chapter: 68, totalVerses: 36, firstWordOrder: 204392, lastWordOrder: 204701 },
  { stageIndex: 547, id: 'psalms-69', book: 'Psalms', chapter: 69, totalVerses: 37, firstWordOrder: 204702, lastWordOrder: 204992 },
  { stageIndex: 548, id: 'psalms-70', book: 'Psalms', chapter: 70, totalVerses: 6, firstWordOrder: 204993, lastWordOrder: 205039 },
  { stageIndex: 549, id: 'psalms-71', book: 'Psalms', chapter: 71, totalVerses: 24, firstWordOrder: 205040, lastWordOrder: 205245 },
  { stageIndex: 550, id: 'psalms-72', book: 'Psalms', chapter: 72, totalVerses: 20, firstWordOrder: 205246, lastWordOrder: 205408 },
  { stageIndex: 551, id: 'psalms-73', book: 'Psalms', chapter: 73, totalVerses: 28, firstWordOrder: 205409, lastWordOrder: 205605 },
  { stageIndex: 552, id: 'psalms-74', book: 'Psalms', chapter: 74, totalVerses: 23, firstWordOrder: 205606, lastWordOrder: 205802 },
  { stageIndex: 553, id: 'psalms-75', book: 'Psalms', chapter: 75, totalVerses: 11, firstWordOrder: 205803, lastWordOrder: 205889 },
  { stageIndex: 554, id: 'psalms-76', book: 'Psalms', chapter: 76, totalVerses: 13, firstWordOrder: 205890, lastWordOrder: 205979 },
  { stageIndex: 555, id: 'psalms-77', book: 'Psalms', chapter: 77, totalVerses: 21, firstWordOrder: 205980, lastWordOrder: 206136 },
  { stageIndex: 556, id: 'psalms-78', book: 'Psalms', chapter: 78, totalVerses: 72, firstWordOrder: 206137, lastWordOrder: 206666 },
  { stageIndex: 557, id: 'psalms-79', book: 'Psalms', chapter: 79, totalVerses: 13, firstWordOrder: 206667, lastWordOrder: 206799 },
  { stageIndex: 558, id: 'psalms-80', book: 'Psalms', chapter: 80, totalVerses: 20, firstWordOrder: 206800, lastWordOrder: 206940 },
  { stageIndex: 559, id: 'psalms-81', book: 'Psalms', chapter: 81, totalVerses: 17, firstWordOrder: 206941, lastWordOrder: 207065 },
  { stageIndex: 560, id: 'psalms-82', book: 'Psalms', chapter: 82, totalVerses: 8, firstWordOrder: 207066, lastWordOrder: 207126 },
  { stageIndex: 561, id: 'psalms-83', book: 'Psalms', chapter: 83, totalVerses: 19, firstWordOrder: 207127, lastWordOrder: 207256 },
  { stageIndex: 562, id: 'psalms-84', book: 'Psalms', chapter: 84, totalVerses: 13, firstWordOrder: 207257, lastWordOrder: 207372 },
  { stageIndex: 563, id: 'psalms-85', book: 'Psalms', chapter: 85, totalVerses: 14, firstWordOrder: 207373, lastWordOrder: 207469 },
  { stageIndex: 564, id: 'psalms-86', book: 'Psalms', chapter: 86, totalVerses: 17, firstWordOrder: 207470, lastWordOrder: 207616 },
  { stageIndex: 565, id: 'psalms-87', book: 'Psalms', chapter: 87, totalVerses: 7, firstWordOrder: 207617, lastWordOrder: 207670 },
  { stageIndex: 566, id: 'psalms-88', book: 'Psalms', chapter: 88, totalVerses: 19, firstWordOrder: 207671, lastWordOrder: 207812 },
  { stageIndex: 567, id: 'psalms-89', book: 'Psalms', chapter: 89, totalVerses: 53, firstWordOrder: 207813, lastWordOrder: 208198 },
  { stageIndex: 568, id: 'psalms-90', book: 'Psalms', chapter: 90, totalVerses: 17, firstWordOrder: 208199, lastWordOrder: 208339 },
  { stageIndex: 569, id: 'psalms-91', book: 'Psalms', chapter: 91, totalVerses: 16, firstWordOrder: 208340, lastWordOrder: 208451 },
  { stageIndex: 570, id: 'psalms-92', book: 'Psalms', chapter: 92, totalVerses: 16, firstWordOrder: 208452, lastWordOrder: 208564 },
  { stageIndex: 571, id: 'psalms-93', book: 'Psalms', chapter: 93, totalVerses: 5, firstWordOrder: 208565, lastWordOrder: 208609 },
  { stageIndex: 572, id: 'psalms-94', book: 'Psalms', chapter: 94, totalVerses: 23, firstWordOrder: 208610, lastWordOrder: 208778 },
  { stageIndex: 573, id: 'psalms-95', book: 'Psalms', chapter: 95, totalVerses: 11, firstWordOrder: 208779, lastWordOrder: 208867 },
  { stageIndex: 574, id: 'psalms-96', book: 'Psalms', chapter: 96, totalVerses: 13, firstWordOrder: 208868, lastWordOrder: 208979 },
  { stageIndex: 575, id: 'psalms-97', book: 'Psalms', chapter: 97, totalVerses: 12, firstWordOrder: 208980, lastWordOrder: 209074 },
  { stageIndex: 576, id: 'psalms-98', book: 'Psalms', chapter: 98, totalVerses: 9, firstWordOrder: 209075, lastWordOrder: 209149 },
  { stageIndex: 577, id: 'psalms-99', book: 'Psalms', chapter: 99, totalVerses: 9, firstWordOrder: 209150, lastWordOrder: 209232 },
  { stageIndex: 578, id: 'psalms-100', book: 'Psalms', chapter: 100, totalVerses: 5, firstWordOrder: 209233, lastWordOrder: 209276 },
  { stageIndex: 579, id: 'psalms-101', book: 'Psalms', chapter: 101, totalVerses: 8, firstWordOrder: 209277, lastWordOrder: 209360 },
  { stageIndex: 580, id: 'psalms-102', book: 'Psalms', chapter: 102, totalVerses: 29, firstWordOrder: 209361, lastWordOrder: 209574 },
  { stageIndex: 581, id: 'psalms-103', book: 'Psalms', chapter: 103, totalVerses: 22, firstWordOrder: 209575, lastWordOrder: 209741 },
  { stageIndex: 582, id: 'psalms-104', book: 'Psalms', chapter: 104, totalVerses: 35, firstWordOrder: 209742, lastWordOrder: 210012 },
  { stageIndex: 583, id: 'psalms-105', book: 'Psalms', chapter: 105, totalVerses: 45, firstWordOrder: 210013, lastWordOrder: 210308 },
  { stageIndex: 584, id: 'psalms-106', book: 'Psalms', chapter: 106, totalVerses: 48, firstWordOrder: 210309, lastWordOrder: 210640 },
  { stageIndex: 585, id: 'psalms-107', book: 'Psalms', chapter: 107, totalVerses: 43, firstWordOrder: 210641, lastWordOrder: 210918 },
  { stageIndex: 586, id: 'psalms-108', book: 'Psalms', chapter: 108, totalVerses: 14, firstWordOrder: 210919, lastWordOrder: 211017 },
  { stageIndex: 587, id: 'psalms-109', book: 'Psalms', chapter: 109, totalVerses: 31, firstWordOrder: 211018, lastWordOrder: 211244 },
  { stageIndex: 588, id: 'psalms-110', book: 'Psalms', chapter: 110, totalVerses: 7, firstWordOrder: 211245, lastWordOrder: 211309 },
  { stageIndex: 589, id: 'psalms-111', book: 'Psalms', chapter: 111, totalVerses: 10, firstWordOrder: 211310, lastWordOrder: 211383 },
  { stageIndex: 590, id: 'psalms-112', book: 'Psalms', chapter: 112, totalVerses: 10, firstWordOrder: 211384, lastWordOrder: 211462 },
  { stageIndex: 591, id: 'psalms-113', book: 'Psalms', chapter: 113, totalVerses: 9, firstWordOrder: 211463, lastWordOrder: 211522 },
  { stageIndex: 592, id: 'psalms-114', book: 'Psalms', chapter: 114, totalVerses: 8, firstWordOrder: 211523, lastWordOrder: 211574 },
  { stageIndex: 593, id: 'psalms-115', book: 'Psalms', chapter: 115, totalVerses: 18, firstWordOrder: 211575, lastWordOrder: 211709 },
  { stageIndex: 594, id: 'psalms-116', book: 'Psalms', chapter: 116, totalVerses: 19, firstWordOrder: 211710, lastWordOrder: 211840 },
  { stageIndex: 595, id: 'psalms-117', book: 'Psalms', chapter: 117, totalVerses: 2, firstWordOrder: 211841, lastWordOrder: 211857 },
  { stageIndex: 596, id: 'psalms-118', book: 'Psalms', chapter: 118, totalVerses: 29, firstWordOrder: 211858, lastWordOrder: 212055 },
  { stageIndex: 597, id: 'psalms-119', book: 'Psalms', chapter: 119, totalVerses: 176, firstWordOrder: 212056, lastWordOrder: 213122 },
  { stageIndex: 598, id: 'psalms-120', book: 'Psalms', chapter: 120, totalVerses: 7, firstWordOrder: 213123, lastWordOrder: 213173 },
  { stageIndex: 599, id: 'psalms-121', book: 'Psalms', chapter: 121, totalVerses: 8, firstWordOrder: 213174, lastWordOrder: 213229 },
  { stageIndex: 600, id: 'psalms-122', book: 'Psalms', chapter: 122, totalVerses: 9, firstWordOrder: 213230, lastWordOrder: 213291 },
  { stageIndex: 601, id: 'psalms-123', book: 'Psalms', chapter: 123, totalVerses: 4, firstWordOrder: 213292, lastWordOrder: 213332 },
  { stageIndex: 602, id: 'psalms-124', book: 'Psalms', chapter: 124, totalVerses: 8, firstWordOrder: 213333, lastWordOrder: 213389 },
  { stageIndex: 603, id: 'psalms-125', book: 'Psalms', chapter: 125, totalVerses: 5, firstWordOrder: 213390, lastWordOrder: 213438 },
  { stageIndex: 604, id: 'psalms-126', book: 'Psalms', chapter: 126, totalVerses: 6, firstWordOrder: 213439, lastWordOrder: 213489 },
  { stageIndex: 605, id: 'psalms-127', book: 'Psalms', chapter: 127, totalVerses: 5, firstWordOrder: 213490, lastWordOrder: 213549 },
  { stageIndex: 606, id: 'psalms-128', book: 'Psalms', chapter: 128, totalVerses: 6, firstWordOrder: 213550, lastWordOrder: 213596 },
  { stageIndex: 607, id: 'psalms-129', book: 'Psalms', chapter: 129, totalVerses: 8, firstWordOrder: 213597, lastWordOrder: 213651 },
  { stageIndex: 608, id: 'psalms-130', book: 'Psalms', chapter: 130, totalVerses: 8, firstWordOrder: 213652, lastWordOrder: 213705 },
  { stageIndex: 609, id: 'psalms-131', book: 'Psalms', chapter: 131, totalVerses: 3, firstWordOrder: 213706, lastWordOrder: 213738 },
  { stageIndex: 610, id: 'psalms-132', book: 'Psalms', chapter: 132, totalVerses: 18, firstWordOrder: 213739, lastWordOrder: 213869 },
  { stageIndex: 611, id: 'psalms-133', book: 'Psalms', chapter: 133, totalVerses: 3, firstWordOrder: 213870, lastWordOrder: 213909 },
  { stageIndex: 612, id: 'psalms-134', book: 'Psalms', chapter: 134, totalVerses: 3, firstWordOrder: 213910, lastWordOrder: 213934 },
  { stageIndex: 613, id: 'psalms-135', book: 'Psalms', chapter: 135, totalVerses: 21, firstWordOrder: 213935, lastWordOrder: 214101 },
  { stageIndex: 614, id: 'psalms-136', book: 'Psalms', chapter: 136, totalVerses: 26, firstWordOrder: 214102, lastWordOrder: 214267 },
  { stageIndex: 615, id: 'psalms-137', book: 'Psalms', chapter: 137, totalVerses: 9, firstWordOrder: 214268, lastWordOrder: 214351 },
  { stageIndex: 616, id: 'psalms-138', book: 'Psalms', chapter: 138, totalVerses: 8, firstWordOrder: 214352, lastWordOrder: 214427 },
  { stageIndex: 617, id: 'psalms-139', book: 'Psalms', chapter: 139, totalVerses: 24, firstWordOrder: 214428, lastWordOrder: 214606 },
  { stageIndex: 618, id: 'psalms-140', book: 'Psalms', chapter: 140, totalVerses: 14, firstWordOrder: 214607, lastWordOrder: 214725 },
  { stageIndex: 619, id: 'psalms-141', book: 'Psalms', chapter: 141, totalVerses: 10, firstWordOrder: 214726, lastWordOrder: 214820 },
  { stageIndex: 620, id: 'psalms-142', book: 'Psalms', chapter: 142, totalVerses: 8, firstWordOrder: 214821, lastWordOrder: 214895 },
  { stageIndex: 621, id: 'psalms-143', book: 'Psalms', chapter: 143, totalVerses: 12, firstWordOrder: 214896, lastWordOrder: 215012 },
  { stageIndex: 622, id: 'psalms-144', book: 'Psalms', chapter: 144, totalVerses: 15, firstWordOrder: 215013, lastWordOrder: 215142 },
  { stageIndex: 623, id: 'psalms-145', book: 'Psalms', chapter: 145, totalVerses: 21, firstWordOrder: 215143, lastWordOrder: 215295 },
  { stageIndex: 624, id: 'psalms-146', book: 'Psalms', chapter: 146, totalVerses: 10, firstWordOrder: 215296, lastWordOrder: 215380 },
  { stageIndex: 625, id: 'psalms-147', book: 'Psalms', chapter: 147, totalVerses: 20, firstWordOrder: 215381, lastWordOrder: 215522 },
  { stageIndex: 626, id: 'psalms-148', book: 'Psalms', chapter: 148, totalVerses: 14, firstWordOrder: 215523, lastWordOrder: 215634 },
  { stageIndex: 627, id: 'psalms-149', book: 'Psalms', chapter: 149, totalVerses: 9, firstWordOrder: 215635, lastWordOrder: 215698 },
  { stageIndex: 628, id: 'psalms-150', book: 'Psalms', chapter: 150, totalVerses: 6, firstWordOrder: 215699, lastWordOrder: 215735 },
  { stageIndex: 629, id: 'proverbs-1', book: 'Proverbs', chapter: 1, totalVerses: 33, firstWordOrder: 215736, lastWordOrder: 215973 },
  { stageIndex: 630, id: 'proverbs-2', book: 'Proverbs', chapter: 2, totalVerses: 22, firstWordOrder: 215974, lastWordOrder: 216118 },
  { stageIndex: 631, id: 'proverbs-3', book: 'Proverbs', chapter: 3, totalVerses: 35, firstWordOrder: 216119, lastWordOrder: 216381 },
  { stageIndex: 632, id: 'proverbs-4', book: 'Proverbs', chapter: 4, totalVerses: 27, firstWordOrder: 216382, lastWordOrder: 216582 },
  { stageIndex: 633, id: 'proverbs-5', book: 'Proverbs', chapter: 5, totalVerses: 23, firstWordOrder: 216583, lastWordOrder: 216742 },
  { stageIndex: 634, id: 'proverbs-6', book: 'Proverbs', chapter: 6, totalVerses: 35, firstWordOrder: 216743, lastWordOrder: 217015 },
  { stageIndex: 635, id: 'proverbs-7', book: 'Proverbs', chapter: 7, totalVerses: 27, firstWordOrder: 217016, lastWordOrder: 217208 },
  { stageIndex: 636, id: 'proverbs-8', book: 'Proverbs', chapter: 8, totalVerses: 36, firstWordOrder: 217209, lastWordOrder: 217468 },
  { stageIndex: 637, id: 'proverbs-9', book: 'Proverbs', chapter: 9, totalVerses: 18, firstWordOrder: 217469, lastWordOrder: 217595 },
  { stageIndex: 638, id: 'proverbs-10', book: 'Proverbs', chapter: 10, totalVerses: 32, firstWordOrder: 217596, lastWordOrder: 217829 },
  { stageIndex: 639, id: 'proverbs-11', book: 'Proverbs', chapter: 11, totalVerses: 31, firstWordOrder: 217830, lastWordOrder: 218053 },
  { stageIndex: 640, id: 'proverbs-12', book: 'Proverbs', chapter: 12, totalVerses: 28, firstWordOrder: 218054, lastWordOrder: 218256 },
  { stageIndex: 641, id: 'proverbs-13', book: 'Proverbs', chapter: 13, totalVerses: 25, firstWordOrder: 218257, lastWordOrder: 218441 },
  { stageIndex: 642, id: 'proverbs-14', book: 'Proverbs', chapter: 14, totalVerses: 35, firstWordOrder: 218442, lastWordOrder: 218690 },
  { stageIndex: 643, id: 'proverbs-15', book: 'Proverbs', chapter: 15, totalVerses: 33, firstWordOrder: 218691, lastWordOrder: 218943 },
  { stageIndex: 644, id: 'proverbs-16', book: 'Proverbs', chapter: 16, totalVerses: 33, firstWordOrder: 218944, lastWordOrder: 219197 },
  { stageIndex: 645, id: 'proverbs-17', book: 'Proverbs', chapter: 17, totalVerses: 28, firstWordOrder: 219198, lastWordOrder: 219426 },
  { stageIndex: 646, id: 'proverbs-18', book: 'Proverbs', chapter: 18, totalVerses: 24, firstWordOrder: 219427, lastWordOrder: 219603 },
  { stageIndex: 647, id: 'proverbs-19', book: 'Proverbs', chapter: 19, totalVerses: 29, firstWordOrder: 219604, lastWordOrder: 219836 },
  { stageIndex: 648, id: 'proverbs-20', book: 'Proverbs', chapter: 20, totalVerses: 30, firstWordOrder: 219837, lastWordOrder: 220067 },
  { stageIndex: 649, id: 'proverbs-21', book: 'Proverbs', chapter: 21, totalVerses: 31, firstWordOrder: 220068, lastWordOrder: 220303 },
  { stageIndex: 650, id: 'proverbs-22', book: 'Proverbs', chapter: 22, totalVerses: 29, firstWordOrder: 220304, lastWordOrder: 220534 },
  { stageIndex: 651, id: 'proverbs-23', book: 'Proverbs', chapter: 23, totalVerses: 35, firstWordOrder: 220535, lastWordOrder: 220818 },
  { stageIndex: 652, id: 'proverbs-24', book: 'Proverbs', chapter: 24, totalVerses: 34, firstWordOrder: 220819, lastWordOrder: 221089 },
  { stageIndex: 653, id: 'proverbs-25', book: 'Proverbs', chapter: 25, totalVerses: 28, firstWordOrder: 221090, lastWordOrder: 221329 },
  { stageIndex: 654, id: 'proverbs-26', book: 'Proverbs', chapter: 26, totalVerses: 28, firstWordOrder: 221330, lastWordOrder: 221543 },
  { stageIndex: 655, id: 'proverbs-27', book: 'Proverbs', chapter: 27, totalVerses: 27, firstWordOrder: 221544, lastWordOrder: 221759 },
  { stageIndex: 656, id: 'proverbs-28', book: 'Proverbs', chapter: 28, totalVerses: 28, firstWordOrder: 221760, lastWordOrder: 221990 },
  { stageIndex: 657, id: 'proverbs-29', book: 'Proverbs', chapter: 29, totalVerses: 27, firstWordOrder: 221991, lastWordOrder: 222194 },
  { stageIndex: 658, id: 'proverbs-30', book: 'Proverbs', chapter: 30, totalVerses: 33, firstWordOrder: 222195, lastWordOrder: 222497 },
  { stageIndex: 659, id: 'proverbs-31', book: 'Proverbs', chapter: 31, totalVerses: 31, firstWordOrder: 222498, lastWordOrder: 222719 },
  { stageIndex: 660, id: 'ecclesiastes-1', book: 'Ecclesiastes', chapter: 1, totalVerses: 18, firstWordOrder: 222720, lastWordOrder: 222934 },
  { stageIndex: 661, id: 'ecclesiastes-2', book: 'Ecclesiastes', chapter: 2, totalVerses: 26, firstWordOrder: 222935, lastWordOrder: 223315 },
  { stageIndex: 662, id: 'ecclesiastes-3', book: 'Ecclesiastes', chapter: 3, totalVerses: 22, firstWordOrder: 223316, lastWordOrder: 223588 },
  { stageIndex: 663, id: 'ecclesiastes-4', book: 'Ecclesiastes', chapter: 4, totalVerses: 17, firstWordOrder: 223589, lastWordOrder: 223827 },
  { stageIndex: 664, id: 'ecclesiastes-5', book: 'Ecclesiastes', chapter: 5, totalVerses: 19, firstWordOrder: 223828, lastWordOrder: 224096 },
  { stageIndex: 665, id: 'ecclesiastes-6', book: 'Ecclesiastes', chapter: 6, totalVerses: 12, firstWordOrder: 224097, lastWordOrder: 224267 },
  { stageIndex: 666, id: 'ecclesiastes-7', book: 'Ecclesiastes', chapter: 7, totalVerses: 29, firstWordOrder: 224268, lastWordOrder: 224598 },
  { stageIndex: 667, id: 'ecclesiastes-8', book: 'Ecclesiastes', chapter: 8, totalVerses: 17, firstWordOrder: 224599, lastWordOrder: 224879 },
  { stageIndex: 668, id: 'ecclesiastes-9', book: 'Ecclesiastes', chapter: 9, totalVerses: 18, firstWordOrder: 224880, lastWordOrder: 225189 },
  { stageIndex: 669, id: 'ecclesiastes-10', book: 'Ecclesiastes', chapter: 10, totalVerses: 20, firstWordOrder: 225190, lastWordOrder: 225388 },
  { stageIndex: 670, id: 'ecclesiastes-11', book: 'Ecclesiastes', chapter: 11, totalVerses: 10, firstWordOrder: 225389, lastWordOrder: 225531 },
  { stageIndex: 671, id: 'ecclesiastes-12', book: 'Ecclesiastes', chapter: 12, totalVerses: 14, firstWordOrder: 225532, lastWordOrder: 225718 },
  { stageIndex: 672, id: 'song-1', book: 'Song', chapter: 1, totalVerses: 17, firstWordOrder: 225719, lastWordOrder: 225869 },
  { stageIndex: 673, id: 'song-2', book: 'Song', chapter: 2, totalVerses: 17, firstWordOrder: 225870, lastWordOrder: 226048 },
  { stageIndex: 674, id: 'song-3', book: 'Song', chapter: 3, totalVerses: 11, firstWordOrder: 226049, lastWordOrder: 226181 },
  { stageIndex: 675, id: 'song-4', book: 'Song', chapter: 4, totalVerses: 16, firstWordOrder: 226182, lastWordOrder: 226360 },
  { stageIndex: 676, id: 'song-5', book: 'Song', chapter: 5, totalVerses: 16, firstWordOrder: 226361, lastWordOrder: 226545 },
  { stageIndex: 677, id: 'song-6', book: 'Song', chapter: 6, totalVerses: 12, firstWordOrder: 226546, lastWordOrder: 226659 },
  { stageIndex: 678, id: 'song-7', book: 'Song', chapter: 7, totalVerses: 14, firstWordOrder: 226660, lastWordOrder: 226798 },
  { stageIndex: 679, id: 'song-8', book: 'Song', chapter: 8, totalVerses: 14, firstWordOrder: 226799, lastWordOrder: 226973 },
  { stageIndex: 680, id: 'isaiah-1', book: 'Isaiah', chapter: 1, totalVerses: 31, firstWordOrder: 226974, lastWordOrder: 227333 },
  { stageIndex: 681, id: 'isaiah-2', book: 'Isaiah', chapter: 2, totalVerses: 22, firstWordOrder: 227334, lastWordOrder: 227586 },
  { stageIndex: 682, id: 'isaiah-3', book: 'Isaiah', chapter: 3, totalVerses: 26, firstWordOrder: 227587, lastWordOrder: 227838 },
  { stageIndex: 683, id: 'isaiah-4', book: 'Isaiah', chapter: 4, totalVerses: 6, firstWordOrder: 227839, lastWordOrder: 227927 },
  { stageIndex: 684, id: 'isaiah-5', book: 'Isaiah', chapter: 5, totalVerses: 30, firstWordOrder: 227928, lastWordOrder: 228312 },
  { stageIndex: 685, id: 'isaiah-6', book: 'Isaiah', chapter: 6, totalVerses: 13, firstWordOrder: 228313, lastWordOrder: 228500 },
  { stageIndex: 686, id: 'isaiah-7', book: 'Isaiah', chapter: 7, totalVerses: 25, firstWordOrder: 228501, lastWordOrder: 228845 },
  { stageIndex: 687, id: 'isaiah-8', book: 'Isaiah', chapter: 8, totalVerses: 23, firstWordOrder: 228846, lastWordOrder: 229144 },
  { stageIndex: 688, id: 'isaiah-9', book: 'Isaiah', chapter: 9, totalVerses: 20, firstWordOrder: 229145, lastWordOrder: 229413 },
  { stageIndex: 689, id: 'isaiah-10', book: 'Isaiah', chapter: 10, totalVerses: 34, firstWordOrder: 229414, lastWordOrder: 229822 },
  { stageIndex: 690, id: 'isaiah-11', book: 'Isaiah', chapter: 11, totalVerses: 16, firstWordOrder: 229823, lastWordOrder: 230041 },
  { stageIndex: 691, id: 'isaiah-12', book: 'Isaiah', chapter: 12, totalVerses: 6, firstWordOrder: 230042, lastWordOrder: 230104 },
  { stageIndex: 692, id: 'isaiah-13', book: 'Isaiah', chapter: 13, totalVerses: 22, firstWordOrder: 230105, lastWordOrder: 230358 },
  { stageIndex: 693, id: 'isaiah-14', book: 'Isaiah', chapter: 14, totalVerses: 32, firstWordOrder: 230359, lastWordOrder: 230734 },
  { stageIndex: 694, id: 'isaiah-15', book: 'Isaiah', chapter: 15, totalVerses: 9, firstWordOrder: 230735, lastWordOrder: 230859 },
  { stageIndex: 695, id: 'isaiah-16', book: 'Isaiah', chapter: 16, totalVerses: 14, firstWordOrder: 230860, lastWordOrder: 231052 },
  { stageIndex: 696, id: 'isaiah-17', book: 'Isaiah', chapter: 17, totalVerses: 14, firstWordOrder: 231053, lastWordOrder: 231231 },
  { stageIndex: 697, id: 'isaiah-18', book: 'Isaiah', chapter: 18, totalVerses: 7, firstWordOrder: 231232, lastWordOrder: 231356 },
  { stageIndex: 698, id: 'isaiah-19', book: 'Isaiah', chapter: 19, totalVerses: 25, firstWordOrder: 231357, lastWordOrder: 231683 },
  { stageIndex: 699, id: 'isaiah-20', book: 'Isaiah', chapter: 20, totalVerses: 6, firstWordOrder: 231684, lastWordOrder: 231779 },
  { stageIndex: 700, id: 'isaiah-21', book: 'Isaiah', chapter: 21, totalVerses: 17, firstWordOrder: 231780, lastWordOrder: 231981 },
  { stageIndex: 701, id: 'isaiah-22', book: 'Isaiah', chapter: 22, totalVerses: 25, firstWordOrder: 231982, lastWordOrder: 232289 },
  { stageIndex: 702, id: 'isaiah-23', book: 'Isaiah', chapter: 23, totalVerses: 18, firstWordOrder: 232290, lastWordOrder: 232508 },
  { stageIndex: 703, id: 'isaiah-24', book: 'Isaiah', chapter: 24, totalVerses: 23, firstWordOrder: 232509, lastWordOrder: 232764 },
  { stageIndex: 704, id: 'isaiah-25', book: 'Isaiah', chapter: 25, totalVerses: 12, firstWordOrder: 232765, lastWordOrder: 232926 },
  { stageIndex: 705, id: 'isaiah-26', book: 'Isaiah', chapter: 26, totalVerses: 21, firstWordOrder: 232927, lastWordOrder: 233161 },
  { stageIndex: 706, id: 'isaiah-27', book: 'Isaiah', chapter: 27, totalVerses: 13, firstWordOrder: 233162, lastWordOrder: 233335 },
  { stageIndex: 707, id: 'isaiah-28', book: 'Isaiah', chapter: 28, totalVerses: 29, firstWordOrder: 233336, lastWordOrder: 233717 },
  { stageIndex: 708, id: 'isaiah-29', book: 'Isaiah', chapter: 29, totalVerses: 24, firstWordOrder: 233718, lastWordOrder: 234044 },
  { stageIndex: 709, id: 'isaiah-30', book: 'Isaiah', chapter: 30, totalVerses: 33, firstWordOrder: 234045, lastWordOrder: 234539 },
  { stageIndex: 710, id: 'isaiah-31', book: 'Isaiah', chapter: 31, totalVerses: 9, firstWordOrder: 234540, lastWordOrder: 234695 },
  { stageIndex: 711, id: 'isaiah-32', book: 'Isaiah', chapter: 32, totalVerses: 20, firstWordOrder: 234696, lastWordOrder: 234900 },
  { stageIndex: 712, id: 'isaiah-33', book: 'Isaiah', chapter: 33, totalVerses: 24, firstWordOrder: 234901, lastWordOrder: 235175 },
  { stageIndex: 713, id: 'isaiah-34', book: 'Isaiah', chapter: 34, totalVerses: 17, firstWordOrder: 235176, lastWordOrder: 235395 },
  { stageIndex: 714, id: 'isaiah-35', book: 'Isaiah', chapter: 35, totalVerses: 10, firstWordOrder: 235396, lastWordOrder: 235521 },
  { stageIndex: 715, id: 'isaiah-36', book: 'Isaiah', chapter: 36, totalVerses: 22, firstWordOrder: 235522, lastWordOrder: 235909 },
  { stageIndex: 716, id: 'isaiah-37', book: 'Isaiah', chapter: 37, totalVerses: 38, firstWordOrder: 235910, lastWordOrder: 236476 },
  { stageIndex: 717, id: 'isaiah-38', book: 'Isaiah', chapter: 38, totalVerses: 22, firstWordOrder: 236477, lastWordOrder: 236757 },
  { stageIndex: 718, id: 'isaiah-39', book: 'Isaiah', chapter: 39, totalVerses: 8, firstWordOrder: 236758, lastWordOrder: 236904 },
  { stageIndex: 719, id: 'isaiah-40', book: 'Isaiah', chapter: 40, totalVerses: 31, firstWordOrder: 236905, lastWordOrder: 237261 },
  { stageIndex: 720, id: 'isaiah-41', book: 'Isaiah', chapter: 41, totalVerses: 29, firstWordOrder: 237262, lastWordOrder: 237613 },
  { stageIndex: 721, id: 'isaiah-42', book: 'Isaiah', chapter: 42, totalVerses: 25, firstWordOrder: 237614, lastWordOrder: 237903 },
  { stageIndex: 722, id: 'isaiah-43', book: 'Isaiah', chapter: 43, totalVerses: 28, firstWordOrder: 237904, lastWordOrder: 238217 },
  { stageIndex: 723, id: 'isaiah-44', book: 'Isaiah', chapter: 44, totalVerses: 28, firstWordOrder: 238218, lastWordOrder: 238609 },
  { stageIndex: 724, id: 'isaiah-45', book: 'Isaiah', chapter: 45, totalVerses: 25, firstWordOrder: 238610, lastWordOrder: 238970 },
  { stageIndex: 725, id: 'isaiah-46', book: 'Isaiah', chapter: 46, totalVerses: 13, firstWordOrder: 238971, lastWordOrder: 239121 },
  { stageIndex: 726, id: 'isaiah-47', book: 'Isaiah', chapter: 47, totalVerses: 15, firstWordOrder: 239122, lastWordOrder: 239335 },
  { stageIndex: 727, id: 'isaiah-48', book: 'Isaiah', chapter: 48, totalVerses: 22, firstWordOrder: 239336, lastWordOrder: 239600 },
  { stageIndex: 728, id: 'isaiah-49', book: 'Isaiah', chapter: 49, totalVerses: 26, firstWordOrder: 239601, lastWordOrder: 239966 },
  { stageIndex: 729, id: 'isaiah-50', book: 'Isaiah', chapter: 50, totalVerses: 11, firstWordOrder: 239967, lastWordOrder: 240142 },
  { stageIndex: 730, id: 'isaiah-51', book: 'Isaiah', chapter: 51, totalVerses: 23, firstWordOrder: 240143, lastWordOrder: 240476 },
  { stageIndex: 731, id: 'isaiah-52', book: 'Isaiah', chapter: 52, totalVerses: 15, firstWordOrder: 240477, lastWordOrder: 240682 },
  { stageIndex: 732, id: 'isaiah-53', book: 'Isaiah', chapter: 53, totalVerses: 12, firstWordOrder: 240683, lastWordOrder: 240848 },
  { stageIndex: 733, id: 'isaiah-54', book: 'Isaiah', chapter: 54, totalVerses: 17, firstWordOrder: 240849, lastWordOrder: 241070 },
  { stageIndex: 734, id: 'isaiah-55', book: 'Isaiah', chapter: 55, totalVerses: 13, firstWordOrder: 241071, lastWordOrder: 241256 },
  { stageIndex: 735, id: 'isaiah-56', book: 'Isaiah', chapter: 56, totalVerses: 12, firstWordOrder: 241257, lastWordOrder: 241436 },
  { stageIndex: 736, id: 'isaiah-57', book: 'Isaiah', chapter: 57, totalVerses: 21, firstWordOrder: 241437, lastWordOrder: 241697 },
  { stageIndex: 737, id: 'isaiah-58', book: 'Isaiah', chapter: 58, totalVerses: 14, firstWordOrder: 241698, lastWordOrder: 241919 },
  { stageIndex: 738, id: 'isaiah-59', book: 'Isaiah', chapter: 59, totalVerses: 21, firstWordOrder: 241920, lastWordOrder: 242203 },
  { stageIndex: 739, id: 'isaiah-60', book: 'Isaiah', chapter: 60, totalVerses: 22, firstWordOrder: 242204, lastWordOrder: 242499 },
  { stageIndex: 740, id: 'isaiah-61', book: 'Isaiah', chapter: 61, totalVerses: 11, firstWordOrder: 242500, lastWordOrder: 242664 },
  { stageIndex: 741, id: 'isaiah-62', book: 'Isaiah', chapter: 62, totalVerses: 12, firstWordOrder: 242665, lastWordOrder: 242843 },
  { stageIndex: 742, id: 'isaiah-63', book: 'Isaiah', chapter: 63, totalVerses: 19, firstWordOrder: 242844, lastWordOrder: 243083 },
  { stageIndex: 743, id: 'isaiah-64', book: 'Isaiah', chapter: 64, totalVerses: 11, firstWordOrder: 243084, lastWordOrder: 243211 },
  { stageIndex: 744, id: 'isaiah-65', book: 'Isaiah', chapter: 65, totalVerses: 25, firstWordOrder: 243212, lastWordOrder: 243574 },
  { stageIndex: 745, id: 'isaiah-66', book: 'Isaiah', chapter: 66, totalVerses: 24, firstWordOrder: 243575, lastWordOrder: 243961 },
  { stageIndex: 746, id: 'jeremiah-1', book: 'Jeremiah', chapter: 1, totalVerses: 19, firstWordOrder: 243962, lastWordOrder: 244228 },
  { stageIndex: 747, id: 'jeremiah-2', book: 'Jeremiah', chapter: 2, totalVerses: 37, firstWordOrder: 244229, lastWordOrder: 244747 },
  { stageIndex: 748, id: 'jeremiah-3', book: 'Jeremiah', chapter: 3, totalVerses: 25, firstWordOrder: 244748, lastWordOrder: 245163 },
  { stageIndex: 749, id: 'jeremiah-4', book: 'Jeremiah', chapter: 4, totalVerses: 31, firstWordOrder: 245164, lastWordOrder: 245589 },
  { stageIndex: 750, id: 'jeremiah-5', book: 'Jeremiah', chapter: 5, totalVerses: 31, firstWordOrder: 245590, lastWordOrder: 246022 },
  { stageIndex: 751, id: 'jeremiah-6', book: 'Jeremiah', chapter: 6, totalVerses: 30, firstWordOrder: 246023, lastWordOrder: 246443 },
  { stageIndex: 752, id: 'jeremiah-7', book: 'Jeremiah', chapter: 7, totalVerses: 34, firstWordOrder: 246444, lastWordOrder: 246983 },
  { stageIndex: 753, id: 'jeremiah-8', book: 'Jeremiah', chapter: 8, totalVerses: 23, firstWordOrder: 246984, lastWordOrder: 247334 },
  { stageIndex: 754, id: 'jeremiah-9', book: 'Jeremiah', chapter: 9, totalVerses: 25, firstWordOrder: 247335, lastWordOrder: 247710 },
  { stageIndex: 755, id: 'jeremiah-10', book: 'Jeremiah', chapter: 10, totalVerses: 25, firstWordOrder: 247711, lastWordOrder: 248031 },
  { stageIndex: 756, id: 'jeremiah-11', book: 'Jeremiah', chapter: 11, totalVerses: 23, firstWordOrder: 248032, lastWordOrder: 248415 },
  { stageIndex: 757, id: 'jeremiah-12', book: 'Jeremiah', chapter: 12, totalVerses: 17, firstWordOrder: 248416, lastWordOrder: 248677 },
  { stageIndex: 758, id: 'jeremiah-13', book: 'Jeremiah', chapter: 13, totalVerses: 27, firstWordOrder: 248678, lastWordOrder: 249057 },
  { stageIndex: 759, id: 'jeremiah-14', book: 'Jeremiah', chapter: 14, totalVerses: 22, firstWordOrder: 249058, lastWordOrder: 249416 },
  { stageIndex: 760, id: 'jeremiah-15', book: 'Jeremiah', chapter: 15, totalVerses: 21, firstWordOrder: 249417, lastWordOrder: 249735 },
  { stageIndex: 761, id: 'jeremiah-16', book: 'Jeremiah', chapter: 16, totalVerses: 21, firstWordOrder: 249736, lastWordOrder: 250103 },
  { stageIndex: 762, id: 'jeremiah-17', book: 'Jeremiah', chapter: 17, totalVerses: 27, firstWordOrder: 250104, lastWordOrder: 250512 },
  { stageIndex: 763, id: 'jeremiah-18', book: 'Jeremiah', chapter: 18, totalVerses: 23, firstWordOrder: 250513, lastWordOrder: 250835 },
  { stageIndex: 764, id: 'jeremiah-19', book: 'Jeremiah', chapter: 19, totalVerses: 15, firstWordOrder: 250836, lastWordOrder: 251120 },
  { stageIndex: 765, id: 'jeremiah-20', book: 'Jeremiah', chapter: 20, totalVerses: 18, firstWordOrder: 251121, lastWordOrder: 251414 },
  { stageIndex: 766, id: 'jeremiah-21', book: 'Jeremiah', chapter: 21, totalVerses: 14, firstWordOrder: 251415, lastWordOrder: 251664 },
  { stageIndex: 767, id: 'jeremiah-22', book: 'Jeremiah', chapter: 22, totalVerses: 30, firstWordOrder: 251665, lastWordOrder: 252136 },
  { stageIndex: 768, id: 'jeremiah-23', book: 'Jeremiah', chapter: 23, totalVerses: 40, firstWordOrder: 252137, lastWordOrder: 252745 },
  { stageIndex: 769, id: 'jeremiah-24', book: 'Jeremiah', chapter: 24, totalVerses: 10, firstWordOrder: 252746, lastWordOrder: 252931 },
  { stageIndex: 770, id: 'jeremiah-25', book: 'Jeremiah', chapter: 25, totalVerses: 38, firstWordOrder: 252932, lastWordOrder: 253548 },
  { stageIndex: 771, id: 'jeremiah-26', book: 'Jeremiah', chapter: 26, totalVerses: 24, firstWordOrder: 253549, lastWordOrder: 253983 },
  { stageIndex: 772, id: 'jeremiah-27', book: 'Jeremiah', chapter: 27, totalVerses: 22, firstWordOrder: 253984, lastWordOrder: 254403 },
  { stageIndex: 773, id: 'jeremiah-28', book: 'Jeremiah', chapter: 28, totalVerses: 17, firstWordOrder: 254404, lastWordOrder: 254708 },
  { stageIndex: 774, id: 'jeremiah-29', book: 'Jeremiah', chapter: 29, totalVerses: 32, firstWordOrder: 254709, lastWordOrder: 255248 },
  { stageIndex: 775, id: 'jeremiah-30', book: 'Jeremiah', chapter: 30, totalVerses: 24, firstWordOrder: 255249, lastWordOrder: 255590 },
  { stageIndex: 776, id: 'jeremiah-31', book: 'Jeremiah', chapter: 31, totalVerses: 40, firstWordOrder: 255591, lastWordOrder: 256215 },
  { stageIndex: 777, id: 'jeremiah-32', book: 'Jeremiah', chapter: 32, totalVerses: 44, firstWordOrder: 256216, lastWordOrder: 256966 },
  { stageIndex: 778, id: 'jeremiah-33', book: 'Jeremiah', chapter: 33, totalVerses: 26, firstWordOrder: 256967, lastWordOrder: 257386 },
  { stageIndex: 779, id: 'jeremiah-34', book: 'Jeremiah', chapter: 34, totalVerses: 22, firstWordOrder: 257387, lastWordOrder: 257813 },
  { stageIndex: 780, id: 'jeremiah-35', book: 'Jeremiah', chapter: 35, totalVerses: 19, firstWordOrder: 257814, lastWordOrder: 258181 },
  { stageIndex: 781, id: 'jeremiah-36', book: 'Jeremiah', chapter: 36, totalVerses: 32, firstWordOrder: 258182, lastWordOrder: 258799 },
  { stageIndex: 782, id: 'jeremiah-37', book: 'Jeremiah', chapter: 37, totalVerses: 21, firstWordOrder: 258800, lastWordOrder: 259132 },
  { stageIndex: 783, id: 'jeremiah-38', book: 'Jeremiah', chapter: 38, totalVerses: 28, firstWordOrder: 259133, lastWordOrder: 259682 },
  { stageIndex: 784, id: 'jeremiah-39', book: 'Jeremiah', chapter: 39, totalVerses: 18, firstWordOrder: 259683, lastWordOrder: 259986 },
  { stageIndex: 785, id: 'jeremiah-40', book: 'Jeremiah', chapter: 40, totalVerses: 16, firstWordOrder: 259987, lastWordOrder: 260354 },
  { stageIndex: 786, id: 'jeremiah-41', book: 'Jeremiah', chapter: 41, totalVerses: 18, firstWordOrder: 260355, lastWordOrder: 260716 },
  { stageIndex: 787, id: 'jeremiah-42', book: 'Jeremiah', chapter: 42, totalVerses: 22, firstWordOrder: 260717, lastWordOrder: 261126 },
  { stageIndex: 788, id: 'jeremiah-43', book: 'Jeremiah', chapter: 43, totalVerses: 13, firstWordOrder: 261127, lastWordOrder: 261365 },
  { stageIndex: 789, id: 'jeremiah-44', book: 'Jeremiah', chapter: 44, totalVerses: 30, firstWordOrder: 261366, lastWordOrder: 261988 },
  { stageIndex: 790, id: 'jeremiah-45', book: 'Jeremiah', chapter: 45, totalVerses: 5, firstWordOrder: 261989, lastWordOrder: 262081 },
  { stageIndex: 791, id: 'jeremiah-46', book: 'Jeremiah', chapter: 46, totalVerses: 28, firstWordOrder: 262082, lastWordOrder: 262484 },
  { stageIndex: 792, id: 'jeremiah-47', book: 'Jeremiah', chapter: 47, totalVerses: 7, firstWordOrder: 262485, lastWordOrder: 262591 },
  { stageIndex: 793, id: 'jeremiah-48', book: 'Jeremiah', chapter: 48, totalVerses: 47, firstWordOrder: 262592, lastWordOrder: 263181 },
  { stageIndex: 794, id: 'jeremiah-49', book: 'Jeremiah', chapter: 49, totalVerses: 39, firstWordOrder: 263182, lastWordOrder: 263771 },
  { stageIndex: 795, id: 'jeremiah-50', book: 'Jeremiah', chapter: 50, totalVerses: 46, firstWordOrder: 263772, lastWordOrder: 264472 },
  { stageIndex: 796, id: 'jeremiah-51', book: 'Jeremiah', chapter: 51, totalVerses: 64, firstWordOrder: 264473, lastWordOrder: 265368 },
  { stageIndex: 797, id: 'jeremiah-52', book: 'Jeremiah', chapter: 52, totalVerses: 34, firstWordOrder: 265369, lastWordOrder: 265937 },
  { stageIndex: 798, id: 'lamentations-1', book: 'Lamentations', chapter: 1, totalVerses: 22, firstWordOrder: 265938, lastWordOrder: 266316 },
  { stageIndex: 799, id: 'lamentations-2', book: 'Lamentations', chapter: 2, totalVerses: 22, firstWordOrder: 266317, lastWordOrder: 266700 },
  { stageIndex: 800, id: 'lamentations-3', book: 'Lamentations', chapter: 3, totalVerses: 66, firstWordOrder: 266701, lastWordOrder: 267085 },
  { stageIndex: 801, id: 'lamentations-4', book: 'Lamentations', chapter: 4, totalVerses: 22, firstWordOrder: 267086, lastWordOrder: 267350 },
  { stageIndex: 802, id: 'lamentations-5', book: 'Lamentations', chapter: 5, totalVerses: 22, firstWordOrder: 267351, lastWordOrder: 267501 },
  { stageIndex: 803, id: 'ezekiel-1', book: 'Ezekiel', chapter: 1, totalVerses: 28, firstWordOrder: 267502, lastWordOrder: 267884 },
  { stageIndex: 804, id: 'ezekiel-2', book: 'Ezekiel', chapter: 2, totalVerses: 10, firstWordOrder: 267885, lastWordOrder: 268040 },
  { stageIndex: 805, id: 'ezekiel-3', book: 'Ezekiel', chapter: 3, totalVerses: 27, firstWordOrder: 268041, lastWordOrder: 268452 },
  { stageIndex: 806, id: 'ezekiel-4', book: 'Ezekiel', chapter: 4, totalVerses: 17, firstWordOrder: 268453, lastWordOrder: 268718 },
  { stageIndex: 807, id: 'ezekiel-5', book: 'Ezekiel', chapter: 5, totalVerses: 17, firstWordOrder: 268719, lastWordOrder: 269005 },
  { stageIndex: 808, id: 'ezekiel-6', book: 'Ezekiel', chapter: 6, totalVerses: 14, firstWordOrder: 269006, lastWordOrder: 269218 },
  { stageIndex: 809, id: 'ezekiel-7', book: 'Ezekiel', chapter: 7, totalVerses: 27, firstWordOrder: 269219, lastWordOrder: 269563 },
  { stageIndex: 810, id: 'ezekiel-8', book: 'Ezekiel', chapter: 8, totalVerses: 18, firstWordOrder: 269564, lastWordOrder: 269884 },
  { stageIndex: 811, id: 'ezekiel-9', book: 'Ezekiel', chapter: 9, totalVerses: 11, firstWordOrder: 269885, lastWordOrder: 270087 },
  { stageIndex: 812, id: 'ezekiel-10', book: 'Ezekiel', chapter: 10, totalVerses: 22, firstWordOrder: 270088, lastWordOrder: 270397 },
  { stageIndex: 813, id: 'ezekiel-11', book: 'Ezekiel', chapter: 11, totalVerses: 25, firstWordOrder: 270398, lastWordOrder: 270746 },
  { stageIndex: 814, id: 'ezekiel-12', book: 'Ezekiel', chapter: 12, totalVerses: 28, firstWordOrder: 270747, lastWordOrder: 271146 },
  { stageIndex: 815, id: 'ezekiel-13', book: 'Ezekiel', chapter: 13, totalVerses: 23, firstWordOrder: 271147, lastWordOrder: 271504 },
  { stageIndex: 816, id: 'ezekiel-14', book: 'Ezekiel', chapter: 14, totalVerses: 23, firstWordOrder: 271505, lastWordOrder: 271898 },
  { stageIndex: 817, id: 'ezekiel-15', book: 'Ezekiel', chapter: 15, totalVerses: 8, firstWordOrder: 271899, lastWordOrder: 272001 },
  { stageIndex: 818, id: 'ezekiel-16', book: 'Ezekiel', chapter: 16, totalVerses: 63, firstWordOrder: 272002, lastWordOrder: 272851 },
  { stageIndex: 819, id: 'ezekiel-17', book: 'Ezekiel', chapter: 17, totalVerses: 24, firstWordOrder: 272852, lastWordOrder: 273234 },
  { stageIndex: 820, id: 'ezekiel-18', book: 'Ezekiel', chapter: 18, totalVerses: 32, firstWordOrder: 273235, lastWordOrder: 273712 },
  { stageIndex: 821, id: 'ezekiel-19', book: 'Ezekiel', chapter: 19, totalVerses: 14, firstWordOrder: 273713, lastWordOrder: 273869 },
  { stageIndex: 822, id: 'ezekiel-20', book: 'Ezekiel', chapter: 20, totalVerses: 44, firstWordOrder: 273870, lastWordOrder: 274602 },
  { stageIndex: 823, id: 'ezekiel-21', book: 'Ezekiel', chapter: 21, totalVerses: 37, firstWordOrder: 274603, lastWordOrder: 275133 },
  { stageIndex: 824, id: 'ezekiel-22', book: 'Ezekiel', chapter: 22, totalVerses: 31, firstWordOrder: 275134, lastWordOrder: 275524 },
  { stageIndex: 825, id: 'ezekiel-23', book: 'Ezekiel', chapter: 23, totalVerses: 49, firstWordOrder: 275525, lastWordOrder: 276150 },
  { stageIndex: 826, id: 'ezekiel-24', book: 'Ezekiel', chapter: 24, totalVerses: 27, firstWordOrder: 276151, lastWordOrder: 276526 },
  { stageIndex: 827, id: 'ezekiel-25', book: 'Ezekiel', chapter: 25, totalVerses: 17, firstWordOrder: 276527, lastWordOrder: 276787 },
  { stageIndex: 828, id: 'ezekiel-26', book: 'Ezekiel', chapter: 26, totalVerses: 21, firstWordOrder: 276788, lastWordOrder: 277094 },
  { stageIndex: 829, id: 'ezekiel-27', book: 'Ezekiel', chapter: 27, totalVerses: 36, firstWordOrder: 277095, lastWordOrder: 277504 },
  { stageIndex: 830, id: 'ezekiel-28', book: 'Ezekiel', chapter: 28, totalVerses: 26, firstWordOrder: 277505, lastWordOrder: 277857 },
  { stageIndex: 831, id: 'ezekiel-29', book: 'Ezekiel', chapter: 29, totalVerses: 21, firstWordOrder: 277858, lastWordOrder: 278203 },
  { stageIndex: 832, id: 'ezekiel-30', book: 'Ezekiel', chapter: 30, totalVerses: 26, firstWordOrder: 278204, lastWordOrder: 278546 },
  { stageIndex: 833, id: 'ezekiel-31', book: 'Ezekiel', chapter: 31, totalVerses: 18, firstWordOrder: 278547, lastWordOrder: 278858 },
  { stageIndex: 834, id: 'ezekiel-32', book: 'Ezekiel', chapter: 32, totalVerses: 32, firstWordOrder: 278859, lastWordOrder: 279342 },
  { stageIndex: 835, id: 'ezekiel-33', book: 'Ezekiel', chapter: 33, totalVerses: 33, firstWordOrder: 279343, lastWordOrder: 279861 },
  { stageIndex: 836, id: 'ezekiel-34', book: 'Ezekiel', chapter: 34, totalVerses: 31, firstWordOrder: 279862, lastWordOrder: 280319 },
  { stageIndex: 837, id: 'ezekiel-35', book: 'Ezekiel', chapter: 35, totalVerses: 15, firstWordOrder: 280320, lastWordOrder: 280515 },
  { stageIndex: 838, id: 'ezekiel-36', book: 'Ezekiel', chapter: 36, totalVerses: 38, firstWordOrder: 280516, lastWordOrder: 281085 },
  { stageIndex: 839, id: 'ezekiel-37', book: 'Ezekiel', chapter: 37, totalVerses: 28, firstWordOrder: 281086, lastWordOrder: 281535 },
  { stageIndex: 840, id: 'ezekiel-38', book: 'Ezekiel', chapter: 38, totalVerses: 23, firstWordOrder: 281536, lastWordOrder: 281905 },
  { stageIndex: 841, id: 'ezekiel-39', book: 'Ezekiel', chapter: 39, totalVerses: 29, firstWordOrder: 281906, lastWordOrder: 282340 },
  { stageIndex: 842, id: 'ezekiel-40', book: 'Ezekiel', chapter: 40, totalVerses: 49, firstWordOrder: 282341, lastWordOrder: 283099 },
  { stageIndex: 843, id: 'ezekiel-41', book: 'Ezekiel', chapter: 41, totalVerses: 26, firstWordOrder: 283100, lastWordOrder: 283471 },
  { stageIndex: 844, id: 'ezekiel-42', book: 'Ezekiel', chapter: 42, totalVerses: 20, firstWordOrder: 283472, lastWordOrder: 283761 },
  { stageIndex: 845, id: 'ezekiel-43', book: 'Ezekiel', chapter: 43, totalVerses: 27, firstWordOrder: 283762, lastWordOrder: 284180 },
  { stageIndex: 846, id: 'ezekiel-44', book: 'Ezekiel', chapter: 44, totalVerses: 31, firstWordOrder: 284181, lastWordOrder: 284684 },
  { stageIndex: 847, id: 'ezekiel-45', book: 'Ezekiel', chapter: 45, totalVerses: 25, firstWordOrder: 284685, lastWordOrder: 285082 },
  { stageIndex: 848, id: 'ezekiel-46', book: 'Ezekiel', chapter: 46, totalVerses: 24, firstWordOrder: 285083, lastWordOrder: 285466 },
  { stageIndex: 849, id: 'ezekiel-47', book: 'Ezekiel', chapter: 47, totalVerses: 23, firstWordOrder: 285467, lastWordOrder: 285836 },
  { stageIndex: 850, id: 'ezekiel-48', book: 'Ezekiel', chapter: 48, totalVerses: 35, firstWordOrder: 285837, lastWordOrder: 286367 },
  { stageIndex: 851, id: 'daniel-1', book: 'Daniel', chapter: 1, totalVerses: 21, firstWordOrder: 286368, lastWordOrder: 286673 },
  { stageIndex: 852, id: 'daniel-2', book: 'Daniel', chapter: 2, totalVerses: 49, firstWordOrder: 286674, lastWordOrder: 287532 },
  { stageIndex: 853, id: 'daniel-3', book: 'Daniel', chapter: 3, totalVerses: 33, firstWordOrder: 287533, lastWordOrder: 288182 },
  { stageIndex: 854, id: 'daniel-4', book: 'Daniel', chapter: 4, totalVerses: 34, firstWordOrder: 288183, lastWordOrder: 288802 },
  { stageIndex: 855, id: 'daniel-5', book: 'Daniel', chapter: 5, totalVerses: 30, firstWordOrder: 288803, lastWordOrder: 289350 },
  { stageIndex: 856, id: 'daniel-6', book: 'Daniel', chapter: 6, totalVerses: 29, firstWordOrder: 289351, lastWordOrder: 289908 },
  { stageIndex: 857, id: 'daniel-7', book: 'Daniel', chapter: 7, totalVerses: 28, firstWordOrder: 289909, lastWordOrder: 290415 },
  { stageIndex: 858, id: 'daniel-8', book: 'Daniel', chapter: 8, totalVerses: 27, firstWordOrder: 290416, lastWordOrder: 290799 },
  { stageIndex: 859, id: 'daniel-9', book: 'Daniel', chapter: 9, totalVerses: 27, firstWordOrder: 290800, lastWordOrder: 291266 },
  { stageIndex: 860, id: 'daniel-10', book: 'Daniel', chapter: 10, totalVerses: 21, firstWordOrder: 291267, lastWordOrder: 291608 },
  { stageIndex: 861, id: 'daniel-11', book: 'Daniel', chapter: 11, totalVerses: 45, firstWordOrder: 291609, lastWordOrder: 292225 },
  { stageIndex: 862, id: 'daniel-12', book: 'Daniel', chapter: 12, totalVerses: 13, firstWordOrder: 292226, lastWordOrder: 292402 },
  { stageIndex: 863, id: 'hosea-1', book: 'Hosea', chapter: 1, totalVerses: 9, firstWordOrder: 292403, lastWordOrder: 292539 },
  { stageIndex: 864, id: 'hosea-2', book: 'Hosea', chapter: 2, totalVerses: 25, firstWordOrder: 292540, lastWordOrder: 292877 },
  { stageIndex: 865, id: 'hosea-3', book: 'Hosea', chapter: 3, totalVerses: 5, firstWordOrder: 292878, lastWordOrder: 292958 },
  { stageIndex: 866, id: 'hosea-4', book: 'Hosea', chapter: 4, totalVerses: 19, firstWordOrder: 292959, lastWordOrder: 293181 },
  { stageIndex: 867, id: 'hosea-5', book: 'Hosea', chapter: 5, totalVerses: 15, firstWordOrder: 293182, lastWordOrder: 293360 },
  { stageIndex: 868, id: 'hosea-6', book: 'Hosea', chapter: 6, totalVerses: 11, firstWordOrder: 293361, lastWordOrder: 293465 },
  { stageIndex: 869, id: 'hosea-7', book: 'Hosea', chapter: 7, totalVerses: 16, firstWordOrder: 293466, lastWordOrder: 293654 },
  { stageIndex: 870, id: 'hosea-8', book: 'Hosea', chapter: 8, totalVerses: 14, firstWordOrder: 293655, lastWordOrder: 293810 },
  { stageIndex: 871, id: 'hosea-9', book: 'Hosea', chapter: 9, totalVerses: 17, firstWordOrder: 293811, lastWordOrder: 294024 },
  { stageIndex: 872, id: 'hosea-10', book: 'Hosea', chapter: 10, totalVerses: 15, firstWordOrder: 294025, lastWordOrder: 294226 },
  { stageIndex: 873, id: 'hosea-11', book: 'Hosea', chapter: 11, totalVerses: 11, firstWordOrder: 294227, lastWordOrder: 294349 },
  { stageIndex: 874, id: 'hosea-12', book: 'Hosea', chapter: 12, totalVerses: 15, firstWordOrder: 294350, lastWordOrder: 294509 },
  { stageIndex: 875, id: 'hosea-13', book: 'Hosea', chapter: 13, totalVerses: 15, firstWordOrder: 294510, lastWordOrder: 294672 },
  { stageIndex: 876, id: 'hosea-14', book: 'Hosea', chapter: 14, totalVerses: 10, firstWordOrder: 294673, lastWordOrder: 294788 },
  { stageIndex: 877, id: 'joel-1', book: 'Joel', chapter: 1, totalVerses: 20, firstWordOrder: 294789, lastWordOrder: 295023 },
  { stageIndex: 878, id: 'joel-2', book: 'Joel', chapter: 2, totalVerses: 27, firstWordOrder: 295024, lastWordOrder: 295408 },
  { stageIndex: 879, id: 'joel-3', book: 'Joel', chapter: 3, totalVerses: 5, firstWordOrder: 295409, lastWordOrder: 295475 },
  { stageIndex: 880, id: 'amos-1', book: 'Amos', chapter: 1, totalVerses: 15, firstWordOrder: 295747, lastWordOrder: 295958 },
  { stageIndex: 881, id: 'amos-2', book: 'Amos', chapter: 2, totalVerses: 16, firstWordOrder: 295959, lastWordOrder: 296172 },
  { stageIndex: 882, id: 'amos-3', book: 'Amos', chapter: 3, totalVerses: 15, firstWordOrder: 296173, lastWordOrder: 296379 },
  { stageIndex: 883, id: 'amos-4', book: 'Amos', chapter: 4, totalVerses: 13, firstWordOrder: 296380, lastWordOrder: 296594 },
  { stageIndex: 884, id: 'amos-5', book: 'Amos', chapter: 5, totalVerses: 27, firstWordOrder: 296595, lastWordOrder: 296915 },
  { stageIndex: 885, id: 'amos-6', book: 'Amos', chapter: 6, totalVerses: 14, firstWordOrder: 296916, lastWordOrder: 297092 },
  { stageIndex: 886, id: 'amos-7', book: 'Amos', chapter: 7, totalVerses: 17, firstWordOrder: 297093, lastWordOrder: 297347 },
  { stageIndex: 887, id: 'amos-8', book: 'Amos', chapter: 8, totalVerses: 14, firstWordOrder: 297348, lastWordOrder: 297539 },
  { stageIndex: 888, id: 'amos-9', book: 'Amos', chapter: 9, totalVerses: 15, firstWordOrder: 297540, lastWordOrder: 297791 },
  { stageIndex: 889, id: 'obadiah-1', book: 'Obadiah', chapter: 1, totalVerses: 21, firstWordOrder: 297792, lastWordOrder: 298083 },
  { stageIndex: 890, id: 'jonah-1', book: 'Jonah', chapter: 1, totalVerses: 16, firstWordOrder: 298084, lastWordOrder: 298337 },
  { stageIndex: 891, id: 'jonah-2', book: 'Jonah', chapter: 2, totalVerses: 11, firstWordOrder: 298338, lastWordOrder: 298449 },
  { stageIndex: 892, id: 'jonah-3', book: 'Jonah', chapter: 3, totalVerses: 10, firstWordOrder: 298450, lastWordOrder: 298588 },
  { stageIndex: 893, id: 'jonah-4', book: 'Jonah', chapter: 4, totalVerses: 11, firstWordOrder: 298589, lastWordOrder: 298771 },
  { stageIndex: 894, id: 'micah-1', book: 'Micah', chapter: 1, totalVerses: 16, firstWordOrder: 298772, lastWordOrder: 298986 },
  { stageIndex: 895, id: 'micah-2', book: 'Micah', chapter: 2, totalVerses: 13, firstWordOrder: 298987, lastWordOrder: 299162 },
  { stageIndex: 896, id: 'micah-3', book: 'Micah', chapter: 3, totalVerses: 12, firstWordOrder: 299163, lastWordOrder: 299329 },
  { stageIndex: 897, id: 'micah-4', book: 'Micah', chapter: 4, totalVerses: 14, firstWordOrder: 299330, lastWordOrder: 299551 },
  { stageIndex: 898, id: 'micah-5', book: 'Micah', chapter: 5, totalVerses: 14, firstWordOrder: 299552, lastWordOrder: 299723 },
  { stageIndex: 899, id: 'micah-6', book: 'Micah', chapter: 6, totalVerses: 16, firstWordOrder: 299724, lastWordOrder: 299927 },
  { stageIndex: 900, id: 'micah-7', book: 'Micah', chapter: 7, totalVerses: 20, firstWordOrder: 299928, lastWordOrder: 300171 },
  { stageIndex: 901, id: 'nahum-1', book: 'Nahum', chapter: 1, totalVerses: 14, firstWordOrder: 300172, lastWordOrder: 300326 },
  { stageIndex: 902, id: 'nahum-2', book: 'Nahum', chapter: 2, totalVerses: 14, firstWordOrder: 300327, lastWordOrder: 300501 },
  { stageIndex: 903, id: 'nahum-3', book: 'Nahum', chapter: 3, totalVerses: 19, firstWordOrder: 300502, lastWordOrder: 300733 },
  { stageIndex: 904, id: 'habakkuk-1', book: 'Habakkuk', chapter: 1, totalVerses: 17, firstWordOrder: 300734, lastWordOrder: 300930 },
  { stageIndex: 905, id: 'habakkuk-2', book: 'Habakkuk', chapter: 2, totalVerses: 20, firstWordOrder: 300931, lastWordOrder: 301192 },
  { stageIndex: 906, id: 'habakkuk-3', book: 'Habakkuk', chapter: 3, totalVerses: 19, firstWordOrder: 301193, lastWordOrder: 301405 },
  { stageIndex: 907, id: 'zephaniah-1', book: 'Zephaniah', chapter: 1, totalVerses: 18, firstWordOrder: 301406, lastWordOrder: 301674 },
  { stageIndex: 908, id: 'zephaniah-2', book: 'Zephaniah', chapter: 2, totalVerses: 15, firstWordOrder: 301675, lastWordOrder: 301898 },
  { stageIndex: 909, id: 'zephaniah-3', book: 'Zephaniah', chapter: 3, totalVerses: 20, firstWordOrder: 301899, lastWordOrder: 302174 },
  { stageIndex: 910, id: 'haggai-1', book: 'Haggai', chapter: 1, totalVerses: 15, firstWordOrder: 302175, lastWordOrder: 302413 },
  { stageIndex: 911, id: 'haggai-2', book: 'Haggai', chapter: 2, totalVerses: 23, firstWordOrder: 302414, lastWordOrder: 302775 },
  { stageIndex: 912, id: 'zechariah-1', book: 'Zechariah', chapter: 1, totalVerses: 17, firstWordOrder: 302776, lastWordOrder: 303050 },
  { stageIndex: 913, id: 'zechariah-2', book: 'Zechariah', chapter: 2, totalVerses: 17, firstWordOrder: 303051, lastWordOrder: 303270 },
  { stageIndex: 914, id: 'zechariah-3', book: 'Zechariah', chapter: 3, totalVerses: 10, firstWordOrder: 303271, lastWordOrder: 303434 },
  { stageIndex: 915, id: 'zechariah-4', book: 'Zechariah', chapter: 4, totalVerses: 14, firstWordOrder: 303435, lastWordOrder: 303622 },
  { stageIndex: 916, id: 'zechariah-5', book: 'Zechariah', chapter: 5, totalVerses: 11, firstWordOrder: 303623, lastWordOrder: 303777 },
  { stageIndex: 917, id: 'zechariah-6', book: 'Zechariah', chapter: 6, totalVerses: 15, firstWordOrder: 303778, lastWordOrder: 303980 },
  { stageIndex: 918, id: 'zechariah-7', book: 'Zechariah', chapter: 7, totalVerses: 14, firstWordOrder: 303981, lastWordOrder: 304167 },
  { stageIndex: 919, id: 'zechariah-8', book: 'Zechariah', chapter: 8, totalVerses: 23, firstWordOrder: 304168, lastWordOrder: 304523 },
  { stageIndex: 920, id: 'zechariah-9', book: 'Zechariah', chapter: 9, totalVerses: 17, firstWordOrder: 304524, lastWordOrder: 304745 },
  { stageIndex: 921, id: 'zechariah-10', book: 'Zechariah', chapter: 10, totalVerses: 12, firstWordOrder: 304746, lastWordOrder: 304911 },
  { stageIndex: 922, id: 'zechariah-11', book: 'Zechariah', chapter: 11, totalVerses: 17, firstWordOrder: 304912, lastWordOrder: 305166 },
  { stageIndex: 923, id: 'zechariah-12', book: 'Zechariah', chapter: 12, totalVerses: 14, firstWordOrder: 305167, lastWordOrder: 305393 },
  { stageIndex: 924, id: 'zechariah-13', book: 'Zechariah', chapter: 13, totalVerses: 9, firstWordOrder: 305394, lastWordOrder: 305545 },
  { stageIndex: 925, id: 'zechariah-14', book: 'Zechariah', chapter: 14, totalVerses: 21, firstWordOrder: 305546, lastWordOrder: 305909 },
  { stageIndex: 926, id: 'malachi-1', book: 'Malachi', chapter: 1, totalVerses: 14, firstWordOrder: 305910, lastWordOrder: 306148 },
  { stageIndex: 927, id: 'malachi-2', book: 'Malachi', chapter: 2, totalVerses: 17, firstWordOrder: 306149, lastWordOrder: 306417 },
  { stageIndex: 928, id: 'malachi-3', book: 'Malachi', chapter: 3, totalVerses: 24, firstWordOrder: 306418, lastWordOrder: 306785 },
]

// Map stage_index → registry entry for O(1) look-up
const BY_STAGE = Object.fromEntries(CHAPTER_REGISTRY.map((c) => [c.stageIndex, c]))
// Map chapter id → registry entry
const BY_ID    = Object.fromEntries(CHAPTER_REGISTRY.map((c) => [c.id, c]))

/** Dynamic import dispatcher — Vite requires explicit string literals in import() */
async function importChapterById(chapterId) {
  switch (chapterId) {
    case 'genesis-1': return (await import('../data/verses/genesis-1.json')).default
    case 'genesis-2': return (await import('../data/verses/genesis-2.json')).default
    case 'genesis-3': return (await import('../data/verses/genesis-3.json')).default
    case 'genesis-4': return (await import('../data/verses/genesis-4.json')).default
    case 'genesis-5': return (await import('../data/verses/genesis-5.json')).default
    case 'genesis-6': return (await import('../data/verses/genesis-6.json')).default
    case 'genesis-7': return (await import('../data/verses/genesis-7.json')).default
    case 'genesis-8': return (await import('../data/verses/genesis-8.json')).default
    case 'genesis-9': return (await import('../data/verses/genesis-9.json')).default
    case 'genesis-10': return (await import('../data/verses/genesis-10.json')).default
    case 'genesis-11': return (await import('../data/verses/genesis-11.json')).default
    case 'genesis-12': return (await import('../data/verses/genesis-12.json')).default
    case 'genesis-13': return (await import('../data/verses/genesis-13.json')).default
    case 'genesis-14': return (await import('../data/verses/genesis-14.json')).default
    case 'genesis-15': return (await import('../data/verses/genesis-15.json')).default
    case 'genesis-16': return (await import('../data/verses/genesis-16.json')).default
    case 'genesis-17': return (await import('../data/verses/genesis-17.json')).default
    case 'genesis-18': return (await import('../data/verses/genesis-18.json')).default
    case 'genesis-19': return (await import('../data/verses/genesis-19.json')).default
    case 'genesis-20': return (await import('../data/verses/genesis-20.json')).default
    case 'genesis-21': return (await import('../data/verses/genesis-21.json')).default
    case 'genesis-22': return (await import('../data/verses/genesis-22.json')).default
    case 'genesis-23': return (await import('../data/verses/genesis-23.json')).default
    case 'genesis-24': return (await import('../data/verses/genesis-24.json')).default
    case 'genesis-25': return (await import('../data/verses/genesis-25.json')).default
    case 'genesis-26': return (await import('../data/verses/genesis-26.json')).default
    case 'genesis-27': return (await import('../data/verses/genesis-27.json')).default
    case 'genesis-28': return (await import('../data/verses/genesis-28.json')).default
    case 'genesis-29': return (await import('../data/verses/genesis-29.json')).default
    case 'genesis-30': return (await import('../data/verses/genesis-30.json')).default
    case 'genesis-31': return (await import('../data/verses/genesis-31.json')).default
    case 'genesis-32': return (await import('../data/verses/genesis-32.json')).default
    case 'genesis-33': return (await import('../data/verses/genesis-33.json')).default
    case 'genesis-34': return (await import('../data/verses/genesis-34.json')).default
    case 'genesis-35': return (await import('../data/verses/genesis-35.json')).default
    case 'genesis-36': return (await import('../data/verses/genesis-36.json')).default
    case 'genesis-37': return (await import('../data/verses/genesis-37.json')).default
    case 'genesis-38': return (await import('../data/verses/genesis-38.json')).default
    case 'genesis-39': return (await import('../data/verses/genesis-39.json')).default
    case 'genesis-40': return (await import('../data/verses/genesis-40.json')).default
    case 'genesis-41': return (await import('../data/verses/genesis-41.json')).default
    case 'genesis-42': return (await import('../data/verses/genesis-42.json')).default
    case 'genesis-43': return (await import('../data/verses/genesis-43.json')).default
    case 'genesis-44': return (await import('../data/verses/genesis-44.json')).default
    case 'genesis-45': return (await import('../data/verses/genesis-45.json')).default
    case 'genesis-46': return (await import('../data/verses/genesis-46.json')).default
    case 'genesis-47': return (await import('../data/verses/genesis-47.json')).default
    case 'genesis-48': return (await import('../data/verses/genesis-48.json')).default
    case 'genesis-49': return (await import('../data/verses/genesis-49.json')).default
    case 'genesis-50': return (await import('../data/verses/genesis-50.json')).default
    case 'exodus-1': return (await import('../data/verses/exodus-1.json')).default
    case 'exodus-2': return (await import('../data/verses/exodus-2.json')).default
    case 'exodus-3': return (await import('../data/verses/exodus-3.json')).default
    case 'exodus-4': return (await import('../data/verses/exodus-4.json')).default
    case 'exodus-5': return (await import('../data/verses/exodus-5.json')).default
    case 'exodus-6': return (await import('../data/verses/exodus-6.json')).default
    case 'exodus-7': return (await import('../data/verses/exodus-7.json')).default
    case 'exodus-8': return (await import('../data/verses/exodus-8.json')).default
    case 'exodus-9': return (await import('../data/verses/exodus-9.json')).default
    case 'exodus-10': return (await import('../data/verses/exodus-10.json')).default
    case 'exodus-11': return (await import('../data/verses/exodus-11.json')).default
    case 'exodus-12': return (await import('../data/verses/exodus-12.json')).default
    case 'exodus-13': return (await import('../data/verses/exodus-13.json')).default
    case 'exodus-14': return (await import('../data/verses/exodus-14.json')).default
    case 'exodus-15': return (await import('../data/verses/exodus-15.json')).default
    case 'exodus-16': return (await import('../data/verses/exodus-16.json')).default
    case 'exodus-17': return (await import('../data/verses/exodus-17.json')).default
    case 'exodus-18': return (await import('../data/verses/exodus-18.json')).default
    case 'exodus-19': return (await import('../data/verses/exodus-19.json')).default
    case 'exodus-20': return (await import('../data/verses/exodus-20.json')).default
    case 'exodus-21': return (await import('../data/verses/exodus-21.json')).default
    case 'exodus-22': return (await import('../data/verses/exodus-22.json')).default
    case 'exodus-23': return (await import('../data/verses/exodus-23.json')).default
    case 'exodus-24': return (await import('../data/verses/exodus-24.json')).default
    case 'exodus-25': return (await import('../data/verses/exodus-25.json')).default
    case 'exodus-26': return (await import('../data/verses/exodus-26.json')).default
    case 'exodus-27': return (await import('../data/verses/exodus-27.json')).default
    case 'exodus-28': return (await import('../data/verses/exodus-28.json')).default
    case 'exodus-29': return (await import('../data/verses/exodus-29.json')).default
    case 'exodus-30': return (await import('../data/verses/exodus-30.json')).default
    case 'exodus-31': return (await import('../data/verses/exodus-31.json')).default
    case 'exodus-32': return (await import('../data/verses/exodus-32.json')).default
    case 'exodus-33': return (await import('../data/verses/exodus-33.json')).default
    case 'exodus-34': return (await import('../data/verses/exodus-34.json')).default
    case 'exodus-35': return (await import('../data/verses/exodus-35.json')).default
    case 'exodus-36': return (await import('../data/verses/exodus-36.json')).default
    case 'exodus-37': return (await import('../data/verses/exodus-37.json')).default
    case 'exodus-38': return (await import('../data/verses/exodus-38.json')).default
    case 'exodus-39': return (await import('../data/verses/exodus-39.json')).default
    case 'exodus-40': return (await import('../data/verses/exodus-40.json')).default
    case 'leviticus-1': return (await import('../data/verses/leviticus-1.json')).default
    case 'leviticus-2': return (await import('../data/verses/leviticus-2.json')).default
    case 'leviticus-3': return (await import('../data/verses/leviticus-3.json')).default
    case 'leviticus-4': return (await import('../data/verses/leviticus-4.json')).default
    case 'leviticus-5': return (await import('../data/verses/leviticus-5.json')).default
    case 'leviticus-6': return (await import('../data/verses/leviticus-6.json')).default
    case 'leviticus-7': return (await import('../data/verses/leviticus-7.json')).default
    case 'leviticus-8': return (await import('../data/verses/leviticus-8.json')).default
    case 'leviticus-9': return (await import('../data/verses/leviticus-9.json')).default
    case 'leviticus-10': return (await import('../data/verses/leviticus-10.json')).default
    case 'leviticus-11': return (await import('../data/verses/leviticus-11.json')).default
    case 'leviticus-12': return (await import('../data/verses/leviticus-12.json')).default
    case 'leviticus-13': return (await import('../data/verses/leviticus-13.json')).default
    case 'leviticus-14': return (await import('../data/verses/leviticus-14.json')).default
    case 'leviticus-15': return (await import('../data/verses/leviticus-15.json')).default
    case 'leviticus-16': return (await import('../data/verses/leviticus-16.json')).default
    case 'leviticus-17': return (await import('../data/verses/leviticus-17.json')).default
    case 'leviticus-18': return (await import('../data/verses/leviticus-18.json')).default
    case 'leviticus-19': return (await import('../data/verses/leviticus-19.json')).default
    case 'leviticus-20': return (await import('../data/verses/leviticus-20.json')).default
    case 'leviticus-21': return (await import('../data/verses/leviticus-21.json')).default
    case 'leviticus-22': return (await import('../data/verses/leviticus-22.json')).default
    case 'leviticus-23': return (await import('../data/verses/leviticus-23.json')).default
    case 'leviticus-24': return (await import('../data/verses/leviticus-24.json')).default
    case 'leviticus-25': return (await import('../data/verses/leviticus-25.json')).default
    case 'leviticus-26': return (await import('../data/verses/leviticus-26.json')).default
    case 'leviticus-27': return (await import('../data/verses/leviticus-27.json')).default
    case 'numbers-1': return (await import('../data/verses/numbers-1.json')).default
    case 'numbers-2': return (await import('../data/verses/numbers-2.json')).default
    case 'numbers-3': return (await import('../data/verses/numbers-3.json')).default
    case 'numbers-4': return (await import('../data/verses/numbers-4.json')).default
    case 'numbers-5': return (await import('../data/verses/numbers-5.json')).default
    case 'numbers-6': return (await import('../data/verses/numbers-6.json')).default
    case 'numbers-7': return (await import('../data/verses/numbers-7.json')).default
    case 'numbers-8': return (await import('../data/verses/numbers-8.json')).default
    case 'numbers-9': return (await import('../data/verses/numbers-9.json')).default
    case 'numbers-10': return (await import('../data/verses/numbers-10.json')).default
    case 'numbers-11': return (await import('../data/verses/numbers-11.json')).default
    case 'numbers-12': return (await import('../data/verses/numbers-12.json')).default
    case 'numbers-13': return (await import('../data/verses/numbers-13.json')).default
    case 'numbers-14': return (await import('../data/verses/numbers-14.json')).default
    case 'numbers-15': return (await import('../data/verses/numbers-15.json')).default
    case 'numbers-16': return (await import('../data/verses/numbers-16.json')).default
    case 'numbers-17': return (await import('../data/verses/numbers-17.json')).default
    case 'numbers-18': return (await import('../data/verses/numbers-18.json')).default
    case 'numbers-19': return (await import('../data/verses/numbers-19.json')).default
    case 'numbers-20': return (await import('../data/verses/numbers-20.json')).default
    case 'numbers-21': return (await import('../data/verses/numbers-21.json')).default
    case 'numbers-22': return (await import('../data/verses/numbers-22.json')).default
    case 'numbers-23': return (await import('../data/verses/numbers-23.json')).default
    case 'numbers-24': return (await import('../data/verses/numbers-24.json')).default
    case 'numbers-25': return (await import('../data/verses/numbers-25.json')).default
    case 'numbers-26': return (await import('../data/verses/numbers-26.json')).default
    case 'numbers-27': return (await import('../data/verses/numbers-27.json')).default
    case 'numbers-28': return (await import('../data/verses/numbers-28.json')).default
    case 'numbers-29': return (await import('../data/verses/numbers-29.json')).default
    case 'numbers-30': return (await import('../data/verses/numbers-30.json')).default
    case 'numbers-31': return (await import('../data/verses/numbers-31.json')).default
    case 'numbers-32': return (await import('../data/verses/numbers-32.json')).default
    case 'numbers-33': return (await import('../data/verses/numbers-33.json')).default
    case 'numbers-34': return (await import('../data/verses/numbers-34.json')).default
    case 'numbers-35': return (await import('../data/verses/numbers-35.json')).default
    case 'numbers-36': return (await import('../data/verses/numbers-36.json')).default
    case 'deuteronomy-1': return (await import('../data/verses/deuteronomy-1.json')).default
    case 'deuteronomy-2': return (await import('../data/verses/deuteronomy-2.json')).default
    case 'deuteronomy-3': return (await import('../data/verses/deuteronomy-3.json')).default
    case 'deuteronomy-4': return (await import('../data/verses/deuteronomy-4.json')).default
    case 'deuteronomy-5': return (await import('../data/verses/deuteronomy-5.json')).default
    case 'deuteronomy-6': return (await import('../data/verses/deuteronomy-6.json')).default
    case 'deuteronomy-7': return (await import('../data/verses/deuteronomy-7.json')).default
    case 'deuteronomy-8': return (await import('../data/verses/deuteronomy-8.json')).default
    case 'deuteronomy-9': return (await import('../data/verses/deuteronomy-9.json')).default
    case 'deuteronomy-10': return (await import('../data/verses/deuteronomy-10.json')).default
    case 'deuteronomy-11': return (await import('../data/verses/deuteronomy-11.json')).default
    case 'deuteronomy-12': return (await import('../data/verses/deuteronomy-12.json')).default
    case 'deuteronomy-13': return (await import('../data/verses/deuteronomy-13.json')).default
    case 'deuteronomy-14': return (await import('../data/verses/deuteronomy-14.json')).default
    case 'deuteronomy-15': return (await import('../data/verses/deuteronomy-15.json')).default
    case 'deuteronomy-16': return (await import('../data/verses/deuteronomy-16.json')).default
    case 'deuteronomy-17': return (await import('../data/verses/deuteronomy-17.json')).default
    case 'deuteronomy-18': return (await import('../data/verses/deuteronomy-18.json')).default
    case 'deuteronomy-19': return (await import('../data/verses/deuteronomy-19.json')).default
    case 'deuteronomy-20': return (await import('../data/verses/deuteronomy-20.json')).default
    case 'deuteronomy-21': return (await import('../data/verses/deuteronomy-21.json')).default
    case 'deuteronomy-22': return (await import('../data/verses/deuteronomy-22.json')).default
    case 'deuteronomy-23': return (await import('../data/verses/deuteronomy-23.json')).default
    case 'deuteronomy-24': return (await import('../data/verses/deuteronomy-24.json')).default
    case 'deuteronomy-25': return (await import('../data/verses/deuteronomy-25.json')).default
    case 'deuteronomy-26': return (await import('../data/verses/deuteronomy-26.json')).default
    case 'deuteronomy-27': return (await import('../data/verses/deuteronomy-27.json')).default
    case 'deuteronomy-28': return (await import('../data/verses/deuteronomy-28.json')).default
    case 'deuteronomy-29': return (await import('../data/verses/deuteronomy-29.json')).default
    case 'deuteronomy-30': return (await import('../data/verses/deuteronomy-30.json')).default
    case 'deuteronomy-31': return (await import('../data/verses/deuteronomy-31.json')).default
    case 'deuteronomy-32': return (await import('../data/verses/deuteronomy-32.json')).default
    case 'deuteronomy-33': return (await import('../data/verses/deuteronomy-33.json')).default
    case 'deuteronomy-34': return (await import('../data/verses/deuteronomy-34.json')).default
    case 'joshua-1': return (await import('../data/verses/joshua-1.json')).default
    case 'joshua-2': return (await import('../data/verses/joshua-2.json')).default
    case 'joshua-3': return (await import('../data/verses/joshua-3.json')).default
    case 'joshua-4': return (await import('../data/verses/joshua-4.json')).default
    case 'joshua-5': return (await import('../data/verses/joshua-5.json')).default
    case 'joshua-6': return (await import('../data/verses/joshua-6.json')).default
    case 'joshua-7': return (await import('../data/verses/joshua-7.json')).default
    case 'joshua-8': return (await import('../data/verses/joshua-8.json')).default
    case 'joshua-9': return (await import('../data/verses/joshua-9.json')).default
    case 'joshua-10': return (await import('../data/verses/joshua-10.json')).default
    case 'joshua-11': return (await import('../data/verses/joshua-11.json')).default
    case 'joshua-12': return (await import('../data/verses/joshua-12.json')).default
    case 'joshua-13': return (await import('../data/verses/joshua-13.json')).default
    case 'joshua-14': return (await import('../data/verses/joshua-14.json')).default
    case 'joshua-15': return (await import('../data/verses/joshua-15.json')).default
    case 'joshua-16': return (await import('../data/verses/joshua-16.json')).default
    case 'joshua-17': return (await import('../data/verses/joshua-17.json')).default
    case 'joshua-18': return (await import('../data/verses/joshua-18.json')).default
    case 'joshua-19': return (await import('../data/verses/joshua-19.json')).default
    case 'joshua-20': return (await import('../data/verses/joshua-20.json')).default
    case 'joshua-21': return (await import('../data/verses/joshua-21.json')).default
    case 'joshua-22': return (await import('../data/verses/joshua-22.json')).default
    case 'joshua-23': return (await import('../data/verses/joshua-23.json')).default
    case 'joshua-24': return (await import('../data/verses/joshua-24.json')).default
    case 'judges-1': return (await import('../data/verses/judges-1.json')).default
    case 'judges-2': return (await import('../data/verses/judges-2.json')).default
    case 'judges-3': return (await import('../data/verses/judges-3.json')).default
    case 'judges-4': return (await import('../data/verses/judges-4.json')).default
    case 'judges-5': return (await import('../data/verses/judges-5.json')).default
    case 'judges-6': return (await import('../data/verses/judges-6.json')).default
    case 'judges-7': return (await import('../data/verses/judges-7.json')).default
    case 'judges-8': return (await import('../data/verses/judges-8.json')).default
    case 'judges-9': return (await import('../data/verses/judges-9.json')).default
    case 'judges-10': return (await import('../data/verses/judges-10.json')).default
    case 'judges-11': return (await import('../data/verses/judges-11.json')).default
    case 'judges-12': return (await import('../data/verses/judges-12.json')).default
    case 'judges-13': return (await import('../data/verses/judges-13.json')).default
    case 'judges-14': return (await import('../data/verses/judges-14.json')).default
    case 'judges-15': return (await import('../data/verses/judges-15.json')).default
    case 'judges-16': return (await import('../data/verses/judges-16.json')).default
    case 'judges-17': return (await import('../data/verses/judges-17.json')).default
    case 'judges-18': return (await import('../data/verses/judges-18.json')).default
    case 'judges-19': return (await import('../data/verses/judges-19.json')).default
    case 'judges-20': return (await import('../data/verses/judges-20.json')).default
    case 'judges-21': return (await import('../data/verses/judges-21.json')).default
    case 'ruth-1': return (await import('../data/verses/ruth-1.json')).default
    case 'ruth-2': return (await import('../data/verses/ruth-2.json')).default
    case 'ruth-3': return (await import('../data/verses/ruth-3.json')).default
    case 'ruth-4': return (await import('../data/verses/ruth-4.json')).default
    case '1-samuel-1': return (await import('../data/verses/1-samuel-1.json')).default
    case '1-samuel-2': return (await import('../data/verses/1-samuel-2.json')).default
    case '1-samuel-3': return (await import('../data/verses/1-samuel-3.json')).default
    case '1-samuel-4': return (await import('../data/verses/1-samuel-4.json')).default
    case '1-samuel-5': return (await import('../data/verses/1-samuel-5.json')).default
    case '1-samuel-6': return (await import('../data/verses/1-samuel-6.json')).default
    case '1-samuel-7': return (await import('../data/verses/1-samuel-7.json')).default
    case '1-samuel-8': return (await import('../data/verses/1-samuel-8.json')).default
    case '1-samuel-9': return (await import('../data/verses/1-samuel-9.json')).default
    case '1-samuel-10': return (await import('../data/verses/1-samuel-10.json')).default
    case '1-samuel-11': return (await import('../data/verses/1-samuel-11.json')).default
    case '1-samuel-12': return (await import('../data/verses/1-samuel-12.json')).default
    case '1-samuel-13': return (await import('../data/verses/1-samuel-13.json')).default
    case '1-samuel-14': return (await import('../data/verses/1-samuel-14.json')).default
    case '1-samuel-15': return (await import('../data/verses/1-samuel-15.json')).default
    case '1-samuel-16': return (await import('../data/verses/1-samuel-16.json')).default
    case '1-samuel-17': return (await import('../data/verses/1-samuel-17.json')).default
    case '1-samuel-18': return (await import('../data/verses/1-samuel-18.json')).default
    case '1-samuel-19': return (await import('../data/verses/1-samuel-19.json')).default
    case '1-samuel-20': return (await import('../data/verses/1-samuel-20.json')).default
    case '1-samuel-21': return (await import('../data/verses/1-samuel-21.json')).default
    case '1-samuel-22': return (await import('../data/verses/1-samuel-22.json')).default
    case '1-samuel-23': return (await import('../data/verses/1-samuel-23.json')).default
    case '1-samuel-24': return (await import('../data/verses/1-samuel-24.json')).default
    case '1-samuel-25': return (await import('../data/verses/1-samuel-25.json')).default
    case '1-samuel-26': return (await import('../data/verses/1-samuel-26.json')).default
    case '1-samuel-27': return (await import('../data/verses/1-samuel-27.json')).default
    case '1-samuel-28': return (await import('../data/verses/1-samuel-28.json')).default
    case '1-samuel-29': return (await import('../data/verses/1-samuel-29.json')).default
    case '1-samuel-30': return (await import('../data/verses/1-samuel-30.json')).default
    case '1-samuel-31': return (await import('../data/verses/1-samuel-31.json')).default
    case '2-samuel-1': return (await import('../data/verses/2-samuel-1.json')).default
    case '2-samuel-2': return (await import('../data/verses/2-samuel-2.json')).default
    case '2-samuel-3': return (await import('../data/verses/2-samuel-3.json')).default
    case '2-samuel-4': return (await import('../data/verses/2-samuel-4.json')).default
    case '2-samuel-5': return (await import('../data/verses/2-samuel-5.json')).default
    case '2-samuel-6': return (await import('../data/verses/2-samuel-6.json')).default
    case '2-samuel-7': return (await import('../data/verses/2-samuel-7.json')).default
    case '2-samuel-8': return (await import('../data/verses/2-samuel-8.json')).default
    case '2-samuel-9': return (await import('../data/verses/2-samuel-9.json')).default
    case '2-samuel-10': return (await import('../data/verses/2-samuel-10.json')).default
    case '2-samuel-11': return (await import('../data/verses/2-samuel-11.json')).default
    case '2-samuel-12': return (await import('../data/verses/2-samuel-12.json')).default
    case '2-samuel-13': return (await import('../data/verses/2-samuel-13.json')).default
    case '2-samuel-14': return (await import('../data/verses/2-samuel-14.json')).default
    case '2-samuel-15': return (await import('../data/verses/2-samuel-15.json')).default
    case '2-samuel-16': return (await import('../data/verses/2-samuel-16.json')).default
    case '2-samuel-17': return (await import('../data/verses/2-samuel-17.json')).default
    case '2-samuel-18': return (await import('../data/verses/2-samuel-18.json')).default
    case '2-samuel-19': return (await import('../data/verses/2-samuel-19.json')).default
    case '2-samuel-20': return (await import('../data/verses/2-samuel-20.json')).default
    case '2-samuel-21': return (await import('../data/verses/2-samuel-21.json')).default
    case '2-samuel-22': return (await import('../data/verses/2-samuel-22.json')).default
    case '2-samuel-23': return (await import('../data/verses/2-samuel-23.json')).default
    case '2-samuel-24': return (await import('../data/verses/2-samuel-24.json')).default
    case '1-kings-1': return (await import('../data/verses/1-kings-1.json')).default
    case '1-kings-2': return (await import('../data/verses/1-kings-2.json')).default
    case '1-kings-3': return (await import('../data/verses/1-kings-3.json')).default
    case '1-kings-4': return (await import('../data/verses/1-kings-4.json')).default
    case '1-kings-5': return (await import('../data/verses/1-kings-5.json')).default
    case '1-kings-6': return (await import('../data/verses/1-kings-6.json')).default
    case '1-kings-7': return (await import('../data/verses/1-kings-7.json')).default
    case '1-kings-8': return (await import('../data/verses/1-kings-8.json')).default
    case '1-kings-9': return (await import('../data/verses/1-kings-9.json')).default
    case '1-kings-10': return (await import('../data/verses/1-kings-10.json')).default
    case '1-kings-11': return (await import('../data/verses/1-kings-11.json')).default
    case '1-kings-12': return (await import('../data/verses/1-kings-12.json')).default
    case '1-kings-13': return (await import('../data/verses/1-kings-13.json')).default
    case '1-kings-14': return (await import('../data/verses/1-kings-14.json')).default
    case '1-kings-15': return (await import('../data/verses/1-kings-15.json')).default
    case '1-kings-16': return (await import('../data/verses/1-kings-16.json')).default
    case '1-kings-17': return (await import('../data/verses/1-kings-17.json')).default
    case '1-kings-18': return (await import('../data/verses/1-kings-18.json')).default
    case '1-kings-19': return (await import('../data/verses/1-kings-19.json')).default
    case '1-kings-20': return (await import('../data/verses/1-kings-20.json')).default
    case '1-kings-21': return (await import('../data/verses/1-kings-21.json')).default
    case '1-kings-22': return (await import('../data/verses/1-kings-22.json')).default
    case '2-kings-1': return (await import('../data/verses/2-kings-1.json')).default
    case '2-kings-2': return (await import('../data/verses/2-kings-2.json')).default
    case '2-kings-3': return (await import('../data/verses/2-kings-3.json')).default
    case '2-kings-4': return (await import('../data/verses/2-kings-4.json')).default
    case '2-kings-5': return (await import('../data/verses/2-kings-5.json')).default
    case '2-kings-6': return (await import('../data/verses/2-kings-6.json')).default
    case '2-kings-7': return (await import('../data/verses/2-kings-7.json')).default
    case '2-kings-8': return (await import('../data/verses/2-kings-8.json')).default
    case '2-kings-9': return (await import('../data/verses/2-kings-9.json')).default
    case '2-kings-10': return (await import('../data/verses/2-kings-10.json')).default
    case '2-kings-11': return (await import('../data/verses/2-kings-11.json')).default
    case '2-kings-12': return (await import('../data/verses/2-kings-12.json')).default
    case '2-kings-13': return (await import('../data/verses/2-kings-13.json')).default
    case '2-kings-14': return (await import('../data/verses/2-kings-14.json')).default
    case '2-kings-15': return (await import('../data/verses/2-kings-15.json')).default
    case '2-kings-16': return (await import('../data/verses/2-kings-16.json')).default
    case '2-kings-17': return (await import('../data/verses/2-kings-17.json')).default
    case '2-kings-18': return (await import('../data/verses/2-kings-18.json')).default
    case '2-kings-19': return (await import('../data/verses/2-kings-19.json')).default
    case '2-kings-20': return (await import('../data/verses/2-kings-20.json')).default
    case '2-kings-21': return (await import('../data/verses/2-kings-21.json')).default
    case '2-kings-22': return (await import('../data/verses/2-kings-22.json')).default
    case '2-kings-23': return (await import('../data/verses/2-kings-23.json')).default
    case '2-kings-24': return (await import('../data/verses/2-kings-24.json')).default
    case '2-kings-25': return (await import('../data/verses/2-kings-25.json')).default
    case '1-chronicles-1': return (await import('../data/verses/1-chronicles-1.json')).default
    case '1-chronicles-2': return (await import('../data/verses/1-chronicles-2.json')).default
    case '1-chronicles-3': return (await import('../data/verses/1-chronicles-3.json')).default
    case '1-chronicles-4': return (await import('../data/verses/1-chronicles-4.json')).default
    case '1-chronicles-5': return (await import('../data/verses/1-chronicles-5.json')).default
    case '1-chronicles-6': return (await import('../data/verses/1-chronicles-6.json')).default
    case '1-chronicles-7': return (await import('../data/verses/1-chronicles-7.json')).default
    case '1-chronicles-8': return (await import('../data/verses/1-chronicles-8.json')).default
    case '1-chronicles-9': return (await import('../data/verses/1-chronicles-9.json')).default
    case '1-chronicles-10': return (await import('../data/verses/1-chronicles-10.json')).default
    case '1-chronicles-11': return (await import('../data/verses/1-chronicles-11.json')).default
    case '1-chronicles-12': return (await import('../data/verses/1-chronicles-12.json')).default
    case '1-chronicles-13': return (await import('../data/verses/1-chronicles-13.json')).default
    case '1-chronicles-14': return (await import('../data/verses/1-chronicles-14.json')).default
    case '1-chronicles-15': return (await import('../data/verses/1-chronicles-15.json')).default
    case '1-chronicles-16': return (await import('../data/verses/1-chronicles-16.json')).default
    case '1-chronicles-17': return (await import('../data/verses/1-chronicles-17.json')).default
    case '1-chronicles-18': return (await import('../data/verses/1-chronicles-18.json')).default
    case '1-chronicles-19': return (await import('../data/verses/1-chronicles-19.json')).default
    case '1-chronicles-20': return (await import('../data/verses/1-chronicles-20.json')).default
    case '1-chronicles-21': return (await import('../data/verses/1-chronicles-21.json')).default
    case '1-chronicles-22': return (await import('../data/verses/1-chronicles-22.json')).default
    case '1-chronicles-23': return (await import('../data/verses/1-chronicles-23.json')).default
    case '1-chronicles-24': return (await import('../data/verses/1-chronicles-24.json')).default
    case '1-chronicles-25': return (await import('../data/verses/1-chronicles-25.json')).default
    case '1-chronicles-26': return (await import('../data/verses/1-chronicles-26.json')).default
    case '1-chronicles-27': return (await import('../data/verses/1-chronicles-27.json')).default
    case '1-chronicles-28': return (await import('../data/verses/1-chronicles-28.json')).default
    case '1-chronicles-29': return (await import('../data/verses/1-chronicles-29.json')).default
    case '2-chronicles-1': return (await import('../data/verses/2-chronicles-1.json')).default
    case '2-chronicles-2': return (await import('../data/verses/2-chronicles-2.json')).default
    case '2-chronicles-3': return (await import('../data/verses/2-chronicles-3.json')).default
    case '2-chronicles-4': return (await import('../data/verses/2-chronicles-4.json')).default
    case '2-chronicles-5': return (await import('../data/verses/2-chronicles-5.json')).default
    case '2-chronicles-6': return (await import('../data/verses/2-chronicles-6.json')).default
    case '2-chronicles-7': return (await import('../data/verses/2-chronicles-7.json')).default
    case '2-chronicles-8': return (await import('../data/verses/2-chronicles-8.json')).default
    case '2-chronicles-9': return (await import('../data/verses/2-chronicles-9.json')).default
    case '2-chronicles-10': return (await import('../data/verses/2-chronicles-10.json')).default
    case '2-chronicles-11': return (await import('../data/verses/2-chronicles-11.json')).default
    case '2-chronicles-12': return (await import('../data/verses/2-chronicles-12.json')).default
    case '2-chronicles-13': return (await import('../data/verses/2-chronicles-13.json')).default
    case '2-chronicles-14': return (await import('../data/verses/2-chronicles-14.json')).default
    case '2-chronicles-15': return (await import('../data/verses/2-chronicles-15.json')).default
    case '2-chronicles-16': return (await import('../data/verses/2-chronicles-16.json')).default
    case '2-chronicles-17': return (await import('../data/verses/2-chronicles-17.json')).default
    case '2-chronicles-18': return (await import('../data/verses/2-chronicles-18.json')).default
    case '2-chronicles-19': return (await import('../data/verses/2-chronicles-19.json')).default
    case '2-chronicles-20': return (await import('../data/verses/2-chronicles-20.json')).default
    case '2-chronicles-21': return (await import('../data/verses/2-chronicles-21.json')).default
    case '2-chronicles-22': return (await import('../data/verses/2-chronicles-22.json')).default
    case '2-chronicles-23': return (await import('../data/verses/2-chronicles-23.json')).default
    case '2-chronicles-24': return (await import('../data/verses/2-chronicles-24.json')).default
    case '2-chronicles-25': return (await import('../data/verses/2-chronicles-25.json')).default
    case '2-chronicles-26': return (await import('../data/verses/2-chronicles-26.json')).default
    case '2-chronicles-27': return (await import('../data/verses/2-chronicles-27.json')).default
    case '2-chronicles-28': return (await import('../data/verses/2-chronicles-28.json')).default
    case '2-chronicles-29': return (await import('../data/verses/2-chronicles-29.json')).default
    case '2-chronicles-30': return (await import('../data/verses/2-chronicles-30.json')).default
    case '2-chronicles-31': return (await import('../data/verses/2-chronicles-31.json')).default
    case '2-chronicles-32': return (await import('../data/verses/2-chronicles-32.json')).default
    case '2-chronicles-33': return (await import('../data/verses/2-chronicles-33.json')).default
    case '2-chronicles-34': return (await import('../data/verses/2-chronicles-34.json')).default
    case '2-chronicles-35': return (await import('../data/verses/2-chronicles-35.json')).default
    case '2-chronicles-36': return (await import('../data/verses/2-chronicles-36.json')).default
    case 'ezra-1': return (await import('../data/verses/ezra-1.json')).default
    case 'ezra-2': return (await import('../data/verses/ezra-2.json')).default
    case 'ezra-3': return (await import('../data/verses/ezra-3.json')).default
    case 'ezra-4': return (await import('../data/verses/ezra-4.json')).default
    case 'ezra-5': return (await import('../data/verses/ezra-5.json')).default
    case 'ezra-6': return (await import('../data/verses/ezra-6.json')).default
    case 'ezra-7': return (await import('../data/verses/ezra-7.json')).default
    case 'ezra-8': return (await import('../data/verses/ezra-8.json')).default
    case 'ezra-9': return (await import('../data/verses/ezra-9.json')).default
    case 'ezra-10': return (await import('../data/verses/ezra-10.json')).default
    case 'nehemiah-1': return (await import('../data/verses/nehemiah-1.json')).default
    case 'nehemiah-2': return (await import('../data/verses/nehemiah-2.json')).default
    case 'nehemiah-3': return (await import('../data/verses/nehemiah-3.json')).default
    case 'nehemiah-4': return (await import('../data/verses/nehemiah-4.json')).default
    case 'nehemiah-5': return (await import('../data/verses/nehemiah-5.json')).default
    case 'nehemiah-6': return (await import('../data/verses/nehemiah-6.json')).default
    case 'nehemiah-7': return (await import('../data/verses/nehemiah-7.json')).default
    case 'nehemiah-8': return (await import('../data/verses/nehemiah-8.json')).default
    case 'nehemiah-9': return (await import('../data/verses/nehemiah-9.json')).default
    case 'nehemiah-10': return (await import('../data/verses/nehemiah-10.json')).default
    case 'nehemiah-11': return (await import('../data/verses/nehemiah-11.json')).default
    case 'nehemiah-12': return (await import('../data/verses/nehemiah-12.json')).default
    case 'nehemiah-13': return (await import('../data/verses/nehemiah-13.json')).default
    case 'esther-1': return (await import('../data/verses/esther-1.json')).default
    case 'esther-2': return (await import('../data/verses/esther-2.json')).default
    case 'esther-3': return (await import('../data/verses/esther-3.json')).default
    case 'esther-4': return (await import('../data/verses/esther-4.json')).default
    case 'esther-5': return (await import('../data/verses/esther-5.json')).default
    case 'esther-6': return (await import('../data/verses/esther-6.json')).default
    case 'esther-7': return (await import('../data/verses/esther-7.json')).default
    case 'esther-8': return (await import('../data/verses/esther-8.json')).default
    case 'esther-9': return (await import('../data/verses/esther-9.json')).default
    case 'esther-10': return (await import('../data/verses/esther-10.json')).default
    case 'job-1': return (await import('../data/verses/job-1.json')).default
    case 'job-2': return (await import('../data/verses/job-2.json')).default
    case 'job-3': return (await import('../data/verses/job-3.json')).default
    case 'job-4': return (await import('../data/verses/job-4.json')).default
    case 'job-5': return (await import('../data/verses/job-5.json')).default
    case 'job-6': return (await import('../data/verses/job-6.json')).default
    case 'job-7': return (await import('../data/verses/job-7.json')).default
    case 'job-8': return (await import('../data/verses/job-8.json')).default
    case 'job-9': return (await import('../data/verses/job-9.json')).default
    case 'job-10': return (await import('../data/verses/job-10.json')).default
    case 'job-11': return (await import('../data/verses/job-11.json')).default
    case 'job-12': return (await import('../data/verses/job-12.json')).default
    case 'job-13': return (await import('../data/verses/job-13.json')).default
    case 'job-14': return (await import('../data/verses/job-14.json')).default
    case 'job-15': return (await import('../data/verses/job-15.json')).default
    case 'job-16': return (await import('../data/verses/job-16.json')).default
    case 'job-17': return (await import('../data/verses/job-17.json')).default
    case 'job-18': return (await import('../data/verses/job-18.json')).default
    case 'job-19': return (await import('../data/verses/job-19.json')).default
    case 'job-20': return (await import('../data/verses/job-20.json')).default
    case 'job-21': return (await import('../data/verses/job-21.json')).default
    case 'job-22': return (await import('../data/verses/job-22.json')).default
    case 'job-23': return (await import('../data/verses/job-23.json')).default
    case 'job-24': return (await import('../data/verses/job-24.json')).default
    case 'job-25': return (await import('../data/verses/job-25.json')).default
    case 'job-26': return (await import('../data/verses/job-26.json')).default
    case 'job-27': return (await import('../data/verses/job-27.json')).default
    case 'job-28': return (await import('../data/verses/job-28.json')).default
    case 'job-29': return (await import('../data/verses/job-29.json')).default
    case 'job-30': return (await import('../data/verses/job-30.json')).default
    case 'job-31': return (await import('../data/verses/job-31.json')).default
    case 'job-32': return (await import('../data/verses/job-32.json')).default
    case 'job-33': return (await import('../data/verses/job-33.json')).default
    case 'job-34': return (await import('../data/verses/job-34.json')).default
    case 'job-35': return (await import('../data/verses/job-35.json')).default
    case 'job-36': return (await import('../data/verses/job-36.json')).default
    case 'job-37': return (await import('../data/verses/job-37.json')).default
    case 'job-38': return (await import('../data/verses/job-38.json')).default
    case 'job-39': return (await import('../data/verses/job-39.json')).default
    case 'job-40': return (await import('../data/verses/job-40.json')).default
    case 'job-41': return (await import('../data/verses/job-41.json')).default
    case 'job-42': return (await import('../data/verses/job-42.json')).default
    case 'psalms-1': return (await import('../data/verses/psalms-1.json')).default
    case 'psalms-2': return (await import('../data/verses/psalms-2.json')).default
    case 'psalms-3': return (await import('../data/verses/psalms-3.json')).default
    case 'psalms-4': return (await import('../data/verses/psalms-4.json')).default
    case 'psalms-5': return (await import('../data/verses/psalms-5.json')).default
    case 'psalms-6': return (await import('../data/verses/psalms-6.json')).default
    case 'psalms-7': return (await import('../data/verses/psalms-7.json')).default
    case 'psalms-8': return (await import('../data/verses/psalms-8.json')).default
    case 'psalms-9': return (await import('../data/verses/psalms-9.json')).default
    case 'psalms-10': return (await import('../data/verses/psalms-10.json')).default
    case 'psalms-11': return (await import('../data/verses/psalms-11.json')).default
    case 'psalms-12': return (await import('../data/verses/psalms-12.json')).default
    case 'psalms-13': return (await import('../data/verses/psalms-13.json')).default
    case 'psalms-14': return (await import('../data/verses/psalms-14.json')).default
    case 'psalms-15': return (await import('../data/verses/psalms-15.json')).default
    case 'psalms-16': return (await import('../data/verses/psalms-16.json')).default
    case 'psalms-17': return (await import('../data/verses/psalms-17.json')).default
    case 'psalms-18': return (await import('../data/verses/psalms-18.json')).default
    case 'psalms-19': return (await import('../data/verses/psalms-19.json')).default
    case 'psalms-20': return (await import('../data/verses/psalms-20.json')).default
    case 'psalms-21': return (await import('../data/verses/psalms-21.json')).default
    case 'psalms-22': return (await import('../data/verses/psalms-22.json')).default
    case 'psalms-23': return (await import('../data/verses/psalms-23.json')).default
    case 'psalms-24': return (await import('../data/verses/psalms-24.json')).default
    case 'psalms-25': return (await import('../data/verses/psalms-25.json')).default
    case 'psalms-26': return (await import('../data/verses/psalms-26.json')).default
    case 'psalms-27': return (await import('../data/verses/psalms-27.json')).default
    case 'psalms-28': return (await import('../data/verses/psalms-28.json')).default
    case 'psalms-29': return (await import('../data/verses/psalms-29.json')).default
    case 'psalms-30': return (await import('../data/verses/psalms-30.json')).default
    case 'psalms-31': return (await import('../data/verses/psalms-31.json')).default
    case 'psalms-32': return (await import('../data/verses/psalms-32.json')).default
    case 'psalms-33': return (await import('../data/verses/psalms-33.json')).default
    case 'psalms-34': return (await import('../data/verses/psalms-34.json')).default
    case 'psalms-35': return (await import('../data/verses/psalms-35.json')).default
    case 'psalms-36': return (await import('../data/verses/psalms-36.json')).default
    case 'psalms-37': return (await import('../data/verses/psalms-37.json')).default
    case 'psalms-38': return (await import('../data/verses/psalms-38.json')).default
    case 'psalms-39': return (await import('../data/verses/psalms-39.json')).default
    case 'psalms-40': return (await import('../data/verses/psalms-40.json')).default
    case 'psalms-41': return (await import('../data/verses/psalms-41.json')).default
    case 'psalms-42': return (await import('../data/verses/psalms-42.json')).default
    case 'psalms-43': return (await import('../data/verses/psalms-43.json')).default
    case 'psalms-44': return (await import('../data/verses/psalms-44.json')).default
    case 'psalms-45': return (await import('../data/verses/psalms-45.json')).default
    case 'psalms-46': return (await import('../data/verses/psalms-46.json')).default
    case 'psalms-47': return (await import('../data/verses/psalms-47.json')).default
    case 'psalms-48': return (await import('../data/verses/psalms-48.json')).default
    case 'psalms-49': return (await import('../data/verses/psalms-49.json')).default
    case 'psalms-50': return (await import('../data/verses/psalms-50.json')).default
    case 'psalms-51': return (await import('../data/verses/psalms-51.json')).default
    case 'psalms-52': return (await import('../data/verses/psalms-52.json')).default
    case 'psalms-53': return (await import('../data/verses/psalms-53.json')).default
    case 'psalms-54': return (await import('../data/verses/psalms-54.json')).default
    case 'psalms-55': return (await import('../data/verses/psalms-55.json')).default
    case 'psalms-56': return (await import('../data/verses/psalms-56.json')).default
    case 'psalms-57': return (await import('../data/verses/psalms-57.json')).default
    case 'psalms-58': return (await import('../data/verses/psalms-58.json')).default
    case 'psalms-59': return (await import('../data/verses/psalms-59.json')).default
    case 'psalms-60': return (await import('../data/verses/psalms-60.json')).default
    case 'psalms-61': return (await import('../data/verses/psalms-61.json')).default
    case 'psalms-62': return (await import('../data/verses/psalms-62.json')).default
    case 'psalms-63': return (await import('../data/verses/psalms-63.json')).default
    case 'psalms-64': return (await import('../data/verses/psalms-64.json')).default
    case 'psalms-65': return (await import('../data/verses/psalms-65.json')).default
    case 'psalms-66': return (await import('../data/verses/psalms-66.json')).default
    case 'psalms-67': return (await import('../data/verses/psalms-67.json')).default
    case 'psalms-68': return (await import('../data/verses/psalms-68.json')).default
    case 'psalms-69': return (await import('../data/verses/psalms-69.json')).default
    case 'psalms-70': return (await import('../data/verses/psalms-70.json')).default
    case 'psalms-71': return (await import('../data/verses/psalms-71.json')).default
    case 'psalms-72': return (await import('../data/verses/psalms-72.json')).default
    case 'psalms-73': return (await import('../data/verses/psalms-73.json')).default
    case 'psalms-74': return (await import('../data/verses/psalms-74.json')).default
    case 'psalms-75': return (await import('../data/verses/psalms-75.json')).default
    case 'psalms-76': return (await import('../data/verses/psalms-76.json')).default
    case 'psalms-77': return (await import('../data/verses/psalms-77.json')).default
    case 'psalms-78': return (await import('../data/verses/psalms-78.json')).default
    case 'psalms-79': return (await import('../data/verses/psalms-79.json')).default
    case 'psalms-80': return (await import('../data/verses/psalms-80.json')).default
    case 'psalms-81': return (await import('../data/verses/psalms-81.json')).default
    case 'psalms-82': return (await import('../data/verses/psalms-82.json')).default
    case 'psalms-83': return (await import('../data/verses/psalms-83.json')).default
    case 'psalms-84': return (await import('../data/verses/psalms-84.json')).default
    case 'psalms-85': return (await import('../data/verses/psalms-85.json')).default
    case 'psalms-86': return (await import('../data/verses/psalms-86.json')).default
    case 'psalms-87': return (await import('../data/verses/psalms-87.json')).default
    case 'psalms-88': return (await import('../data/verses/psalms-88.json')).default
    case 'psalms-89': return (await import('../data/verses/psalms-89.json')).default
    case 'psalms-90': return (await import('../data/verses/psalms-90.json')).default
    case 'psalms-91': return (await import('../data/verses/psalms-91.json')).default
    case 'psalms-92': return (await import('../data/verses/psalms-92.json')).default
    case 'psalms-93': return (await import('../data/verses/psalms-93.json')).default
    case 'psalms-94': return (await import('../data/verses/psalms-94.json')).default
    case 'psalms-95': return (await import('../data/verses/psalms-95.json')).default
    case 'psalms-96': return (await import('../data/verses/psalms-96.json')).default
    case 'psalms-97': return (await import('../data/verses/psalms-97.json')).default
    case 'psalms-98': return (await import('../data/verses/psalms-98.json')).default
    case 'psalms-99': return (await import('../data/verses/psalms-99.json')).default
    case 'psalms-100': return (await import('../data/verses/psalms-100.json')).default
    case 'psalms-101': return (await import('../data/verses/psalms-101.json')).default
    case 'psalms-102': return (await import('../data/verses/psalms-102.json')).default
    case 'psalms-103': return (await import('../data/verses/psalms-103.json')).default
    case 'psalms-104': return (await import('../data/verses/psalms-104.json')).default
    case 'psalms-105': return (await import('../data/verses/psalms-105.json')).default
    case 'psalms-106': return (await import('../data/verses/psalms-106.json')).default
    case 'psalms-107': return (await import('../data/verses/psalms-107.json')).default
    case 'psalms-108': return (await import('../data/verses/psalms-108.json')).default
    case 'psalms-109': return (await import('../data/verses/psalms-109.json')).default
    case 'psalms-110': return (await import('../data/verses/psalms-110.json')).default
    case 'psalms-111': return (await import('../data/verses/psalms-111.json')).default
    case 'psalms-112': return (await import('../data/verses/psalms-112.json')).default
    case 'psalms-113': return (await import('../data/verses/psalms-113.json')).default
    case 'psalms-114': return (await import('../data/verses/psalms-114.json')).default
    case 'psalms-115': return (await import('../data/verses/psalms-115.json')).default
    case 'psalms-116': return (await import('../data/verses/psalms-116.json')).default
    case 'psalms-117': return (await import('../data/verses/psalms-117.json')).default
    case 'psalms-118': return (await import('../data/verses/psalms-118.json')).default
    case 'psalms-119': return (await import('../data/verses/psalms-119.json')).default
    case 'psalms-120': return (await import('../data/verses/psalms-120.json')).default
    case 'psalms-121': return (await import('../data/verses/psalms-121.json')).default
    case 'psalms-122': return (await import('../data/verses/psalms-122.json')).default
    case 'psalms-123': return (await import('../data/verses/psalms-123.json')).default
    case 'psalms-124': return (await import('../data/verses/psalms-124.json')).default
    case 'psalms-125': return (await import('../data/verses/psalms-125.json')).default
    case 'psalms-126': return (await import('../data/verses/psalms-126.json')).default
    case 'psalms-127': return (await import('../data/verses/psalms-127.json')).default
    case 'psalms-128': return (await import('../data/verses/psalms-128.json')).default
    case 'psalms-129': return (await import('../data/verses/psalms-129.json')).default
    case 'psalms-130': return (await import('../data/verses/psalms-130.json')).default
    case 'psalms-131': return (await import('../data/verses/psalms-131.json')).default
    case 'psalms-132': return (await import('../data/verses/psalms-132.json')).default
    case 'psalms-133': return (await import('../data/verses/psalms-133.json')).default
    case 'psalms-134': return (await import('../data/verses/psalms-134.json')).default
    case 'psalms-135': return (await import('../data/verses/psalms-135.json')).default
    case 'psalms-136': return (await import('../data/verses/psalms-136.json')).default
    case 'psalms-137': return (await import('../data/verses/psalms-137.json')).default
    case 'psalms-138': return (await import('../data/verses/psalms-138.json')).default
    case 'psalms-139': return (await import('../data/verses/psalms-139.json')).default
    case 'psalms-140': return (await import('../data/verses/psalms-140.json')).default
    case 'psalms-141': return (await import('../data/verses/psalms-141.json')).default
    case 'psalms-142': return (await import('../data/verses/psalms-142.json')).default
    case 'psalms-143': return (await import('../data/verses/psalms-143.json')).default
    case 'psalms-144': return (await import('../data/verses/psalms-144.json')).default
    case 'psalms-145': return (await import('../data/verses/psalms-145.json')).default
    case 'psalms-146': return (await import('../data/verses/psalms-146.json')).default
    case 'psalms-147': return (await import('../data/verses/psalms-147.json')).default
    case 'psalms-148': return (await import('../data/verses/psalms-148.json')).default
    case 'psalms-149': return (await import('../data/verses/psalms-149.json')).default
    case 'psalms-150': return (await import('../data/verses/psalms-150.json')).default
    case 'proverbs-1': return (await import('../data/verses/proverbs-1.json')).default
    case 'proverbs-2': return (await import('../data/verses/proverbs-2.json')).default
    case 'proverbs-3': return (await import('../data/verses/proverbs-3.json')).default
    case 'proverbs-4': return (await import('../data/verses/proverbs-4.json')).default
    case 'proverbs-5': return (await import('../data/verses/proverbs-5.json')).default
    case 'proverbs-6': return (await import('../data/verses/proverbs-6.json')).default
    case 'proverbs-7': return (await import('../data/verses/proverbs-7.json')).default
    case 'proverbs-8': return (await import('../data/verses/proverbs-8.json')).default
    case 'proverbs-9': return (await import('../data/verses/proverbs-9.json')).default
    case 'proverbs-10': return (await import('../data/verses/proverbs-10.json')).default
    case 'proverbs-11': return (await import('../data/verses/proverbs-11.json')).default
    case 'proverbs-12': return (await import('../data/verses/proverbs-12.json')).default
    case 'proverbs-13': return (await import('../data/verses/proverbs-13.json')).default
    case 'proverbs-14': return (await import('../data/verses/proverbs-14.json')).default
    case 'proverbs-15': return (await import('../data/verses/proverbs-15.json')).default
    case 'proverbs-16': return (await import('../data/verses/proverbs-16.json')).default
    case 'proverbs-17': return (await import('../data/verses/proverbs-17.json')).default
    case 'proverbs-18': return (await import('../data/verses/proverbs-18.json')).default
    case 'proverbs-19': return (await import('../data/verses/proverbs-19.json')).default
    case 'proverbs-20': return (await import('../data/verses/proverbs-20.json')).default
    case 'proverbs-21': return (await import('../data/verses/proverbs-21.json')).default
    case 'proverbs-22': return (await import('../data/verses/proverbs-22.json')).default
    case 'proverbs-23': return (await import('../data/verses/proverbs-23.json')).default
    case 'proverbs-24': return (await import('../data/verses/proverbs-24.json')).default
    case 'proverbs-25': return (await import('../data/verses/proverbs-25.json')).default
    case 'proverbs-26': return (await import('../data/verses/proverbs-26.json')).default
    case 'proverbs-27': return (await import('../data/verses/proverbs-27.json')).default
    case 'proverbs-28': return (await import('../data/verses/proverbs-28.json')).default
    case 'proverbs-29': return (await import('../data/verses/proverbs-29.json')).default
    case 'proverbs-30': return (await import('../data/verses/proverbs-30.json')).default
    case 'proverbs-31': return (await import('../data/verses/proverbs-31.json')).default
    case 'ecclesiastes-1': return (await import('../data/verses/ecclesiastes-1.json')).default
    case 'ecclesiastes-2': return (await import('../data/verses/ecclesiastes-2.json')).default
    case 'ecclesiastes-3': return (await import('../data/verses/ecclesiastes-3.json')).default
    case 'ecclesiastes-4': return (await import('../data/verses/ecclesiastes-4.json')).default
    case 'ecclesiastes-5': return (await import('../data/verses/ecclesiastes-5.json')).default
    case 'ecclesiastes-6': return (await import('../data/verses/ecclesiastes-6.json')).default
    case 'ecclesiastes-7': return (await import('../data/verses/ecclesiastes-7.json')).default
    case 'ecclesiastes-8': return (await import('../data/verses/ecclesiastes-8.json')).default
    case 'ecclesiastes-9': return (await import('../data/verses/ecclesiastes-9.json')).default
    case 'ecclesiastes-10': return (await import('../data/verses/ecclesiastes-10.json')).default
    case 'ecclesiastes-11': return (await import('../data/verses/ecclesiastes-11.json')).default
    case 'ecclesiastes-12': return (await import('../data/verses/ecclesiastes-12.json')).default
    case 'song-1': return (await import('../data/verses/song-1.json')).default
    case 'song-2': return (await import('../data/verses/song-2.json')).default
    case 'song-3': return (await import('../data/verses/song-3.json')).default
    case 'song-4': return (await import('../data/verses/song-4.json')).default
    case 'song-5': return (await import('../data/verses/song-5.json')).default
    case 'song-6': return (await import('../data/verses/song-6.json')).default
    case 'song-7': return (await import('../data/verses/song-7.json')).default
    case 'song-8': return (await import('../data/verses/song-8.json')).default
    case 'isaiah-1': return (await import('../data/verses/isaiah-1.json')).default
    case 'isaiah-2': return (await import('../data/verses/isaiah-2.json')).default
    case 'isaiah-3': return (await import('../data/verses/isaiah-3.json')).default
    case 'isaiah-4': return (await import('../data/verses/isaiah-4.json')).default
    case 'isaiah-5': return (await import('../data/verses/isaiah-5.json')).default
    case 'isaiah-6': return (await import('../data/verses/isaiah-6.json')).default
    case 'isaiah-7': return (await import('../data/verses/isaiah-7.json')).default
    case 'isaiah-8': return (await import('../data/verses/isaiah-8.json')).default
    case 'isaiah-9': return (await import('../data/verses/isaiah-9.json')).default
    case 'isaiah-10': return (await import('../data/verses/isaiah-10.json')).default
    case 'isaiah-11': return (await import('../data/verses/isaiah-11.json')).default
    case 'isaiah-12': return (await import('../data/verses/isaiah-12.json')).default
    case 'isaiah-13': return (await import('../data/verses/isaiah-13.json')).default
    case 'isaiah-14': return (await import('../data/verses/isaiah-14.json')).default
    case 'isaiah-15': return (await import('../data/verses/isaiah-15.json')).default
    case 'isaiah-16': return (await import('../data/verses/isaiah-16.json')).default
    case 'isaiah-17': return (await import('../data/verses/isaiah-17.json')).default
    case 'isaiah-18': return (await import('../data/verses/isaiah-18.json')).default
    case 'isaiah-19': return (await import('../data/verses/isaiah-19.json')).default
    case 'isaiah-20': return (await import('../data/verses/isaiah-20.json')).default
    case 'isaiah-21': return (await import('../data/verses/isaiah-21.json')).default
    case 'isaiah-22': return (await import('../data/verses/isaiah-22.json')).default
    case 'isaiah-23': return (await import('../data/verses/isaiah-23.json')).default
    case 'isaiah-24': return (await import('../data/verses/isaiah-24.json')).default
    case 'isaiah-25': return (await import('../data/verses/isaiah-25.json')).default
    case 'isaiah-26': return (await import('../data/verses/isaiah-26.json')).default
    case 'isaiah-27': return (await import('../data/verses/isaiah-27.json')).default
    case 'isaiah-28': return (await import('../data/verses/isaiah-28.json')).default
    case 'isaiah-29': return (await import('../data/verses/isaiah-29.json')).default
    case 'isaiah-30': return (await import('../data/verses/isaiah-30.json')).default
    case 'isaiah-31': return (await import('../data/verses/isaiah-31.json')).default
    case 'isaiah-32': return (await import('../data/verses/isaiah-32.json')).default
    case 'isaiah-33': return (await import('../data/verses/isaiah-33.json')).default
    case 'isaiah-34': return (await import('../data/verses/isaiah-34.json')).default
    case 'isaiah-35': return (await import('../data/verses/isaiah-35.json')).default
    case 'isaiah-36': return (await import('../data/verses/isaiah-36.json')).default
    case 'isaiah-37': return (await import('../data/verses/isaiah-37.json')).default
    case 'isaiah-38': return (await import('../data/verses/isaiah-38.json')).default
    case 'isaiah-39': return (await import('../data/verses/isaiah-39.json')).default
    case 'isaiah-40': return (await import('../data/verses/isaiah-40.json')).default
    case 'isaiah-41': return (await import('../data/verses/isaiah-41.json')).default
    case 'isaiah-42': return (await import('../data/verses/isaiah-42.json')).default
    case 'isaiah-43': return (await import('../data/verses/isaiah-43.json')).default
    case 'isaiah-44': return (await import('../data/verses/isaiah-44.json')).default
    case 'isaiah-45': return (await import('../data/verses/isaiah-45.json')).default
    case 'isaiah-46': return (await import('../data/verses/isaiah-46.json')).default
    case 'isaiah-47': return (await import('../data/verses/isaiah-47.json')).default
    case 'isaiah-48': return (await import('../data/verses/isaiah-48.json')).default
    case 'isaiah-49': return (await import('../data/verses/isaiah-49.json')).default
    case 'isaiah-50': return (await import('../data/verses/isaiah-50.json')).default
    case 'isaiah-51': return (await import('../data/verses/isaiah-51.json')).default
    case 'isaiah-52': return (await import('../data/verses/isaiah-52.json')).default
    case 'isaiah-53': return (await import('../data/verses/isaiah-53.json')).default
    case 'isaiah-54': return (await import('../data/verses/isaiah-54.json')).default
    case 'isaiah-55': return (await import('../data/verses/isaiah-55.json')).default
    case 'isaiah-56': return (await import('../data/verses/isaiah-56.json')).default
    case 'isaiah-57': return (await import('../data/verses/isaiah-57.json')).default
    case 'isaiah-58': return (await import('../data/verses/isaiah-58.json')).default
    case 'isaiah-59': return (await import('../data/verses/isaiah-59.json')).default
    case 'isaiah-60': return (await import('../data/verses/isaiah-60.json')).default
    case 'isaiah-61': return (await import('../data/verses/isaiah-61.json')).default
    case 'isaiah-62': return (await import('../data/verses/isaiah-62.json')).default
    case 'isaiah-63': return (await import('../data/verses/isaiah-63.json')).default
    case 'isaiah-64': return (await import('../data/verses/isaiah-64.json')).default
    case 'isaiah-65': return (await import('../data/verses/isaiah-65.json')).default
    case 'isaiah-66': return (await import('../data/verses/isaiah-66.json')).default
    case 'jeremiah-1': return (await import('../data/verses/jeremiah-1.json')).default
    case 'jeremiah-2': return (await import('../data/verses/jeremiah-2.json')).default
    case 'jeremiah-3': return (await import('../data/verses/jeremiah-3.json')).default
    case 'jeremiah-4': return (await import('../data/verses/jeremiah-4.json')).default
    case 'jeremiah-5': return (await import('../data/verses/jeremiah-5.json')).default
    case 'jeremiah-6': return (await import('../data/verses/jeremiah-6.json')).default
    case 'jeremiah-7': return (await import('../data/verses/jeremiah-7.json')).default
    case 'jeremiah-8': return (await import('../data/verses/jeremiah-8.json')).default
    case 'jeremiah-9': return (await import('../data/verses/jeremiah-9.json')).default
    case 'jeremiah-10': return (await import('../data/verses/jeremiah-10.json')).default
    case 'jeremiah-11': return (await import('../data/verses/jeremiah-11.json')).default
    case 'jeremiah-12': return (await import('../data/verses/jeremiah-12.json')).default
    case 'jeremiah-13': return (await import('../data/verses/jeremiah-13.json')).default
    case 'jeremiah-14': return (await import('../data/verses/jeremiah-14.json')).default
    case 'jeremiah-15': return (await import('../data/verses/jeremiah-15.json')).default
    case 'jeremiah-16': return (await import('../data/verses/jeremiah-16.json')).default
    case 'jeremiah-17': return (await import('../data/verses/jeremiah-17.json')).default
    case 'jeremiah-18': return (await import('../data/verses/jeremiah-18.json')).default
    case 'jeremiah-19': return (await import('../data/verses/jeremiah-19.json')).default
    case 'jeremiah-20': return (await import('../data/verses/jeremiah-20.json')).default
    case 'jeremiah-21': return (await import('../data/verses/jeremiah-21.json')).default
    case 'jeremiah-22': return (await import('../data/verses/jeremiah-22.json')).default
    case 'jeremiah-23': return (await import('../data/verses/jeremiah-23.json')).default
    case 'jeremiah-24': return (await import('../data/verses/jeremiah-24.json')).default
    case 'jeremiah-25': return (await import('../data/verses/jeremiah-25.json')).default
    case 'jeremiah-26': return (await import('../data/verses/jeremiah-26.json')).default
    case 'jeremiah-27': return (await import('../data/verses/jeremiah-27.json')).default
    case 'jeremiah-28': return (await import('../data/verses/jeremiah-28.json')).default
    case 'jeremiah-29': return (await import('../data/verses/jeremiah-29.json')).default
    case 'jeremiah-30': return (await import('../data/verses/jeremiah-30.json')).default
    case 'jeremiah-31': return (await import('../data/verses/jeremiah-31.json')).default
    case 'jeremiah-32': return (await import('../data/verses/jeremiah-32.json')).default
    case 'jeremiah-33': return (await import('../data/verses/jeremiah-33.json')).default
    case 'jeremiah-34': return (await import('../data/verses/jeremiah-34.json')).default
    case 'jeremiah-35': return (await import('../data/verses/jeremiah-35.json')).default
    case 'jeremiah-36': return (await import('../data/verses/jeremiah-36.json')).default
    case 'jeremiah-37': return (await import('../data/verses/jeremiah-37.json')).default
    case 'jeremiah-38': return (await import('../data/verses/jeremiah-38.json')).default
    case 'jeremiah-39': return (await import('../data/verses/jeremiah-39.json')).default
    case 'jeremiah-40': return (await import('../data/verses/jeremiah-40.json')).default
    case 'jeremiah-41': return (await import('../data/verses/jeremiah-41.json')).default
    case 'jeremiah-42': return (await import('../data/verses/jeremiah-42.json')).default
    case 'jeremiah-43': return (await import('../data/verses/jeremiah-43.json')).default
    case 'jeremiah-44': return (await import('../data/verses/jeremiah-44.json')).default
    case 'jeremiah-45': return (await import('../data/verses/jeremiah-45.json')).default
    case 'jeremiah-46': return (await import('../data/verses/jeremiah-46.json')).default
    case 'jeremiah-47': return (await import('../data/verses/jeremiah-47.json')).default
    case 'jeremiah-48': return (await import('../data/verses/jeremiah-48.json')).default
    case 'jeremiah-49': return (await import('../data/verses/jeremiah-49.json')).default
    case 'jeremiah-50': return (await import('../data/verses/jeremiah-50.json')).default
    case 'jeremiah-51': return (await import('../data/verses/jeremiah-51.json')).default
    case 'jeremiah-52': return (await import('../data/verses/jeremiah-52.json')).default
    case 'lamentations-1': return (await import('../data/verses/lamentations-1.json')).default
    case 'lamentations-2': return (await import('../data/verses/lamentations-2.json')).default
    case 'lamentations-3': return (await import('../data/verses/lamentations-3.json')).default
    case 'lamentations-4': return (await import('../data/verses/lamentations-4.json')).default
    case 'lamentations-5': return (await import('../data/verses/lamentations-5.json')).default
    case 'ezekiel-1': return (await import('../data/verses/ezekiel-1.json')).default
    case 'ezekiel-2': return (await import('../data/verses/ezekiel-2.json')).default
    case 'ezekiel-3': return (await import('../data/verses/ezekiel-3.json')).default
    case 'ezekiel-4': return (await import('../data/verses/ezekiel-4.json')).default
    case 'ezekiel-5': return (await import('../data/verses/ezekiel-5.json')).default
    case 'ezekiel-6': return (await import('../data/verses/ezekiel-6.json')).default
    case 'ezekiel-7': return (await import('../data/verses/ezekiel-7.json')).default
    case 'ezekiel-8': return (await import('../data/verses/ezekiel-8.json')).default
    case 'ezekiel-9': return (await import('../data/verses/ezekiel-9.json')).default
    case 'ezekiel-10': return (await import('../data/verses/ezekiel-10.json')).default
    case 'ezekiel-11': return (await import('../data/verses/ezekiel-11.json')).default
    case 'ezekiel-12': return (await import('../data/verses/ezekiel-12.json')).default
    case 'ezekiel-13': return (await import('../data/verses/ezekiel-13.json')).default
    case 'ezekiel-14': return (await import('../data/verses/ezekiel-14.json')).default
    case 'ezekiel-15': return (await import('../data/verses/ezekiel-15.json')).default
    case 'ezekiel-16': return (await import('../data/verses/ezekiel-16.json')).default
    case 'ezekiel-17': return (await import('../data/verses/ezekiel-17.json')).default
    case 'ezekiel-18': return (await import('../data/verses/ezekiel-18.json')).default
    case 'ezekiel-19': return (await import('../data/verses/ezekiel-19.json')).default
    case 'ezekiel-20': return (await import('../data/verses/ezekiel-20.json')).default
    case 'ezekiel-21': return (await import('../data/verses/ezekiel-21.json')).default
    case 'ezekiel-22': return (await import('../data/verses/ezekiel-22.json')).default
    case 'ezekiel-23': return (await import('../data/verses/ezekiel-23.json')).default
    case 'ezekiel-24': return (await import('../data/verses/ezekiel-24.json')).default
    case 'ezekiel-25': return (await import('../data/verses/ezekiel-25.json')).default
    case 'ezekiel-26': return (await import('../data/verses/ezekiel-26.json')).default
    case 'ezekiel-27': return (await import('../data/verses/ezekiel-27.json')).default
    case 'ezekiel-28': return (await import('../data/verses/ezekiel-28.json')).default
    case 'ezekiel-29': return (await import('../data/verses/ezekiel-29.json')).default
    case 'ezekiel-30': return (await import('../data/verses/ezekiel-30.json')).default
    case 'ezekiel-31': return (await import('../data/verses/ezekiel-31.json')).default
    case 'ezekiel-32': return (await import('../data/verses/ezekiel-32.json')).default
    case 'ezekiel-33': return (await import('../data/verses/ezekiel-33.json')).default
    case 'ezekiel-34': return (await import('../data/verses/ezekiel-34.json')).default
    case 'ezekiel-35': return (await import('../data/verses/ezekiel-35.json')).default
    case 'ezekiel-36': return (await import('../data/verses/ezekiel-36.json')).default
    case 'ezekiel-37': return (await import('../data/verses/ezekiel-37.json')).default
    case 'ezekiel-38': return (await import('../data/verses/ezekiel-38.json')).default
    case 'ezekiel-39': return (await import('../data/verses/ezekiel-39.json')).default
    case 'ezekiel-40': return (await import('../data/verses/ezekiel-40.json')).default
    case 'ezekiel-41': return (await import('../data/verses/ezekiel-41.json')).default
    case 'ezekiel-42': return (await import('../data/verses/ezekiel-42.json')).default
    case 'ezekiel-43': return (await import('../data/verses/ezekiel-43.json')).default
    case 'ezekiel-44': return (await import('../data/verses/ezekiel-44.json')).default
    case 'ezekiel-45': return (await import('../data/verses/ezekiel-45.json')).default
    case 'ezekiel-46': return (await import('../data/verses/ezekiel-46.json')).default
    case 'ezekiel-47': return (await import('../data/verses/ezekiel-47.json')).default
    case 'ezekiel-48': return (await import('../data/verses/ezekiel-48.json')).default
    case 'daniel-1': return (await import('../data/verses/daniel-1.json')).default
    case 'daniel-2': return (await import('../data/verses/daniel-2.json')).default
    case 'daniel-3': return (await import('../data/verses/daniel-3.json')).default
    case 'daniel-4': return (await import('../data/verses/daniel-4.json')).default
    case 'daniel-5': return (await import('../data/verses/daniel-5.json')).default
    case 'daniel-6': return (await import('../data/verses/daniel-6.json')).default
    case 'daniel-7': return (await import('../data/verses/daniel-7.json')).default
    case 'daniel-8': return (await import('../data/verses/daniel-8.json')).default
    case 'daniel-9': return (await import('../data/verses/daniel-9.json')).default
    case 'daniel-10': return (await import('../data/verses/daniel-10.json')).default
    case 'daniel-11': return (await import('../data/verses/daniel-11.json')).default
    case 'daniel-12': return (await import('../data/verses/daniel-12.json')).default
    case 'hosea-1': return (await import('../data/verses/hosea-1.json')).default
    case 'hosea-2': return (await import('../data/verses/hosea-2.json')).default
    case 'hosea-3': return (await import('../data/verses/hosea-3.json')).default
    case 'hosea-4': return (await import('../data/verses/hosea-4.json')).default
    case 'hosea-5': return (await import('../data/verses/hosea-5.json')).default
    case 'hosea-6': return (await import('../data/verses/hosea-6.json')).default
    case 'hosea-7': return (await import('../data/verses/hosea-7.json')).default
    case 'hosea-8': return (await import('../data/verses/hosea-8.json')).default
    case 'hosea-9': return (await import('../data/verses/hosea-9.json')).default
    case 'hosea-10': return (await import('../data/verses/hosea-10.json')).default
    case 'hosea-11': return (await import('../data/verses/hosea-11.json')).default
    case 'hosea-12': return (await import('../data/verses/hosea-12.json')).default
    case 'hosea-13': return (await import('../data/verses/hosea-13.json')).default
    case 'hosea-14': return (await import('../data/verses/hosea-14.json')).default
    case 'joel-1': return (await import('../data/verses/joel-1.json')).default
    case 'joel-2': return (await import('../data/verses/joel-2.json')).default
    case 'joel-3': return (await import('../data/verses/joel-3.json')).default
    case 'amos-1': return (await import('../data/verses/amos-1.json')).default
    case 'amos-2': return (await import('../data/verses/amos-2.json')).default
    case 'amos-3': return (await import('../data/verses/amos-3.json')).default
    case 'amos-4': return (await import('../data/verses/amos-4.json')).default
    case 'amos-5': return (await import('../data/verses/amos-5.json')).default
    case 'amos-6': return (await import('../data/verses/amos-6.json')).default
    case 'amos-7': return (await import('../data/verses/amos-7.json')).default
    case 'amos-8': return (await import('../data/verses/amos-8.json')).default
    case 'amos-9': return (await import('../data/verses/amos-9.json')).default
    case 'obadiah-1': return (await import('../data/verses/obadiah-1.json')).default
    case 'jonah-1': return (await import('../data/verses/jonah-1.json')).default
    case 'jonah-2': return (await import('../data/verses/jonah-2.json')).default
    case 'jonah-3': return (await import('../data/verses/jonah-3.json')).default
    case 'jonah-4': return (await import('../data/verses/jonah-4.json')).default
    case 'micah-1': return (await import('../data/verses/micah-1.json')).default
    case 'micah-2': return (await import('../data/verses/micah-2.json')).default
    case 'micah-3': return (await import('../data/verses/micah-3.json')).default
    case 'micah-4': return (await import('../data/verses/micah-4.json')).default
    case 'micah-5': return (await import('../data/verses/micah-5.json')).default
    case 'micah-6': return (await import('../data/verses/micah-6.json')).default
    case 'micah-7': return (await import('../data/verses/micah-7.json')).default
    case 'nahum-1': return (await import('../data/verses/nahum-1.json')).default
    case 'nahum-2': return (await import('../data/verses/nahum-2.json')).default
    case 'nahum-3': return (await import('../data/verses/nahum-3.json')).default
    case 'habakkuk-1': return (await import('../data/verses/habakkuk-1.json')).default
    case 'habakkuk-2': return (await import('../data/verses/habakkuk-2.json')).default
    case 'habakkuk-3': return (await import('../data/verses/habakkuk-3.json')).default
    case 'zephaniah-1': return (await import('../data/verses/zephaniah-1.json')).default
    case 'zephaniah-2': return (await import('../data/verses/zephaniah-2.json')).default
    case 'zephaniah-3': return (await import('../data/verses/zephaniah-3.json')).default
    case 'haggai-1': return (await import('../data/verses/haggai-1.json')).default
    case 'haggai-2': return (await import('../data/verses/haggai-2.json')).default
    case 'zechariah-1': return (await import('../data/verses/zechariah-1.json')).default
    case 'zechariah-2': return (await import('../data/verses/zechariah-2.json')).default
    case 'zechariah-3': return (await import('../data/verses/zechariah-3.json')).default
    case 'zechariah-4': return (await import('../data/verses/zechariah-4.json')).default
    case 'zechariah-5': return (await import('../data/verses/zechariah-5.json')).default
    case 'zechariah-6': return (await import('../data/verses/zechariah-6.json')).default
    case 'zechariah-7': return (await import('../data/verses/zechariah-7.json')).default
    case 'zechariah-8': return (await import('../data/verses/zechariah-8.json')).default
    case 'zechariah-9': return (await import('../data/verses/zechariah-9.json')).default
    case 'zechariah-10': return (await import('../data/verses/zechariah-10.json')).default
    case 'zechariah-11': return (await import('../data/verses/zechariah-11.json')).default
    case 'zechariah-12': return (await import('../data/verses/zechariah-12.json')).default
    case 'zechariah-13': return (await import('../data/verses/zechariah-13.json')).default
    case 'zechariah-14': return (await import('../data/verses/zechariah-14.json')).default
    case 'malachi-1': return (await import('../data/verses/malachi-1.json')).default
    case 'malachi-2': return (await import('../data/verses/malachi-2.json')).default
    case 'malachi-3': return (await import('../data/verses/malachi-3.json')).default
    default: throw new Error(`Unknown chapter id: ${chapterId}`)
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {number} initialStageIndex  - which stage to start on (1-based)
 * @returns {{
 *   chapterData: object|null,   // the raw JSON (verses, book, chapter, stage_index)
 *   chapterMeta: object|null,   // registry entry for the current chapter
 *   stageIndex:  number,        // current stage index
 *   isLoading:   boolean,
 *   hasNext:     boolean,       // whether a next chapter exists
 *   jumpToStage: (si: number) => void,  // immediately switch to a different stage
 *   advanceToNext: () => void,  // advance to stage_index + 1
 * }}
 */
export function useChapterLoader(initialStageIndex = 1) {
  const [stageIndex, setStageIndex] = useState(initialStageIndex)
  const [chapterData, setChapterData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // Monotonically increasing counter — bumped on every successful load so consumers
  // can reliably detect new data even when bouncing between the same two stages.
  const [loadId, setLoadId] = useState(0)

  // Sync internal state when the caller changes the requested stage index.
  // useState only uses its argument on first mount, so this effect bridges
  // subsequent prop changes into the hook's internal state.
  useEffect(() => {
    setStageIndex(initialStageIndex)
  }, [initialStageIndex])

  useEffect(() => {
    let cancelled = false
    const meta = BY_STAGE[stageIndex]
    if (!meta) {
      console.error(`[useChapterLoader] No chapter registered for stage_index ${stageIndex}`)
      return
    }

    setIsLoading(true)

    // Safety timeout — if the import never resolves (e.g. due to a rapid-flick
    // race that leaves a cancelled request mid-flight), escape the loading screen
    // after 10 seconds rather than hanging forever.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[useChapterLoader] Load timeout — resetting isLoading')
        setIsLoading(false)
      }
    }, 10_000)

    importChapterById(meta.id)
      .then((data) => {
        clearTimeout(timeout)
        if (!cancelled) {
          setChapterData(data)
          setIsLoading(false)
          setLoadId((prev) => prev + 1)
        }
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.error('[useChapterLoader] Failed to load chapter:', err)
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [stageIndex])

  const jumpToStage = useCallback((si) => {
    if (BY_STAGE[si]) setStageIndex(si)
    else console.warn(`[useChapterLoader] jumpToStage: stage ${si} not in registry`)
  }, [])

  const advanceToNext = useCallback(() => {
    setStageIndex((cur) => {
      const next = cur + 1
      if (BY_STAGE[next]) return next
      console.log('[useChapterLoader] No next chapter — end of canon reached!')
      return cur
    })
  }, [])

  const goToPrev = useCallback(() => {
    setStageIndex((cur) => {
      const prev = cur - 1
      if (BY_STAGE[prev]) return prev
      console.log('[useChapterLoader] No previous chapter — already at beginning!')
      return cur
    })
  }, [])

  const chapterMeta = BY_STAGE[stageIndex] ?? null
  const hasNext = Boolean(BY_STAGE[stageIndex + 1])
  const hasPrev = Boolean(BY_STAGE[stageIndex - 1])

  return { chapterData, chapterMeta, stageIndex, isLoading, loadId, hasNext, hasPrev, jumpToStage, advanceToNext, goToPrev }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve stage_index from a chapter id string */
export function stageIndexFromId(chapterId) {
  return BY_ID[chapterId]?.stageIndex ?? 1
}

/** Resolve chapter id from a stage_index */
export function idFromStageIndex(stageIndex) {
  return BY_STAGE[stageIndex]?.id ?? null
}
