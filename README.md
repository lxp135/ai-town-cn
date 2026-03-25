# AI Town 🏠💻💌

[在线演示](https://www.convex.dev/ai-town)

[加入 Discord 社区: AI Stack Devs](https://discord.gg/PQUmTBTGmT)

<img width="1454" alt="Screen Shot 2023-08-14 at 10 01 00 AM" src="https://github.com/a16z-infra/ai-town/assets/3489963/a4c91f17-23ed-47ec-8c4e-9f9a8505057d">

AI Town 是一个虚拟小镇，AI 角色在这里生活、聊天和社交。

该项目是一个可部署的入门套件，用于轻松构建和定制你自己的 AI 小镇版本。其灵感源自研究论文《[_生成式代理：人类行为的交互式模拟_](https://arxiv.org/pdf/2304.03442.pdf)》。

该项目的主要目标除了开发乐趣之外，还在于提供一个具有强大基础、易于扩展的平台。后端原生支持共享全局状态、事务和模拟引擎，适用于从简单的练手项目到可扩展的多人游戏等各种场景。次要目标是提供 JS/TS 框架，因为该领域的大多数模拟器（包括上述原始论文）都是用 Python 编写的。

## 概览

- 💻 [技术栈](#技术栈)
- 🧠 [安装](#安装) (云端、本地、Docker、自托管、Fly.io...)
- 💻️ [Windows 环境准备](#windows-installation)
- 🤖 [配置你的 LLM](#connect-an-llm) (Ollama, OpenAI, Together.ai, ...)
- 👤 [自定义——属于你自己的模拟世界](#customize-your-own-simulation)
- 👩‍💻 [部署到生产环境](#deploy-the-app-to-production)
- 🐛 [故障排除](#troubleshooting)

## 技术栈

- 游戏引擎、数据库和向量搜索: [Convex](https://convex.dev/)
- 身份验证（可选）: [Clerk](https://clerk.com/)
- 默认聊天模型为 `llama3` 嵌入模型使用 `mxbai-embed-large`.
- 本地推理: [Ollama](https://github.com/jmorganca/ollama)
- 可配置其他云端 LLM: [Together.ai](https://together.ai/) 或任何支持 [OpenAI API](https://platform.openai.com/) 的模型，欢迎通过 PR 增加更多云供应商支持。
- 背景音乐生成: [Replicate](https://replicate.com/) 使用 [MusicGen](https://huggingface.co/spaces/facebook/MusicGen)

其他致谢:

- 像素艺术生成: [Replicate](https://replicate.com/),
  [Fal.ai](https://serverless.fal.ai/lora)
- All interactions, background music and rendering on the <Game/> component in the project are
  powered by [PixiJS](https://pixijs.com/).
- Tilesheet:
  - https://opengameart.org/content/16x16-game-assets by George Bailey
  - https://opengameart.org/content/16x16-rpg-tileset by hilau
- We used https://github.com/pierpo/phaser3-simple-rpg for the original POC of this project. We have
  since re-wrote the whole app, but appreciated the easy starting point
- Original assets by [ansimuz](https://opengameart.org/content/tiny-rpg-forest)
- The UI is based on original assets by
  [Mounir Tohami](https://mounirtohami.itch.io/pixel-art-gui-elements)

# 安装

总体步骤如下:

1. [构建与部署](#构建与部署)
2. [连接 LLM](#连接 LLM)

## 构建与部署

有几种方式可以在 Convex（后端）之上运行该应用。

1. 标准 Convex 设置：在本地或云端开发。这需要一个 Convex 账号（免费）。这是部署到云端并进行严肃开发最简单的方法。
2. Docker Compose 设置：如果你想在没有账号的情况下尝试，且熟悉 Docker，这种方式非常独立且完整。
3. Pinokio 一键安装：本项目有一个社区分支，在 [Pinokio](https://pinokio.computer/item?uri=https://github.com/cocktailpeanutlabs/aitown) 上为只想运行而不打算修改代码的用户提供了一键安装方案 😎。
4. Fly.io：你也可以将其部署到 [Fly.io](https://fly.io/)， 详见 [./fly](./fly) 目录下的说明。

### Standard Setup

注意：如果你使用的是 Windows，请参阅 [below](#windows-installation).

```sh
git clone https://github.com/a16z-infra/ai-town.git
cd ai-town
npm install
```

这需要登录你的 Convex 账号（如果尚未登录）。

运行应用：

```sh
npm run dev
```

现在你可以访问 http://localhost:5173

如果你希望分别运行前端和后端（这会在保存后端函数时同步它们），可以在两个终端中分别运行：

```bash
npm run dev:frontend
npm run dev:backend
```

详情参阅 [package.json](./package.json) 。

### 使用 Docker Compose 和自托管 Convex

你也可以通过自托管 Docker 容器运行 Convex 后端。我们将通过 docker compose 一次性设置前端、后端和仪表板。

```sh
docker compose up --build -d
```

如果加上 `-d` 参数，容器将在后台持续运行。之后你可以直接 `stop` 和 `start` 服务。

前端地址：http://localhost:5173

后端地址：http://localhost:3210（HTTP API 为 3211）

仪表板地址：http://localhost:6791

要登录仪表板并从 Convex CLI 部署，你需要生成一个管理员密钥（admin key）。

```sh
docker compose exec backend ./generate_admin_key.sh
```

将生成的密钥添加到你的 `.env.local` 文件中。注意：如果你运行了 `down` 之后再 `up`，你需要重新生成密钥并更新文件。


```sh
# in .env.local
CONVEX_SELF_HOSTED_ADMIN_KEY="<admin-key>" # 确保带引号
CONVEX_SELF_HOSTED_URL="http://127.0.0.1:3210"
```

然后设置 Convex 后端（仅需一次）：

```sh
npm run predev
```

持续向后端部署新代码并打印日志：

```sh
npm run dev:backend
```

访问 `http://localhost:6791` 并输入之前生成的管理员密钥来查看仪表板。

### Configuring Docker for Ollama

If you'll be using Ollama for local inference, you'll need to configure Docker to connect to it.

```sh
npx convex env set OLLAMA_HOST http://host.docker.internal:11434
```

To test the connection (after you [have it running](#ollama-default)):

```sh
docker compose exec backend /bin/bash curl http://host.docker.internal:11434
```

If it says "Ollama is running", it's good! Otherwise, check out the
[Troubleshooting](#troubleshooting) section.

## 连接 LLM

Note: If you want to run the backend in the cloud, you can either use a cloud-based LLM API, like
OpenAI or Together.ai or you can proxy the traffic from the cloud to your local Ollama. See
[below](#using-local-inference-from-a-cloud-deployment) for instructions.

### Ollama (default)

By default, the app tries to use Ollama to run it entirely locally.

1. Download and install [Ollama](https://ollama.com/).
2. Open the app or run `ollama serve` in a terminal. `ollama serve` will warn you if the app is
   already running.
3. Run `ollama pull llama3` to have it download `llama3`.
4. Test it out with `ollama run llama3`.

Ollama model options can be found [here](https://ollama.ai/library).

If you want to customize which model to use, adjust convex/util/llm.ts or set
`npx convex env set OLLAMA_MODEL # model`. If you want to edit the embedding model:

1. Change the `OLLAMA_EMBEDDING_DIMENSION` in `convex/util/llm.ts` and ensure:
   `export const EMBEDDING_DIMENSION = OLLAMA_EMBEDDING_DIMENSION;`
2. Set `npx convex env set OLLAMA_EMBEDDING_MODEL # model`.

Note: You might want to set `NUM_MEMORIES_TO_SEARCH` to `1` in constants.ts, to reduce the size of
conversation prompts, if you see slowness.

### OpenAI

To use OpenAI, you need to:

```ts
// In convex/util/llm.ts change the following line:
export const EMBEDDING_DIMENSION = OPENAI_EMBEDDING_DIMENSION;
```

Set the `OPENAI_API_KEY` environment variable. Visit https://platform.openai.com/account/api-keys if
you don't have one.

```sh
npx convex env set OPENAI_API_KEY 'your-key'
```

Optional: choose models with `OPENAI_CHAT_MODEL` and `OPENAI_EMBEDDING_MODEL`.

### Together.ai

To use Together.ai, you need to:

```ts
// In convex/util/llm.ts change the following line:
export const EMBEDDING_DIMENSION = TOGETHER_EMBEDDING_DIMENSION;
```

Set the `TOGETHER_API_KEY` environment variable. Visit https://api.together.xyz/settings/api-keys if
you don't have one.

```sh
npx convex env set TOGETHER_API_KEY 'your-key'
```

Optional: choose models via `TOGETHER_CHAT_MODEL`, `TOGETHER_EMBEDDING_MODEL`. The embedding model's
dimension must match `EMBEDDING_DIMENSION`.

### Other OpenAI-compatible API

You can use any OpenAI-compatible API, such as Anthropic, Groq, or Azure.

- Change the `EMBEDDING_DIMENSION` in `convex/util/llm.ts` to match the dimension of your embedding
  model.
- Edit `getLLMConfig` in `llm.ts` or set environment variables:

```sh
npx convex env set LLM_API_URL 'your-url'
npx convex env set LLM_API_KEY 'your-key'
npx convex env set LLM_MODEL 'your-chat-model'
npx convex env set LLM_EMBEDDING_MODEL 'your-embedding-model'
```

Note: if `LLM_API_KEY` is not required, don't set it.

### Note on changing the LLM provider or embedding model:

If you change the LLM provider or embedding model, you should delete your data and start over. The
embeddings used for memory are based on the embedding model you choose, and the dimension of the
vector database must match the embedding model's dimension. See
[below](#wiping-the-database-and-starting-over) for how to do that.

## Customize your own simulation

NOTE: every time you change character data, you should re-run `npx convex run testing:wipeAllTables`
and then `npm run dev` to re-upload everything to Convex. This is because character data is sent to
Convex on the initial load. However, beware that `npx convex run testing:wipeAllTables` WILL wipe
all of your data.

1. Create your own characters and stories: All characters and stories, as well as their spritesheet
   references are stored in [characters.ts](./data/characters.ts). You can start by changing
   character descriptions.

2. Updating spritesheets: in `data/characters.ts`, you will see this code:

   ```ts
   export const characters = [
     {
       name: 'f1',
       textureUrl: '/assets/32x32folk.png',
       spritesheetData: f1SpritesheetData,
       speed: 0.1,
     },
     ...
   ];
   ```

   You should find a sprite sheet for your character, and define sprite motion / assets in the
   corresponding file (in the above example, `f1SpritesheetData` was defined in f1.ts)

3. Update the Background (Environment): The map gets loaded in `convex/init.ts` from
   `data/gentle.js`. To update the map, follow these steps:

   - Use [Tiled](https://www.mapeditor.org/) to export tilemaps as a JSON file (2 layers named
     bgtiles and objmap)
   - Use the `convertMap.js` script to convert the JSON to a format that the engine can use.

   ```console
   node data/convertMap.js <mapDataPath> <assetPath> <tilesetpxw> <tilesetpxh>
   ```

   - `<mapDataPath>`: Path to the Tiled JSON file.
   - `<assetPath>`: Path to tileset images.
   - `<tilesetpxw>`: Tileset width in pixels.
   - `<tilesetpxh>`: Tileset height in pixels. Generates `converted-map.js` that you can use like
     `gentle.js`

4. Adding background music with Replicate (Optional)

   For Daily background music generation, create a [Replicate](https://replicate.com/) account and
   create a token in your Profile's [API Token page](https://replicate.com/account/api-tokens).
   `npx convex env set REPLICATE_API_TOKEN # token`

   This only works if you can receive the webhook from Replicate. If it's running in the normal
   Convex cloud, it will work by default. If you're self-hosting, you'll need to configure it to hit
   your app's url on `/http`. If you're using Docker Compose, it will be `http://localhost:3211`,
   but you'll need to proxy the traffic to your local machine.

   **Note**: The simulation will pause after 5 minutes if the window is idle. Loading the page will
   unpause it. You can also manually freeze & unfreeze the world with a button in the UI. If you
   want to run the world without the browser, you can comment-out the "stop inactive worlds" cron in
   `convex/crons.ts`.

   - Change the background music by modifying the prompt in `convex/music.ts`
   - Change how often to generate new music at `convex/crons.ts` by modifying the
     `generate new background music` job

## Commands to run / test / debug

**To stop the back end, in case of too much activity**

This will stop running the engine and agents. You can still run queries and run functions to debug.

```bash
npx convex run testing:stop
```

**To restart the back end after stopping it**

```bash
npx convex run testing:resume
```

**To kick the engine in case the game engine or agents aren't running**

```bash
npx convex run testing:kick
```

**To archive the world**

If you'd like to reset the world and start from scratch, you can archive the current world:

```bash
npx convex run testing:archive
```

Then, you can still look at the world's data in the dashboard, but the engine and agents will no
longer run.

You can then create a fresh world with `init`.

```bash
npx convex run init
```

**To pause your backend deployment**

You can go to the [dashboard](https://dashboard.convex.dev) to your deployment settings to pause and
un-pause your deployment. This will stop all functions, whether invoked from the client, scheduled,
or as a cron job. See this as a last resort, as there are gentler ways of stopping above.

## Windows Installation

### Prerequisites

1. **Windows 10/11 with WSL2 installed**
2. **Internet connection**

Steps:

1. Install WSL2

   First, you need to install WSL2. Follow
   [this guide](https://docs.microsoft.com/en-us/windows/wsl/install) to set up WSL2 on your Windows
   machine. We recommend using Ubuntu as your Linux distribution.

2. Update Packages

   Open your WSL terminal (Ubuntu) and update your packages:

   ```sh
   sudo apt update
   ```

3. Install NVM and Node.js

   NVM (Node Version Manager) helps manage multiple versions of Node.js. Install NVM and Node.js 18
   (the stable version):

   ```sh
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash
   export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   source ~/.bashrc
   nvm install 18
   nvm use 18
   ```

4. Install Python and Pip

   Python is required for some dependencies. Install Python and Pip:

   ```sh
   sudo apt-get install python3 python3-pip sudo ln -s /usr/bin/python3 /usr/bin/python
   ```

At this point, you can follow the instructions [above](#installation).

## Deploy the app to production

### Deploy Convex functions to prod environment

Before you can run the app, you will need to make sure the Convex functions are deployed to its
production environment. Note: this is assuming you're using the default Convex cloud product.

1. Run `npx convex deploy` to deploy the convex functions to production
2. Run `npx convex run init --prod`

To transfer your local data to the cloud, you can run `npx convex export` and then import it with
`npx convex import --prod`.

If you have existing data you want to clear, you can run
`npx convex run testing:wipeAllTables --prod`

### Adding Auth (Optional)

You can add clerk auth back in with `git revert b44a436`. Or just look at that diff for what changed
to remove it.

**Make a Clerk account**

- Go to https://dashboard.clerk.com/ and click on "Add Application"
- Name your application and select the sign-in providers you would like to offer users
- Create Application
- Add `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_***
CLERK_SECRET_KEY=sk_***
```

- Go to JWT Templates and create a new Convex Template.
- Copy the JWKS endpoint URL for use below.

```sh
npx convex env set CLERK_ISSUER_URL # e.g. https://your-issuer-url.clerk.accounts.dev/
```

### Deploy the frontend to Vercel

- Register an account on Vercel and then [install the Vercel CLI](https://vercel.com/docs/cli).
- **If you are using Github Codespaces**: You will need to
  [install the Vercel CLI](https://vercel.com/docs/cli) and authenticate from your codespaces cli by
  running `vercel login`.
- Deploy the app to Vercel with `vercel --prod`.

## Using local inference from a cloud deployment

We support using [Ollama](https://github.com/jmorganca/ollama) for conversation generations. To have
it accessible from the web, you can use Tunnelmole or Ngrok or similar so the cloud backend can send
requests to Ollama running on your local machine.

Steps:

1. Set up either Tunnelmole or Ngrok.
2. Add Ollama endpoint to Convex
   ```sh
   npx convex env set OLLAMA_HOST # your tunnelmole/ngrok unique url from the previous step
   ```
3. Update Ollama domains Ollama has a list of accepted domains. Add the ngrok domain so it won't
   reject traffic. see [ollama.ai](https://ollama.ai) for more details.

### Using Tunnelmole

[Tunnelmole](https://github.com/robbie-cahill/tunnelmole-client) is an open source tunneling tool.

You can install Tunnelmole using one of the following options:

- NPM: `npm install -g tunnelmole`
- Linux: `curl -s https://tunnelmole.com/sh/install-linux.sh | sudo bash`
- Mac:
  `curl -s https://tunnelmole.com/sh/install-mac.sh --output install-mac.sh && sudo bash install-mac.sh`
- Windows: Install with NPM, or if you don't have NodeJS installed, download the `exe` file for
  Windows [here](https://tunnelmole.com/downloads/tmole.exe) and put it somewhere in your PATH.

Once Tunnelmole is installed, run the following command:

```
tmole 11434
```

Tunnelmole should output a unique url once you run this command.

### Using Ngrok

Ngrok is a popular closed source tunneling tool.

- [Install Ngrok](https://ngrok.com/docs/getting-started/)

Once ngrok is installed and authenticated, run the following command:

```
ngrok http http://localhost:11434
```

Ngrok should output a unique url once you run this command.

## Troubleshooting

### Wiping the database and starting over

You can wipe the database by running:

```sh
npx convex run testing:wipeAllTables
```

Then reset with:

```sh
npx convex run init
```

### Incompatible Node.js versions

If you encounter a node version error on the convex server upon application startup, please use node
version 18, which is the most stable. One way to do this is by
[installing nvm](https://nodejs.org/en/download/package-manager) and running `nvm install 18` and
`nvm use 18`.

### Reaching Ollama

If you're having trouble with the backend communicating with Ollama, it depends on your setup how to
debug:

1. If you're running directly on Windows, see
   [Windows Ollama connection issues](#windows-ollama-connection-issues).
2. If you're using **Docker**, see
   [Docker to Ollama connection issues](#docker-to-ollama-connection-issues).
3. If you're running locally, you can try the following:

```sh
npx convex env set OLLAMA_HOST http://localhost:11434
```

By default, the host is set to `http://127.0.0.1:11434`. Some systems prefer `localhost`
¯\_(ツ)\_/¯.

### Windows Ollama connection issues

If the above didn't work after following the [windows](#windows-installation) and regular
[installation](#installation) instructions, you can try the following, assuming you're **not** using
Docker.

If you're using Docker, see the [next section](#docker-to-ollama-connection-issues) for Docker
troubleshooting.

For running directly on Windows, you can try the following:

1. Install `unzip` and `socat`:

   ```sh
   sudo apt install unzip socat
   ```

2. Configure `socat` to Bridge Ports for Ollama

   Run the following command to bridge ports:

   ```sh
   socat TCP-LISTEN:11434,fork TCP:$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):11434 &
   ```

3. Test if it's working:

   ```sh
   curl http://127.0.0.1:11434
   ```

   If it responds OK, the Ollama API should be accessible.

### Docker to Ollama connection issues

If you're having trouble with the backend communicating with Ollama, there's a couple things to
check:

1. Is Docker at least verion 18.03 ? That allows you to use the `host.docker.internal` hostname to
   connect to the host from inside the container.

2. Is Ollama running? You can check this by running `curl http://localhost:11434` from outside the
   container.

3. Is Ollama accessible from inside the container? You can check this by running
   `docker compose exec backend curl http://host.docker.internal:11434`.

If 1 & 2 work, but 3 does not, you can use `socat` to bridge the traffic from inside the container
to Ollama running on the host.

1. Configure `socat` with the host's IP address (not the Docker IP).

   ```sh
   docker compose exec backend /bin/bash
   HOST_IP=YOUR-HOST-IP
   socat TCP-LISTEN:11434,fork TCP:$HOST_IP:11434
   ```

   Keep this running.

2. Then from outside of the container:

   ```sh
   npx convex env set OLLAMA_HOST http://localhost:11434
   ```

3. Test if it's working:

   ```sh
   docker compose exec backend curl http://localhost:11434
   ```

   If it responds OK, the Ollama API is accessible. Otherwise, try changing the previous two to
   `http://127.0.0.1:11434`.

### Launching an Interactive Docker Terminal

If you wan to investigate inside the container, you can launch an interactive Docker terminal, for
the `frontend`, `backend` or `dashboard` service:

```bash
docker compose exec frontend /bin/bash
```

To exit the container, run `exit`.

### Updating the browser list

```bash
docker compose exec frontend npx update-browserslist-db@latest
```

# 🧑‍🏫 What is Convex?

[Convex](https://convex.dev) is a hosted backend platform with a built-in database that lets you
write your [database schema](https://docs.convex.dev/database/schemas) and
[server functions](https://docs.convex.dev/functions) in
[TypeScript](https://docs.convex.dev/typescript). Server-side database
[queries](https://docs.convex.dev/functions/query-functions) automatically
[cache](https://docs.convex.dev/functions/query-functions#caching--reactivity) and
[subscribe](https://docs.convex.dev/client/react#reactivity) to data, powering a
[realtime `useQuery` hook](https://docs.convex.dev/client/react#fetching-data) in our
[React client](https://docs.convex.dev/client/react). There are also clients for
[Python](https://docs.convex.dev/client/python), [Rust](https://docs.convex.dev/client/rust),
[ReactNative](https://docs.convex.dev/client/react-native), and
[Node](https://docs.convex.dev/client/javascript), as well as a straightforward
[HTTP API](https://docs.convex.dev/http-api/).

The database supports [NoSQL-style documents](https://docs.convex.dev/database/document-storage)
with [opt-in schema validation](https://docs.convex.dev/database/schemas),
[relationships](https://docs.convex.dev/database/document-ids) and
[custom indexes](https://docs.convex.dev/database/indexes/) (including on fields in nested objects).

The [`query`](https://docs.convex.dev/functions/query-functions) and
[`mutation`](https://docs.convex.dev/functions/mutation-functions) server functions have
transactional, low latency access to the database and leverage our
[`v8` runtime](https://docs.convex.dev/functions/runtimes) with
[determinism guardrails](https://docs.convex.dev/functions/runtimes#using-randomness-and-time-in-queries-and-mutations)
to provide the strongest ACID guarantees on the market: immediate consistency, serializable
isolation, and automatic conflict resolution via
[optimistic multi-version concurrency control](https://docs.convex.dev/database/advanced/occ) (OCC /
MVCC).

The [`action` server functions](https://docs.convex.dev/functions/actions) have access to external
APIs and enable other side-effects and non-determinism in either our
[optimized `v8` runtime](https://docs.convex.dev/functions/runtimes) or a more
[flexible `node` runtime](https://docs.convex.dev/functions/runtimes#nodejs-runtime).

Functions can run in the background via
[scheduling](https://docs.convex.dev/scheduling/scheduled-functions) and
[cron jobs](https://docs.convex.dev/scheduling/cron-jobs).

Development is cloud-first, with
[hot reloads for server function](https://docs.convex.dev/cli#run-the-convex-dev-server) editing via
the [CLI](https://docs.convex.dev/cli),
[preview deployments](https://docs.convex.dev/production/hosting/preview-deployments),
[logging and exception reporting integrations](https://docs.convex.dev/production/integrations/),
There is a [dashboard UI](https://docs.convex.dev/dashboard) to
[browse and edit data](https://docs.convex.dev/dashboard/deployments/data),
[edit environment variables](https://docs.convex.dev/production/environment-variables),
[view logs](https://docs.convex.dev/dashboard/deployments/logs),
[run server functions](https://docs.convex.dev/dashboard/deployments/functions), and more.

There are built-in features for [reactive pagination](https://docs.convex.dev/database/pagination),
[file storage](https://docs.convex.dev/file-storage),
[reactive text search](https://docs.convex.dev/text-search),
[vector search](https://docs.convex.dev/vector-search),
[https endpoints](https://docs.convex.dev/functions/http-actions) (for webhooks),
[snapshot import/export](https://docs.convex.dev/database/import-export/),
[streaming import/export](https://docs.convex.dev/production/integrations/streaming-import-export),
and [runtime validation](https://docs.convex.dev/database/schemas#validators) for
[function arguments](https://docs.convex.dev/functions/args-validation) and
[database data](https://docs.convex.dev/database/schemas#schema-validation).

Everything scales automatically, and it’s [free to start](https://www.convex.dev/plans).
