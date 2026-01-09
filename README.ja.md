# Agent Document Reviewer

AIエージェント向け指示ドキュメント（AGENTS.md、Claude.md等）をレビュー・改善するClaudeスキルです。

[English README](README.md)

## 概要

AIエージェント向けの指示ドキュメントは、次のような問題を抱えがちです：

- **肥大化**: 長くなりすぎて、エージェントが重要な指示を見逃す
- **構造の問題**: 重要なルールが文書の後半に埋もれている
- **冗長性**: 同じ情報が繰り返され、コンテキストウィンドウを無駄に消費
- **モノリシック設計**: すべての詳細が1ファイルに集約され、段階的情報開示が不十分

このスキルは、これらの問題を定量的な指標に基づいて特定し、具体的な改善策を提供します。

## 特徴

### 🔍 定量分析
- 自動化された文書メトリクス（行数、構造、リンク）
- 客観的な品質スコア（0-10スケール）
- 冗長性の検出
- Pure Node.js実装（外部依存なし）

### 📋 包括的なレビュー基準
- **段階的読み込みの影響**: 部分的な読み込みで重要情報を見逃さないか？
- **冗長性の検出**: 指示が不必要に繰り返されていないか？
- **Progressive disclosure**: 詳細情報が適切に分割・リンクされているか？
- **定量指標**: 行数、構造、リンク比率

### 💡 実行可能な改善策
- 行番号を含む具体的な推奨事項
- よくある改善パターン
- 修正前後の例
- ステップバイステップの実装ガイダンス

## 前提条件

- **Node.js**: 14以上（分析スクリプトの実行用）
- **Python**: 3.7以上（パッケージング時のみ、使用時は不要）
- **Claude**: スキル機能をサポートするバージョン

## インストール

### Claude Code向け

GitHubから最新リリースをダウンロード：

```bash
# 最新のスキルパッケージをダウンロード
curl -LO https://github.com/unagi/agent-document-reviewer/releases/latest/download/agent-document-reviewer.skill

# Claudeのスキルディレクトリにインストール
mkdir -p ~/.claude/skills
mv agent-document-reviewer.skill ~/.claude/skills/
```

