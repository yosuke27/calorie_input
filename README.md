# 食事記録カメラ (Calorie Input App)

画像から Gemini API を使って料理と栄養素を分析し、結果をスプレッドシートに記録するアプリケーションです。

## ディレクトリ構成

- `/app`: Nuxt 3 によるフロントエンドアプリケーション
- `/gas`: Google Apps Script (バックエンド・スプレッドシート連携用)

---

## GAS (Google Apps Script) の開発・デプロイ手順

`gas` フォルダ内のコードは、`clasp` を使用してローカルで管理・デプロイします。

### 1. 準備 (初回のみ)

**clasp のインストール**
```bash
npm install -g @google/clasp
```

**Google アカウントへのログイン**
```bash
clasp login
```
※事前に Google Apps Script のユーザー設定 から「Google Apps Script API」をオンにしておく必要があります。

### 2. プロジェクトの紐付け (初回のみ)

`gas` ディレクトリに移動して、スプレッドシートに紐づく GAS プロジェクトを設定します。

```bash
cd gas
clasp clone <YOUR_SCRIPT_ID>
```
※ `<YOUR_SCRIPT_ID>` は、GAS エディタの「プロジェクトの設定（歯車アイコン）」から確認できるスクリプト ID です。
※ これにより `gas/.clasp.json` が生成されます（このファイルは Git にコミットしないことを推奨します）。

### 3. よく使う clasp コマンド

**ローカルの変更を GAS に反映 (Push)**
```bash
clasp push
```

**GAS エディタ側の変更をローカルに反映 (Pull)**
```bash
clasp pull
```

### 4. デプロイ

**バージョンを作成してデプロイ**
```bash
clasp deploy -d "説明"
```

**デプロイ一覧を表示**
```bash
clasp deployments
```

**特定のバージョンにデプロイ**
```bash
clasp deploy -i <deploymentId> -d "説明"
```

**Web アプリとして公開**
```bash
clasp deploy --webapp
```

> **注意**: デプロイ後は Google Apps Script エディタの「デプロイメントからテスト」を選択して、URL を取得してください。その URL を Nuxt アプリの「データ登録APIエンドポイント」設定に入力してください。