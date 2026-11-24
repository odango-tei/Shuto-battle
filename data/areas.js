/**
 * 首都戦記 - 3D簡略化エリアデータ（駅周辺ステージ）
 *
 * 出典：東京都デジタルツイン実現プロジェクト
 * ライセンス：CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.ja)
 * 参考：Project PLATEAU 3D都市モデル等の公開3D都市データの構造を参考に簡略化
 *
 * 変更：新宿駅周辺・渋谷駅周辺をそれぞれ独立したステージとしてゲーム用に簡略化。
 *       建物形状・高さ・配置・ランドマークをローカル3D座標系で再構成した。
 *
 * 単位: メートル相当（ゲーム内座標）
 */
export const AREA_DATA = {
  attribution: {
    source: "東京都デジタルツイン実現プロジェクト",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.ja",
    note: "新宿駅周辺・渋谷駅周辺の3Dデータをゲーム用に簡略化"
  },
  areas: [
    {
      id: "shinjuku",
      name: "新宿駅周辺",
      shortName: "新宿",
      stageLabel: "STAGE 1: 新宿駅周辺",
      center: { x: 0, z: 0 },
      spawn: { x: 0, z: 35, yaw: Math.PI },
      color: 0x3b82f6,
      cssColor: "#3b82f6",
      description: "新宿駅を中心に、都庁・東口商業エリアが広がるステージ。",
      ground: { x: 0, z: 0, width: 240, depth: 200, color: 0x1f2937 },
      bounds: { minX: -115, maxX: 115, minZ: -95, maxZ: 95 },
      roads: [
        { x: 0, z: 22, width: 240, depth: 16, color: 0x374151 },      // 甲州街道相当
        { x: -25, z: 0, width: 14, depth: 200, color: 0x374151 },     // 西口通り
        { x: 45, z: -15, width: 12, depth: 130, color: 0x374151 },    // 東口通り
        { x: 0, z: -35, width: 150, depth: 10, color: 0x374151 },      // 西側横断
        { x: 70, z: 35, width: 10, depth: 90, color: 0x374151 },      // 東南通り
      ],
      crosswalks: [
        { x: 0, z: 14, w: 10, d: 3 }, { x: 0, z: 30, w: 10, d: 3 },
        { x: -17, z: 22, w: 3, d: 10 }, { x: 17, z: 22, w: 3, d: 10 },
        { x: 45, z: 14, w: 3, d: 8 }, { x: 45, z: 30, w: 3, d: 8 },
      ],
      buildings: [
        // Station complex
        { x: 0, z: 22, w: 76, d: 28, h: 24, color: 0x64748b, label: "JR新宿駅" },
        { x: -52, z: 20, w: 26, d: 22, h: 20, color: 0x475569, label: "ルミネ2" },
        { x: 54, z: 22, w: 24, d: 20, h: 18, color: 0x475569, label: "ルミネエスト" },
        { x: 0, z: 45, w: 60, d: 18, h: 16, color: 0x4b5563, label: "バスタ新宿" },
        { x: -58, z: 45, w: 24, d: 18, h: 30, color: 0x818cf8, label: "NEWoMan" },
        // West skyscraper district
        { x: -75, z: -40, w: 32, d: 32, h: 130, color: 0x60a5fa, label: "東京都庁 第一庁舎" },
        { x: -42, z: -48, w: 24, d: 24, h: 110, color: 0x7dd3fc, label: "東京都庁 第二庁舎" },
        { x: -95, z: -65, w: 20, d: 20, h: 85, color: 0x93c5fd, label: "新宿住友ビル" },
        { x: -65, z: -72, w: 20, d: 20, h: 75, color: 0x7dd3fc, label: "新宿三井ビル" },
        { x: -38, z: -75, w: 18, d: 18, h: 65, color: 0x93c5fd },
        // East / Kabukicho side
        { x: 70, z: -35, w: 22, d: 28, h: 65, color: 0xa5b4fc, label: "東急歌舞伎町タワー" },
        { x: 90, z: -10, w: 18, d: 18, h: 32, color: 0x94a3b8 },
        { x: 95, z: -45, w: 16, d: 16, h: 28, color: 0x94a3b8 },
        { x: 65, z: -60, w: 20, d: 16, h: 24, color: 0x94a3b8 },
        { x: 40, z: -55, w: 16, d: 14, h: 22, color: 0x94a3b8 },
        // Near station east
        { x: 35, z: -5, w: 18, d: 18, h: 40, color: 0x94a3b8, label: "アルタ周辺" },
        { x: 75, z: 50, w: 22, d: 18, h: 26, color: 0x94a3b8 },
        { x: 95, z: 30, w: 16, d: 20, h: 24, color: 0x94a3b8 },
        // West ground level
        { x: -90, z: 0, w: 22, d: 22, h: 28, color: 0x94a3b8 },
        { x: -90, z: 40, w: 20, d: 20, h: 22, color: 0x94a3b8 },
      ],
      landmarks: [
        { name: "新宿駅", x: 0, z: 22, color: "#fbbf24" },
        { name: "東京都庁", x: -75, z: -40, color: "#60a5fa" },
        { name: "歌舞伎町", x: 72, z: -25, color: "#f472b6" },
        { name: "バスタ新宿", x: 0, z: 45, color: "#a78bfa" },
      ],
      trees: [
        { x: -20, z: -20 }, { x: -10, z: -25 }, { x: 10, z: -20 },
        { x: -85, z: -15 }, { x: -85, z: 10 }, { x: 20, z: 60 },
        { x: -25, z: 65 }, { x: 30, z: 65 }, { x: 85, z: 10 },
      ]
    },
    {
      id: "shibuya",
      name: "渋谷駅周辺",
      shortName: "渋谷",
      stageLabel: "STAGE 2: 渋谷駅周辺",
      center: { x: 0, z: 500 },
      spawn: { x: -10, z: 535, yaw: Math.PI },
      color: 0xec4899,
      cssColor: "#ec4899",
      description: "スクランブル交差点・ハチ公前を中心とした渋谷のステージ。",
      ground: { x: 0, z: 500, width: 230, depth: 190, color: 0x1f2937 },
      bounds: { minX: -110, maxX: 110, minZ: 410, maxZ: 590 },
      roads: [
        { x: 0, z: 505, width: 230, depth: 14, color: 0x374151 },     // 駅前大通り
        { x: -30, z: 500, width: 12, depth: 190, color: 0x374151 },   // 明治通り相当
        { x: 35, z: 540, width: 10, depth: 100, color: 0x374151 },    // センター街入口通り
        { x: 0, z: 545, width: 140, depth: 10, color: 0x374151 },     // スクランブル南
        { x: 60, z: 490, width: 10, depth: 80, color: 0x374151 },
      ],
      crosswalks: [
        { x: 5, z: 538, w: 12, d: 3 }, { x: 5, z: 552, w: 12, d: 3 },
        { x: -2, z: 545, w: 3, d: 10 }, { x: 12, z: 545, w: 3, d: 10 },
        { x: -30, z: 498, w: 3, d: 8 }, { x: -30, z: 512, w: 3, d: 8 },
      ],
      buildings: [
        // Station / east
        { x: -20, z: 500, w: 58, d: 28, h: 22, color: 0x64748b, label: "渋谷駅" },
        { x: 45, z: 490, w: 30, d: 26, h: 70, color: 0xf9a8d4, label: "渋谷スクランブルスクエア" },
        { x: 78, z: 475, w: 24, d: 22, h: 45, color: 0xc4b5fd, label: "渋谷ヒカリエ" },
        { x: 75, z: 515, w: 20, d: 18, h: 30, color: 0x94a3b8 },
        // Scramble / center
        { x: 25, z: 560, w: 24, d: 24, h: 45, color: 0xf472b6, label: "SHIBUYA109" },
        { x: -15, z: 558, w: 22, d: 18, h: 20, color: 0x94a3b8, label: "渋谷モディ" },
        { x: 55, z: 555, w: 20, d: 20, h: 35, color: 0xa5b4fc },
        { x: -55, z: 545, w: 24, d: 20, h: 28, color: 0x94a3b8 },
        { x: -80, z: 530, w: 20, d: 22, h: 24, color: 0x94a3b8 },
        // North side
        { x: -65, z: 460, w: 28, d: 24, h: 26, color: 0x94a3b8 },
        { x: -25, z: 455, w: 22, d: 18, h: 22, color: 0x94a3b8 },
        { x: 15, z: 455, w: 24, d: 20, h: 28, color: 0x94a3b8 },
        { x: 55, z: 455, w: 20, d: 18, h: 24, color: 0x94a3b8 },
        // South
        { x: -60, z: 575, w: 22, d: 18, h: 30, color: 0x94a3b8 },
        { x: -20, z: 580, w: 26, d: 18, h: 26, color: 0x94a3b8 },
        { x: 55, z: 580, w: 24, d: 20, h: 32, color: 0xc4b5fd },
        { x: 85, z: 560, w: 18, d: 18, h: 26, color: 0x94a3b8 },
      ],
      landmarks: [
        { name: "渋谷駅", x: -20, z: 500, color: "#fbbf24" },
        { name: "スクランブル交差点", x: 5, z: 545, color: "#f472b6" },
        { name: "ハチ公前", x: -10, z: 533, color: "#a3e635" },
        { name: "渋谷スクランブルスクエア", x: 45, z: 490, color: "#f9a8d4" },
      ],
      trees: [
        { x: -75, z: 490 }, { x: -85, z: 500 }, { x: 20, z: 470 },
        { x: 30, z: 465 }, { x: -45, z: 575 }, { x: 70, z: 535 },
        { x: -90, z: 560 }, { x: 90, z: 490 },
      ]
    }
  ]
};
