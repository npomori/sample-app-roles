# ロール見本

[auth-server](https://github.com/npomori/auth-server) の認証サーバーに連携する参加アプリです。ログイン、パスキー、ユーザー作成は行いません。仕様は [participant-app.md](https://github.com/npomori/auth-server/blob/main/planning/participant-app.md)、[multi-app-auth.md](https://github.com/npomori/auth-server/blob/main/planning/multi-app-auth.md)、[app-permissions](https://github.com/npomori/auth-server/blob/main/planning/app-permissions/README.md)、[ロールと認可](https://github.com/npomori/auth-server/blob/main/planning/auth-app-role-authorization-spec.md) です。このアプリの仕様は [docs/app.md](docs/app.md) です。入場と画面の分岐は [docs/access.md](docs/access.md) です。

認証の骨格はパッケージ [participant-app-base](../participant-app-base) です。新しい参加アプリの作り方は [docs/building.md](docs/building.md) です。

公開の `/` 以外で未ログインの画面は認証サーバーの引き渡しへ送り、`/callback` でコードを消費してホスト専用の `__Host-session` を発行します。入場は実効許可が `allow` のときだけです。入場後の画面分けは、共通ロール `User.role` と、このアプリが保存したアプリ内ロールを見ます。

## 画面

| パス          | 内容                                                     |
| ------------- | -------------------------------------------------------- |
| `/`           | 公開フロント。ログインは `/admin` へ向ける               |
| `/admin`      | メールアドレス、名前、共通ロール、アプリ内ロール、見本の項目 |
| `/grants`     | 共通 `admin` だけの利用許可の例外一覧                    |
| `/roles`      | ライブラリの固定本文。割り当て画面は差し替え口のあと     |
| `/callback`   | 引き渡しの戻り                                           |
| `/logged-out` | ログアウト完了。ヘッダのログインは `/`。引き渡しは始めない |

セッションがある管理画面のヘッダは「ログアウト」です。

未ログインの利用者には、`/` と `/logged-out` 以外の画面を出しません。

## 動作確認

認証サーバーへ接続したあとの手順は [docs/verification.md](docs/verification.md) です。

## 仕様

このアプリの仕様は [docs/app.md](docs/app.md) です。画面の権限とアクセス制御は [docs/access.md](docs/access.md) です。

## テスト

自動テストの分け方と確認内容は [docs/testing.md](docs/testing.md) です。

## セットアップ

認証サーバーを `http://auth.localhost:3000` で起動し、管理者が次を登録してからこのアプリを起動します。

- `App.id` は `roles`
- `origin` は `http://roles.localhost:4000`
- `redirectUris` に `http://roles.localhost:4000/callback`
- 既定が `allow` でないアプリは、利用者ごとの `AppGrant` を `allow` にする。seed 管理者にも自動では付かない

PostgreSQL と Redis は認証サーバーと同じ場所へ、権限を絞った `app_participant` で接続します。接続の制限は [docs/connections.md](docs/connections.md)、データベースの初期化は [docs/db-init.md](docs/db-init.md) です。共有テーブルのマイグレーションは行いません。ロールとスキーマ `roles` は、認証サーバーのデータベースで一度だけ用意します。型とテーブルは、起動時の `pnpm db:migrate` でこのアプリが適用します。

```bash
pnpm install
cp .env.example .env
pnpm dev
```

`pnpm install` は、隣にある `participant-app-base` を `file:` で入れます。共有テーブルの Prisma Client は、そのパッケージの `prepare` が生成します。スキーマ `roles` のクライアントは、このアプリの `pnpm db:generate` が生成します。`pnpm dev` と `pnpm build` も、その生成を先に行います。

ブラウザでは `http://roles.localhost:4000` を開きます。`localhost` の別ポートではホスト専用 Cookie が混ざるため、ホスト名で分けます。

## コマンド

| コマンド           | 説明                                         |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | `roles.localhost:4000` で開発サーバーを起動  |
| `pnpm lint`        | ESLint                                       |
| `pnpm test`        | スキーマ `roles` の割り当てと見本を試す      |
| `pnpm build`       | 本番ビルド                                   |
| `pnpm db:generate` | スキーマ `roles` の Prisma Client を生成する |
| `pnpm db:migrate`  | スキーマ `roles` のマイグレーションを適用する |

`pnpm test` は、起動済みのローカル PostgreSQL の `TEST_DATABASE_URL` へ接続し、スキーマ `roles` だけを試します。入場やセッションのテストは `participant-app-base` で実行します。接続先と準備は [docs/testing.md](docs/testing.md) です。共有テーブルの変更は認証サーバーだけが行います。共有クライアントの `db:generate` もライブラリで実行します。`db:seed` はありません。

本番イメージのビルドコンテキストは、このリポジトリです。`pnpm install` は隣の作業ツリーを使い、イメージのビルドは [participant-app-base.rev](participant-app-base.rev) のコミットを GitHub から取得して `/participant-app-base` に置きます。イメージに入るのは、GitHub 上のそのコミットです。

```bash
docker build -t sample-app-roles .
```

Coolify ではビルドパックを Dockerfile にし、ベースディレクトリとビルドコンテキストをこのリポジトリにします。

ベースの変更をデプロイに載せるときは、そのコミットを GitHub へ出したあと `participant-app-base.rev` を更新します。依存関係が変わったときは、同じコミットの隣ディレクトリでこのアプリのロックファイルを更新してからピンを進めます。
