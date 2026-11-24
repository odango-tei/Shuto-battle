/**
 * 首都戦記 - 簡略化エリアデータ
 *
 * 出典：東京都デジタルツイン実現プロジェクト
 * ライセンス：CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.ja)
 * 変更：ゲーム用に新宿・渋谷の2エリアの境界・ランドマークを簡略化し、
 *       ローカル座標系に変換した。
 */
window.AREA_DATA = {
  attribution: {
    source: "東京都デジタルツイン実現プロジェクト",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.ja",
    note: "ゲーム用にエリア形状・ランドマークを簡略化"
  },
  areas: [
    {
      id: "shinjuku",
      name: "新宿",
      color: "#2563eb",
      fill: "rgba(37, 99, 235, 0.18)",
      stroke: "rgba(96, 165, 250, 0.95)",
      // Simplified polygon (local game coordinates)
      polygon: [
        [210, 40], [520, 40], [560, 90], [560, 170], [520, 230],
        [430, 260], [330, 260], [240, 230], [180, 170], [180, 90]
      ],
      labelPos: [360, 150],
      description: "高層ビルと繁華街が交差する首都の中枢エリア。",
      landmarks: [
        { name: "新宿駅", pos: [350, 190], type: "station" },
        { name: "東京都庁", pos: [270, 100], type: "gov" },
        { name: "歌舞伎町", pos: [440, 120], type: "spot" },
        { name: "新宿御苑", pos: [470, 210], type: "park" }
      ]
    },
    {
      id: "shibuya",
      name: "渋谷",
      color: "#db2777",
      fill: "rgba(219, 39, 119, 0.18)",
      stroke: "rgba(244, 114, 182, 0.95)",
      polygon: [
        [280, 340], [560, 340], [620, 390], [640, 470], [600, 560],
        [500, 600], [360, 600], [260, 560], [220, 480], [230, 400]
      ],
      labelPos: [430, 470],
      description: "若者文化とスクランブル交差点で知られる活気あるエリア。",
      landmarks: [
        { name: "渋谷駅", pos: [420, 430], type: "station" },
        { name: "ハチ公前", pos: [390, 405], type: "spot" },
        { name: "渋谷スクランブル交差点", pos: [450, 455], type: "spot" },
        { name: "代々木公園", pos: [300, 390], type: "park" }
      ]
    }
  ],
  // A connecting corridor to make movement between areas natural
  corridor: {
    polygon: [
      [330, 250], [430, 250], [450, 350], [350, 350]
    ]
  }
};