または[Releasesページ](https://github.com/unagi/agent-document-reviewer/releases)から手動でダウンロードできます。

### Codex CLI向け

リポジトリをクローンしてインストールスクリプトを実行：

```bash
# リポジトリをクローン
git clone https://github.com/unagi/agent-document-reviewer.git
cd agent-document-reviewer

# Codex用インストールスクリプトを実行
./install-codex.sh
```

または手動でインストール：

```bash
# Codexスキルディレクトリを作成
mkdir -p ~/.codex/skills

# スキルソースをコピー
cp -R agent-document-reviewer ~/.codex/skills/
```

## 使い方

### Claude Code向け

スラッシュコマンドでスキルを起動します：

```
/agent-document-reviewer path/to/AGENTS.md
```

### Codex CLI向け

スキルインストール後、ドキュメントレビューを依頼する際にスキルを指定します：

```
「agent-document-reviewerスキルを使って、AGENTS.mdをレビューしてください」
```

Codexが自動的にインストール済みのスキルを見つけて使用します。

### スキルが実行すること

スキルは以下を実行します：
1. 定量分析の実行
2. 4つの観点からの質的レビュー
3. スコアと推奨事項を含む結果の提示
4. 要求があれば改善の実装を支援

### 出力例

```markdown
## Document Analysis: AGENTS.md

### 定量メトリクス
- 行数: 650 (⚠️ 許容範囲だが短縮可能)
- セクション数: 18 (✅ 良好)
- 最大深さ: 3 (✅ 良好)
- 内部リンク: 2 (⚠️ 改善可能)
- 総合スコア: 6/10

### 主な問題点
1. 文書が長くなってきている (650行) - 分割を検討
2. 重要なルールが後半に出現 (450行目以降)
3. 一部コンテンツに冗長性あり
4. Progressive disclosureが限定的

### 推奨事項
1. 詳細セクションを別ファイルに抽出
2. 重要ルールをまとめた「コア原則」セクションを先頭に作成
3. 重複するテスト指示を統合
4. Progressive disclosure のために内部リンクを追加
```

## 開発

### プロジェクト構造

```
agent-document-reviewer/
├── agent-document-reviewer.skill  # パッケージ化されたスキル（配布用）
├── agent-document-reviewer/       # スキルソース
│   ├── SKILL.md                   # メイン指示書
│   ├── scripts/
│   │   └── analyze_document.js    # 定量分析スクリプト
│   └── references/
│       ├── review-criteria.md     # 詳細なレビュー基準
│       └── best-practices.md      # ベストプラクティスガイド
├── tests/                         # テストドキュメント
│   └── sample-agents.md           # テスト用サンプルドキュメント
├── README.md                      # 英語版README
├── README.ja.md                   # このファイル
└── LICENSE                        # Apache 2.0 ライセンス
```

### 開発の前提条件

- **Node.js**: 14以上
- **Python**: 3.7以上
- **[skill-creator](https://github.com/anthropics/claude-code)**: パッケージング用

### 分析スクリプトのテスト

このプロジェクト自身のREADMEでテスト：

```bash
node agent-document-reviewer/scripts/analyze_document.js README.md
```

サンプルドキュメントでテスト：

```bash
node agent-document-reviewer/scripts/analyze_document.js tests/sample-agents.md
```

### スキルの再ビルド

このプロジェクトは[skill-creator](https://github.com/anthropics/claude-code)ツールを使用してパッケージングします。

スキルソースに変更を加えた後：

```bash
# skill-creatorのpackage_skill.pyスクリプトを使用
python3 /path/to/skill-creator/scripts/package_skill.py agent-document-reviewer/ .
```

これにより：
1. スキル構造の検証
2. 新しい `agent-document-reviewer.skill` パッケージの作成

が実行されます。

## レビュー基準

スキルは4つの観点から文書を評価します：

### 1. 段階的読み込みと完全読み込みの影響差
文書は重要情報を前方配置しているか、それともエージェントが30%で読むのを止めた場合に重要な指示を見逃すか？

### 2. 冗長性の検出
コンテンツがセクション間で不必要に繰り返されていないか？セクションを統合できるか？

### 3. Progressive Disclosure設計
詳細セクションが別ファイルに分割され、いつ読むべきかの明確なトリガーがあるか？

### 4. 定量メトリクス
客観的な測定値：
- 行数（目標: <500）
- セクション数と深さ
- 内部 vs 外部リンクの比率
- 平均セクション長

## ベストプラクティス

エージェント向けドキュメントの主要原則：

- **目標行数**: メインドキュメントは500行未満
- **前方配置**: 重要なルールは最初の100行以内
- **Progressive disclosure**: 詳細は明確なトリガーを持つ別ファイルに分割
- **冗長性の最小化**: 各指示は一度だけ記述
- **明確な階層**: 見出しレベルは3以下を推奨

包括的なガイダンスは [references/best-practices.md](agent-document-reviewer/references/best-practices.md) を参照してください。

## よくある改善パターン

### パターン1: 文書が長すぎる（>800行）

**解決策**: コアドキュメント + 専門トピック別ファイルに分割

```markdown
# メインドキュメント（必須ワークフローを記載）

## 専門トピック
- テスト: テスト戦略については [TESTING.md](TESTING.md) を参照
- API: REST規約については [API.md](API.md) を参照
- データベース: スキーマ詳細は [DATABASE.md](DATABASE.md) を参照
```

### パターン2: 重要なルールが埋もれている

**解決策**: 先頭に「コア原則」セクションを作成

```markdown
# エージェント指示書

## コア原則（最初に読む）
1. コミット前に必ずテストを実行
2. シークレットは絶対にコミットしない
3. Conventional Commitsを使用
...

## 詳細ガイドライン
[その他すべてはこの下に]
```

### パターン3: 高い冗長性

**解決策**: 重複コンテンツを統合し、相互参照を使用

**修正前**:
```markdown
## セクション A
新しいファイルには必ずTypeScriptを使用してください。

## セクション B
新しいファイルにはTypeScriptを使うことを忘れないでください。
```

**修正後**:
```markdown
## コア原則
- すべての新規ファイルにはTypeScriptを使用

## セクション B
ファイル作成時は上記のコア原則に従ってください。
```

### パターン4: Progressive Disclosureなし

**解決策**: 詳細セクションを別ファイルに抽出

**修正前**: 1200行の単一AGENTS.md

**修正後**:
- AGENTS.md (400行): コアワークフロー + ナビゲーション
- TESTING.md (250行): テスト詳細
- API.md (300行): API標準
- DEPLOY.md (250行): デプロイメントプロセス

## 貢献

貢献を歓迎します！以下の手順に従ってください：

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をテスト：
   - テストドキュメントで分析スクリプトを実行
   - メトリクスの正確性を確認
   - 可能であればスキル全体をエンドツーエンドでテスト
4. 必要に応じてドキュメントを更新
5. スキルパッケージを再ビルド
6. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
7. ブランチにプッシュ (`git push origin feature/amazing-feature`)
8. プルリクエストを作成

問題の報告は[GitHub Issuesページ](https://github.com/unagi/agent-document-reviewer/issues)でお願いします。

## ライセンス

このプロジェクトはApache License 2.0の下でライセンスされています - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 謝辞

[Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-typescript) とスキル作成のベストプラクティスを使用して構築されています。
