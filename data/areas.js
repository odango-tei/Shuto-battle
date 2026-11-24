/**
 * 首都戦記 - 3D簡略化エリアデータ
 *
 * 出典：東京都デジタルツイン実現プロジェクト
 * ライセンス：CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.ja)
 * 参考：Project PLATEAU 3D都市モデル（国土交通省）等の公開3D都市データの構造を参考に簡略化
 *
 * 変更：新宿駅周辺・渋谷駅周辺のエリアをゲーム用に簡略化し、
 *       建物形状・高さ・配置をローカル3D座標系で再構成した。
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
      center: { x: 0, z: 0 },
      color: 0x3b82f6,
      cssColor: "#3b82f6",
      description: "新宿駅を中心とした高層ビル・商業施設が集まるエリア。",
      ground: { x: 0, z: 0, width: 220, depth: 180, color: 0x1f2937 },
      roads: [
        { x: 0, z: 20, width: 220, depth: 14, color: 0x374151 },
        { x: -30, z: 0, width: 14, depth: 180, color: 0x374151 },
        { x: 50, z: -20, width: 120, depth: 10, color: 0x374151 },
      ],
      buildings: [
        // Station complex
        { x: 0, z: 20, w: 70, d: 30, h: 22, color: 0x64748b, label: "新宿駅" },
        { x: -55, z: 18, w: 28, d: 24, h: 18, color: 0x475569, label: "ルミネ" },
        { x: 55, z: 22, w: 24, d: 22, h: 16, color: 0x475569 },
        // West side - skyscrapers
        { x: -70, z: -35, w: 30, d: 30, h: 120, color: 0x60a5fa, label: "東京都庁" },
        { x: -35, z: -45, w: 22, d: 22, h: 95, color: 0x7dd3fc },
        { x: -90, z: -60, w: 20, d: 20, h: 80, color: 0x93c5fd },
        { x: -55, z: -65, w: 18, d: 18, h: 70, color: 0x7dd3fc },
        // East side - commercial
        { x: 40, z: -30, w: 20, d: 20, h: 45, color: 0x94a3b8 },
        { x: 65, z: -35, w: 18, d: 24, h: 55, color: 0xa5b4fc, label: "歌舞伎町タワー" },
        { x: 80, z: -10, w: 16, d: 16, h: 30, color: 0x94a3b8 },
        { x: 35, z: -55, w: 14, d: 14, h: 28, color: 0x94a3b8 },
        // South side
        { x: -20, z: 55, w: 26, d: 18, h: 35, color: 0x818cf8, label: "バスタ新宿" },
        { x: 20, z: 58, w: 22, d: 16, h: 28, color: 0x94a3b8 },
        { x: 60, z: 55, w: 20, d: 18, h: 24, color: 0x94a3b8 },
        { x: -70, z: 55, w: 24, d: 20, h: 32, color: 0x94a3b8 },
      ],
      landmarks: [
        { name: "新宿駅", x: 0, z: 20, color: "#fbbf24" },
        { name: "東京都庁", x: -70, z: -35, color: "#60a5fa" },
        { name: "歌舞伎町", x: 70, z: -35, color: "#f472b6" },
      ]
    },
    {
      id: "shibuya",
      name: "渋谷駅周辺",
      shortName: "渋谷",
      center: { x: 0, z: 320 },
      color: 0xec4899,
      cssColor: "#ec4899",
      description: "渋谷駅・スクランブル交差点を中心とした文化発信エリア。",
      ground: { x: 0, z: 320, width: 210, depth: 170, color: 0x1f2937 },
      roads: [
        { x: 0, z: 320, width: 210, depth: 14, color: 0x374151 },
        { x: 0, z: 300, width: 14, depth: 130, color: 0x374151 },
        { x: -40, z: 350, width: 10, depth: 90, color: 0x374151 },
      ],
      buildings: [
        // Station
        { x: -10, z: 315, w: 55, d: 28, h: 20, color: 0x64748b, label: "渋谷駅" },
        { x: 45, z: 305, w: 26, d: 22, h: 55, color: 0xf9a8d4, label: "渋谷スクランブルスクエア" },
        { x: -55, z: 305, w: 22, d: 20, h: 35, color: 0x94a3b8 },
        // Scramble / 109 area
        { x: 25, z: 345, w: 22, d: 22, h: 40, color: 0xf472b6, label: "SHIBUYA109" },
        { x: -30, z: 345, w: 24, d: 18, h: 18, color: 0x94a3b8 },
        { x: 55, z: 345, w: 18, d: 18, h: 32, color: 0xa5b4fc },
        // North / park side
        { x: -60, z: 275, w: 30, d: 24, h: 25, color: 0x94a3b8 },
        { x: -20, z: 270, w: 20, d: 18, h: 22, color: 0x94a3b8 },
        { x: 30, z: 270, w: 24, d: 20, h: 28, color: 0x94a3b8 },
        // South
        { x: -55, z: 370, w: 20, d: 18, h: 30, color: 0x94a3b8 },
        { x: 10, z: 375, w: 28, d: 20, h: 26, color: 0x94a3b8 },
        { x: 50, z: 375, w: 22, d: 18, h: 34, color: 0xc4b5fd },
      ],
      landmarks: [
        { name: "渋谷駅", x: -10, z: 315, color: "#fbbf24" },
        { name: "スクランブル交差点", x: 10, z: 335, color: "#f472b6" },
        { name: "ハチ公前", x: -20, z: 332, color: "#a3e635" },
      ]
    }
  ],
  connector: {
    // Simple road/path connecting Shinjuku area to Shibuya area
    ground: { x: 0, z: 160, width: 30, depth: 140, color: 0x1a2332 },
    road: { x: 0, z: 160, width: 12, depth: 140, color: 0x374151 },
    label: "明治通り方面（接続路）"
  }
};
