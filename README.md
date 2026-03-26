# Exome Annotation Viewer

ローカル環境で exome annotation の CSV/TSV を閲覧するためのアプリです。

## 前提

- Python 3.10 以上
- Node.js 20 以上
- npm

確認コマンド:

```bash
python3 --version
node -v
npm -v
```

## ディレクトリ構成

- `backend/`
  - FastAPI アプリ
- `frontend/`
  - React + Vite フロントエンド
- `sample.csv`
  - 形式確認用のサンプル

## 別環境でのセットアップ

### 1. このディレクトリへ移動

```bash
cd /path/to/product
```

### 2. Python 仮想環境を作成して有効化

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. バックエンド依存をインストール

```bash
python3 -m pip install --upgrade pip
python3 -m pip install -r backend/requirements.txt
```

### 4. フロントエンド依存をインストール

`package-lock.json` があるので、通常は `npm ci` を推奨します。

```bash
cd frontend
npm ci
cd ..
```

`npm ci` が使えない場合:

```bash
cd frontend
npm install
cd ..
```

## 起動方法

### 1. フロントエンドをビルド

```bash
cd frontend
npm run build
cd ..
```

### 2. バックエンドを起動

サンプル CSV の場合:

```bash
python3 backend/main.py --csv /path/to/product/sample.csv
```

実データの CSV の場合:

```bash
python3 backend/main.py --csv /path/to/your_file.csv
```

起動後、ブラウザで以下を開きます。

```text
http://127.0.0.1:8000
```

## 開発用起動

フロントエンドを開発モードで動かす場合は、バックエンドを起動したまま別ターミナルで以下を実行します。

```bash
cd frontend
npm run dev
```

その場合の URL:

```text
http://127.0.0.1:5173
```

## 検証

フロントエンド build:

```bash
cd frontend
npm run build
```

バックエンド文法確認:

```bash
python3 -m py_compile backend/main.py backend/categories.py
```

## よくある注意点

- `Gene_Name` 列は必須です。無い場合は起動時エラーになります。
- 対応文字コードは `utf-8`, `utf-8-sig`, `cp932` です。
- 対応区切りはカンマとタブです。
- `CHROM` に `X` などが含まれていても読めるように、全列を文字列として読み込みます。
- 検索は `Gene_Name` の完全一致です。
- CSV 出力は、画面に現在表示されている行だけが対象です。

## クリーン環境で最短セットアップするコマンド

macOS / Linux:

```bash
cd /path/to/product
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r backend/requirements.txt
cd frontend && npm ci && npm run build && cd ..
python3 backend/main.py --csv /path/to/product/sample.csv
```
