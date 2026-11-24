/**
 * 首都戦記 - 3Dエリアデータ（1/1スケール、駅周辺ステージ）
 *
 * 出典：東京都デジタルツイン実現プロジェクト
 * ライセンス：CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.ja)
 * 参考：Project PLATEAU 3D都市モデル等の公開3D都市データの構造を参考に簡略化
 *
 * 変更：新宿駅周辺・渋谷駅周辺を独立ステージとして、実在の主要建物・道路・ランドマークを
 *       1/1スケール（1単位=1m）でゲーム用に簡略化再構成した。名称・位置・規模は実際の
 *       街区構成を参考にしているが、ゲーム表現のため形状は簡略化している。
 */
export const AREA_DATA = {
  attribution: {
    source: "東京都デジタルツイン実現プロジェクト",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.ja",
    note: "新宿駅周辺・渋谷駅周辺を1/1スケールで簡略化再構成"
  },
  areas: [
    {
      id: "shinjuku",
      name: "新宿駅周辺",
      shortName: "新宿",
      center: { x: 0, z: 0 },
      spawn: { x: 10, z: 55, yaw: Math.PI },
      color: 0x3b82f6,
      cssColor: "#60a5fa",
      ground: { x: 0, z: 0, width: 520, depth: 460, color: 0x252f3f },
      bounds: { minX: -255, maxX: 255, minZ: -225, maxZ: 225 },
      roads: [
        // 甲州街道（駅南）
        { x: 0, z: 38, width: 520, depth: 26, color: 0x3a4556 },
        // 駅東西通路上部/駅構内帯
        { x: 0, z: 8, width: 300, depth: 34, color: 0x3f4a5a },
        // 靖国通り（東）
        { x: 120, z: -30, width: 24, depth: 260, color: 0x3a4556 },
        // 明治通り（西寄り縦）
        { x: -150, z: 20, width: 22, depth: 420, color: 0x3a4556 },
        // 小滝橋通り
        { x: -60, z: -30, width: 20, depth: 280, color: 0x3a4556 },
        // 東口駅前通り
        { x: 60, z: -20, width: 18, depth: 180, color: 0x3a4556 },
        // 西口駅前
        { x: -40, z: 60, width: 18, depth: 120, color: 0x3a4556 },
        // 南口通り
        { x: 20, z: 110, width: 16, depth: 180, color: 0x3a4556 },
        // 都庁通り
        { x: -120, z: -90, width: 140, depth: 18, color: 0x3a4556 },
        // 歌舞伎町中央通り
        { x: 150, z: -70, width: 14, depth: 160, color: 0x3a4556 },
      ],
      crosswalks: [
        { x: 0, z: 24, w: 14, d: 4 }, { x: 0, z: 52, w: 14, d: 4 },
        { x: -20, z: 38, w: 4, d: 14 }, { x: 20, z: 38, w: 4, d: 14 },
        { x: 60, z: 24, w: 4, d: 12 }, { x: 60, z: 52, w: 4, d: 12 },
        { x: -60, z: 24, w: 4, d: 12 }, { x: -60, z: 52, w: 4, d: 12 },
        { x: 120, z: 24, w: 4, d: 12 }, { x: 120, z: 52, w: 4, d: 12 },
      ],
      buildings: [
        // --- 駅・駅直結 ---
        { x: 0, z: 8, w: 210, d: 55, h: 28, color: 0x6b7280, label: "JR新宿駅" },
        { x: -85, z: 8, w: 45, d: 40, h: 32, color: 0x5b6675, label: "小田急百貨店新宿店" },
        { x: -130, z: 5, w: 35, d: 38, h: 30, color: 0x5b6675, label: "京王百貨店新宿店" },
        { x: 85, z: 10, w: 40, d: 38, h: 30, color: 0x5b6675, label: "ルミネエスト" },
        { x: 55, z: -5, w: 35, d: 28, h: 28, color: 0x5f6b7a, label: "ルミネ1" },
        { x: 120, z: 5, w: 30, d: 30, h: 26, color: 0x5f6b7a, label: "ルミネ2" },
        { x: -35, z: 58, w: 55, d: 30, h: 35, color: 0x6d7a8a, label: "NEWoMan新宿" },
        { x: 35, z: 62, w: 60, d: 28, h: 22, color: 0x596575, label: "バスタ新宿/ミライナタワー" },
        { x: 95, z: 60, w: 45, d: 32, h: 40, color: 0x66758a, label: "タカシマヤタイムズスクエア" },
        { x: 140, z: 58, w: 30, d: 26, h: 28, color: 0x5f6b7a, label: "高島屋新宿店" },

        // --- 西口・都庁エリア ---
        { x: -145, z: -80, w: 48, d: 48, h: 243, color: 0x7ec8f8, label: "東京都庁 第一本庁舎" },
        { x: -95, z: -95, w: 34, d: 34, h: 163, color: 0x93d5fd, label: "東京都庁 第二本庁舎" },
        { x: -185, z: -120, w: 38, d: 38, h: 210, color: 0x8ecdf5, label: "新宿住友ビル" },
        { x: -145, z: -135, w: 36, d: 36, h: 225, color: 0x87c7f0, label: "新宿三井ビル" },
        { x: -100, z: -140, w: 34, d: 34, h: 203, color: 0x90cef5, label: "新宿センタービル" },
        { x: -60, z: -125, w: 32, d: 32, h: 150, color: 0x93c5fd, label: "モード学園コクーンタワー" },
        { x: -55, z: -80, w: 30, d: 28, h: 120, color: 0x8bbce8, label: "新宿アイランドタワー" },
        { x: -190, z: -55, w: 32, d: 28, h: 123, color: 0x8bbce8, label: "新宿NSビル" },
        { x: -200, z: -160, w: 28, d: 28, h: 110, color: 0x94a3b8 },
        { x: -55, z: -170, w: 28, d: 28, h: 105, color: 0x94a3b8 },

        // --- 東口・歌舞伎町 ---
        { x: 145, z: -95, w: 42, d: 42, h: 225, color: 0xa5b4fc, label: "東急歌舞伎町タワー" },
        { x: 95, z: -55, w: 28, d: 24, h: 60, color: 0x8f9bb0, label: "新宿アルタ/東口周辺" },
        { x: 175, z: -55, w: 26, d: 24, h: 55, color: 0x94a3b8, label: "歌舞伎町一番街ビル" },
        { x: 185, z: -95, w: 22, d: 22, h: 45, color: 0x94a3b8 },
        { x: 115, z: -100, w: 20, d: 20, h: 40, color: 0x94a3b8 },
        { x: 170, z: -130, w: 24, d: 24, h: 50, color: 0x94a3b8, label: "西武新宿駅ビル" },
        { x: 200, z: -130, w: 28, d: 22, h: 35, color: 0x94a3b8 },
        { x: 80, z: -90, w: 22, d: 20, h: 38, color: 0x94a3b8 },

        // --- 南口・代々木寄り ---
        { x: -60, z: 95, w: 38, d: 30, h: 55, color: 0x818cf8, label: "JR南新宿ビル" },
        { x: -110, z: 90, w: 34, d: 28, h: 48, color: 0x94a3b8, label: "小田急サザンタワー" },
        { x: -150, z: 80, w: 30, d: 26, h: 42, color: 0x94a3b8 },
        { x: 150, z: 100, w: 34, d: 28, h: 45, color: 0x94a3b8 },
        { x: 190, z: 90, w: 28, d: 24, h: 38, color: 0x94a3b8 },
        { x: 190, z: 140, w: 30, d: 28, h: 42, color: 0x94a3b8 },

        // --- 周辺街区（実在エリアの埋め） ---
        { x: -210, z: 20, w: 28, d: 30, h: 35, color: 0x8896a8 },
        { x: -210, z: 70, w: 26, d: 26, h: 32, color: 0x8896a8 },
        { x: -210, z: 130, w: 28, d: 28, h: 30, color: 0x8896a8 },
        { x: 210, z: -30, w: 26, d: 30, h: 34, color: 0x8896a8 },
        { x: 210, z: 20, w: 24, d: 26, h: 30, color: 0x8896a8 },
        { x: 210, z: 60, w: 26, d: 24, h: 28, color: 0x8896a8 },
        { x: -20, z: 140, w: 32, d: 26, h: 36, color: 0x8896a8 },
        { x: 60, z: 140, w: 28, d: 24, h: 32, color: 0x8896a8 },
        { x: -100, z: 150, w: 30, d: 26, h: 30, color: 0x8896a8 },
        { x: 120, z: 150, w: 30, d: 26, h: 34, color: 0x8896a8 },
        { x: -20, z: -170, w: 28, d: 24, h: 30, color: 0x8896a8 },
        { x: 20, z: -170, w: 26, d: 24, h: 28, color: 0x8896a8 },
      ],
      landmarks: [
        { name: "JR新宿駅", x: 0, z: 8, color: "#fbbf24" },
        { name: "東京都庁", x: -145, z: -80, color: "#7dd3fc" },
        { name: "新宿住友ビル", x: -185, z: -120, color: "#93c5fd" },
        { name: "東急歌舞伎町タワー", x: 145, z: -95, color: "#c4b5fd" },
        { name: "バスタ新宿", x: 35, z: 62, color: "#a78bfa" },
        { name: "タカシマヤタイムズスクエア", x: 95, z: 60, color: "#f9a8d4" },
      ],
      trees: [
        { x: -30, z: -35 }, { x: -15, z: -40 }, { x: 0, z: -38 }, { x: 15, z: -42 },
        { x: -170, z: -30 }, { x: -170, z: -10 }, { x: -170, z: 30 },
        { x: 170, z: 20 }, { x: 185, z: 20 }, { x: -90, z: 130 },
        { x: -70, z: 130 }, { x: 70, z: 120 }, { x: 170, z: 130 },
        { x: -220, z: -90 }, { x: -220, z: -70 }, { x: 40, z: -140 },
      ],
      props: [
        { type: "sign", x: 5, z: 50, label: "新宿駅南口" },
        { type: "sign", x: -30, z: 30, label: "西口" },
        { type: "sign", x: 70, z: 30, label: "東口" },
      ]
    },
    {
      id: "shibuya",
      name: "渋谷駅周辺",
      shortName: "渋谷",
      center: { x: 0, z: 700 },
      spawn: { x: -5, z: 735, yaw: Math.PI },
      color: 0xec4899,
      cssColor: "#f472b6",
      ground: { x: 0, z: 700, width: 500, depth: 440, color: 0x252f3f },
      bounds: { minX: -245, maxX: 245, minZ: 485, maxZ: 915 },
      roads: [
        // 駅前/宮益坂方面
        { x: 0, z: 700, width: 500, depth: 24, color: 0x3a4556 },
        // 明治通り
        { x: -70, z: 700, width: 22, depth: 440, color: 0x3a4556 },
        // 道玄坂
        { x: 40, z: 760, width: 20, depth: 160, color: 0x3a4556 },
        // 宮益坂
        { x: 30, z: 640, width: 18, depth: 160, color: 0x3a4556 },
        // センター街入口
        { x: 80, z: 760, width: 14, depth: 120, color: 0x3a4556 },
        // 文化村通り
        { x: 70, z: 660, width: 80, depth: 14, color: 0x3a4556 },
        // 公園通り
        { x: -30, z: 640, width: 14, depth: 140, color: 0x3a4556 },
        // 玉川通り
        { x: 120, z: 700, width: 18, depth: 300, color: 0x3a4556 },
      ],
      crosswalks: [
        // スクランブル
        { x: 5, z: 718, w: 16, d: 4 }, { x: 5, z: 732, w: 16, d: 4 },
        { x: -3, z: 725, w: 4, d: 14 }, { x: 13, z: 725, w: 4, d: 14 },
        { x: -70, z: 688, w: 4, d: 12 }, { x: -70, z: 712, w: 4, d: 12 },
        { x: 40, z: 748, w: 4, d: 10 },
      ],
      buildings: [
        // --- 駅・駅直結 ---
        { x: -30, z: 700, w: 80, d: 45, h: 26, color: 0x6b7280, label: "渋谷駅" },
        { x: 50, z: 690, w: 40, d: 38, h: 230, color: 0xf0a0c8, label: "渋谷スクランブルスクエア" },
        { x: 95, z: 675, w: 34, d: 34, h: 183, color: 0xc4b5fd, label: "渋谷ヒカリエ" },
        { x: 130, z: 690, w: 32, d: 30, h: 120, color: 0xb8a5f0, label: "渋谷ストリーム" },
        { x: -100, z: 690, w: 34, d: 30, h: 55, color: 0x7a8699, label: "渋谷フクラス" },
        { x: -120, z: 725, w: 30, d: 28, h: 45, color: 0x8896a8, label: "渋谷マークシティ" },

        // --- スクランブル・センター街 ---
        { x: 25, z: 760, w: 30, d: 30, h: 75, color: 0xf472b6, label: "SHIBUYA109" },
        { x: -25, z: 755, w: 28, d: 24, h: 35, color: 0x94a3b8, label: "MAGNET by SHIBUYA109" },
        { x: 65, z: 755, w: 24, d: 22, h: 40, color: 0x94a3b8, label: "渋谷モディ" },
        { x: 95, z: 760, w: 22, d: 24, h: 32, color: 0x94a3b8 },
        { x: 75, z: 790, w: 26, d: 24, h: 28, color: 0x94a3b8, label: "渋谷PARCO" },
        { x: 45, z: 795, w: 22, d: 20, h: 24, color: 0x8896a8 },
        { x: 110, z: 790, w: 20, d: 22, h: 26, color: 0x8896a8 },
        { x: 15, z: 790, w: 24, d: 20, h: 22, color: 0x8896a8 },

        // --- 道玄坂・南 ---
        { x: -40, z: 775, w: 28, d: 26, h: 38, color: 0x94a3b8, label: "道玄坂通周辺ビル" },
        { x: -75, z: 780, w: 26, d: 24, h: 32, color: 0x8896a8 },
        { x: -110, z: 770, w: 28, d: 26, h: 34, color: 0x8896a8 },
        { x: -20, z: 820, w: 30, d: 24, h: 30, color: 0x8896a8 },
        { x: 30, z: 835, w: 28, d: 24, h: 28, color: 0x8896a8 },
        { x: 80, z: 830, w: 26, d: 22, h: 30, color: 0x8896a8 },

        // --- 宮益坂・北 ---
        { x: -30, z: 640, w: 28, d: 24, h: 30, color: 0x94a3b8 },
        { x: -60, z: 640, w: 26, d: 22, h: 28, color: 0x8896a8 },
        { x: 0, z: 640, w: 24, d: 22, h: 26, color: 0x8896a8 },
        { x: 60, z: 640, w: 26, d: 22, h: 32, color: 0x94a3b8 },
        { x: 100, z: 640, w: 24, d: 22, h: 28, color: 0x8896a8 },
        { x: -100, z: 640, w: 30, d: 24, h: 34, color: 0x8896a8 },
        { x: -140, z: 660, w: 28, d: 26, h: 30, color: 0x8896a8 },

        // --- 宮下公園・東 ---
        { x: 150, z: 740, w: 45, d: 30, h: 38, color: 0x86efac, label: "MIYASHITA PARK" },
        { x: 170, z: 700, w: 28, d: 26, h: 36, color: 0x94a3b8 },
        { x: 190, z: 740, w: 24, d: 24, h: 30, color: 0x8896a8 },
        { x: 190, z: 780, w: 26, d: 24, h: 32, color: 0x8896a8 },

        // --- 西側 ---
        { x: -150, z: 720, w: 28, d: 26, h: 32, color: 0x8896a8 },
        { x: -170, z: 760, w: 26, d: 24, h: 28, color: 0x8896a8 },
        { x: -180, z: 690, w: 30, d: 28, h: 34, color: 0x8896a8 },
        { x: -140, z: 800, w: 28, d: 26, h: 30, color: 0x8896a8 },
        { x: 160, z: 650, w: 28, d: 24, h: 30, color: 0x8896a8 },
        { x: 200, z: 660, w: 24, d: 24, h: 28, color: 0x8896a8 },
      ],
      landmarks: [
        { name: "渋谷駅", x: -30, z: 700, color: "#fbbf24" },
        { name: "スクランブル交差点", x: 5, z: 725, color: "#f472b6" },
        { name: "ハチ公", x: -15, z: 718, color: "#a3e635" },
        { name: "渋谷スクランブルスクエア", x: 50, z: 690, color: "#f9a8d4" },
        { name: "SHIBUYA109", x: 25, z: 760, color: "#fb7185" },
        { name: "MIYASHITA PARK", x: 150, z: 740, color: "#86efac" },
      ],
      trees: [
        { x: -140, z: 740 }, { x: -150, z: 745 }, { x: 140, z: 725 },
        { x: 160, z: 755 }, { x: -20, z: 620 }, { x: -10, z: 615 },
        { x: 110, z: 630 }, { x: -170, z: 640 }, { x: 180, z: 670 },
        { x: -100, z: 820 }, { x: 120, z: 820 },
      ],
      props: [
        { type: "sign", x: -10, z: 715, label: "ハチ公前" },
        { type: "sign", x: 10, z: 735, label: "スクランブル交差点" },
      ]
    }
  ]
};
