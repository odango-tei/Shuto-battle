# 首都戦記 (Shuto-battle)

東京都デジタルツイン実現プロジェクト / Project PLATEAU の CC BY 4.0 データを基にした、ブラウザ向け1人称3Dプロトタイプです。

## ステージ

- **新宿駅周辺（PLATEAU由来データ）**: Google Driveで提供された `東京都デジタルツイン_新宿駅周辺1km_簡略化データ`（PLATEAU 2025年度版・CC BY 4.0 由来）をもとに、`data/shinjuku_plateau.json` として取り込み、建物フットプリント・高さ・道路・POIを1/1スケール（m）で描画しています。

## 操作

- **画面左下スティック**: 移動（タッチ/マウス対応）
- **WASD / 矢印キー**: 移動（PCフォールバック）
- **右下ミニマップ**: 現在地・向きを表示
- **視点**: 1人称（銃/腕表示）、近距離の遮蔽物は半透明化

## 起動

```bash
python3 -m http.server 8000 --bind 0.0.0.0
# http://localhost:8000
```

## データ出典・ライセンス

- **出典**: 東京都（東京都デジタルツイン実現プロジェクト）／国土交通省 Project PLATEAU（2025年度版）
- **ライセンス**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)
- **変更内容**: 新宿駅周辺1kmの簡略化データ（建物・道路・POI）をゲーム用に座標投影・チャンク化・描画最適化。

`data/shinjuku_plateau.json` の `meta` にも出典情報を保持しています。
