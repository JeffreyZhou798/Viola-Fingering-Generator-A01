# 🎻 Viola Fingering Generator - Edition 1.0

An AI-powered viola fingering generation system using **complete Dyna-Q reinforcement learning algorithm**. Upload MusicXML files and get optimal fingering suggestions - **runs entirely in your browser!**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](#english) | [中文](#中文) | [日本語](#日本語)

---

## English

### 🌟 Features

#### 🎯 Complete Dyna-Q Algorithm Implementation

**Core Components:**

✅ **Prioritized Replay** - Priority queue with TD-error based priorities (θ=3.0)  
✅ **Predecessor Tracking** - Efficient backward propagation of value updates  
✅ **Model Learning Loop** - 10× update amplification (10 planning steps per real interaction)  
✅ **Initial States Tracking** - Prevents unnecessary updates  
✅ **Convergence Detection** - Early stopping when reward stabilizes  
✅ **Parallel Multi-threading** - Web Workers for 3-4x faster training

**Implementation**: Based on verified piano fingering project, adapted for viola

#### 🚀 Advanced Capabilities

- **🎼 MusicXML Support**: Upload `.musicxml` and `.mxl` (compressed) format files
- **🤖 AI-Powered**: Complete Dyna-Q reinforcement learning algorithm
- **⚡ Parallel Training**: Multi-core CPU utilization with Web Workers (4/2/1 workers auto-detected)
- **🌍 Multi-language**: Interface available in English, Chinese, and Japanese
- **📊 Real-time Progress**: Track training status with live progress updates for each worker
- **💻 Browser-Based**: Runs entirely in your browser - no server needed!
- **💾 Smart Caching**: IndexedDB caching for instant results on repeated files
- **🎨 Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **🆓 Free**: Zero cost deployment on Vercel

### 🧠 Algorithm Details

#### Dyna-Q Reinforcement Learning

This implementation uses the **complete Dyna-Q algorithm**, combining model-based and model-free reinforcement learning:

**Training Process:**

- **Episodes**: 10,000 training episodes (with early stopping)
- **Planning Steps**: 10 simulated updates per real interaction
- **Total Updates**: ~550,000 Q-value updates (vs 5,000 in basic Q-Learning)
- **Convergence**: Early stopping when reward stabilizes (checked every 300 episodes)

**Algorithm Parameters (Viola-specific):**

```typescript
{
  nEpisodes: 10000,
  learningRate: 0.99,
  discountFactor: 0.985,      // Between violin (0.98) and cello (0.99)
  explorationRate: 0.8,
  planningSteps: 10,
  priorityThreshold: 3.0,
  evaluationInterval: 300
}
```

### 🎻 Viola-Specific Constraints

- **Open String Pitches**: A4(69), D4(62), G3(55), C3(48) — CGDA tuning
- **Finger Range**: 0-4 (0=open string, 1-4=fingers, no thumb)
- **String Count**: 4 strings
- **Position Range**: 0-35 positions
- **Upper Bout Cutoff**: Position 6
- **Fingering Pattern**: 1-2-3-4 (same as violin, unlike cello's 1-3-4)
- **Open String Reward**: -30 (encouraged, between violin penalty and cello reward)
- **String Cross Penalty**: 2.5× (between violin 2× and cello 3×)
- **Shift Penalty**: 1.1× (between violin 1.0× and cello 1.2×)

### 📊 Performance Metrics

#### Processing Time (with Parallel Training)

| File Complexity | Notes        | 4-Core PC      | 2-Core PC      | Single-Core | Quality   |
| --------------- | ------------ | -------------- | -------------- | ----------- | --------- |
| Simple          | 10-30 notes  | 4-8 seconds    | 8-15 seconds   | 15-30 sec   | Excellent |
| Medium          | 50-100 notes | 14-27 seconds  | 26-53 seconds  | 50-100 sec  | Excellent |
| Complex         | 200+ notes   | 32-65 seconds  | 63-126 seconds | 120-240 sec | Very Good |
| Cached Files    | Any          | <1 second      | <1 second      | <1 second   | Instant   |

### 🚀 Quick Start

#### 💻 Local Development

1. **Clone the repository**
```bash
git clone [repository-url]
cd Viola-Fingering-Generator-A01
```

2. **Install dependencies**
```bash
cd frontend
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open your browser**
```
http://localhost:3000
```

### 📖 Usage

1. Visit http://localhost:3000
2. Select your preferred language (English/中文/日本語)
3. Upload a MusicXML file (.musicxml or .mxl format)
4. Wait for processing (typically 15 seconds to 4 minutes)
5. Download the result as MusicXML file with fingering annotations
6. Open the downloaded file in MuseScore or other music notation software

### 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         Browser                     │
│  ┌───────────────────────────────┐  │
│  │  Next.js Frontend             │  │
│  │  - File Upload UI             │  │
│  │  - Progress Display           │  │
│  │  - Multi-language Support     │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  Parallel Training Manager    │  │
│  │  - Device Detection (4/2/1)   │  │
│  │  - Worker Coordination        │  │
│  │  - Q-table Merging            │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│              ▼                       │
│  ┌─────────────┬─────────────┬───┐  │
│  │  Worker 1   │  Worker 2   │...│  │
│  │  Dyna-Q     │  Dyna-Q     │   │  │
│  │  Training   │  Training   │   │  │
│  └─────────────┴─────────────┴───┘  │
│              │                       │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │  IndexedDB Cache              │  │
│  │  - File Hash Storage          │  │
│  │  - Result Caching             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 📁 Project Structure

```
Viola-Fingering-Generator-A01/
├── frontend/                    # Next.js web application
│   ├── src/
│   │   ├── app/                # Next.js 14 App Router
│   │   │   ├── page.tsx        # Main page
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── globals.css     # Global styles
│   │   ├── components/         # React components
│   │   │   ├── FileUploader.tsx
│   │   │   ├── LanguageSwitcher.tsx
│   │   │   ├── ProcessingStatus.tsx
│   │   │   └── ResultDisplay.tsx
│   │   └── lib/
│   │       ├── algorithm/      # Core algorithm
│   │       │   ├── types.ts    # Viola: position 0-35, no thumb
│   │       │   ├── const.ts    # Viola: CGDA tuning, viola penalties
│   │       │   ├── dynaQ.ts    # Uses POSITION_COUNT/FINGER_COUNT
│   │       │   ├── parallelTrainer.ts
│   │       │   └── priorityQueue.ts
│   │       ├── music/          # Music file processing
│   │       │   ├── parser.ts
│   │       │   └── writer.ts
│   │       ├── cache/          # Caching layer
│   │       │   └── indexedDB.ts  # DB_NAME: ViolaFingeringDB
│   │       └── i18n.ts         # Internationalization (EN/ZH/JA)
│   ├── workers/                # Web Workers
│   │   └── dynaQ.worker.ts
│   ├── public/                 # Static files
│   │   ├── viola.svg           # Viola icon
│   │   └── test.html           # Debug page
│   ├── vercel.json             # Vercel deployment config
│   ├── next.config.js          # Next.js config (output: 'export')
│   ├── package.json            # name: viola-fingering-generator
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── CompositionExamples/        # Test MusicXML files
├── README.md                   # This file
└── LICENSE                     # MIT License
```

### 🌐 Deployment

#### Vercel (Recommended)

1. Fork this repository
2. Connect your GitHub repository to Vercel
3. Configure:
   - Framework Preset: Next.js
   - **Root Directory: `frontend`** ← Important!
   - Build Command: (use default)
   - Output Directory: (use default)
4. Deploy

The app will be automatically deployed and available at your Vercel URL.

### ⚠️ Known Limitations

- **Large Files**: Files with >1000 notes may take longer to process
- **Memory**: Complex scores may use significant browser memory
- **Processing Time**: First-time processing takes 4-65 seconds on 4-core PC (cached files are instant)
- **Mobile Devices**: Automatically uses single-threaded mode for stability
- **Algorithm**: Some complex scores may produce suboptimal results

### 🙏 Credits

This project uses the complete Dyna-Q reinforcement learning algorithm for optimal fingering generation.

**Open Source Libraries:**
- Next.js - React framework
- TypeScript - Type-safe JavaScript
- Tailwind CSS - Utility-first CSS framework
- xml2js - XML parsing
- jszip - ZIP file handling
- idb - IndexedDB wrapper

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 中文

### 🌟 功能特性

#### 🎯 完整 Dyna-Q 算法实现

**核心组件：**

✅ **优先级回放** - 基于TD误差的优先级队列（θ=3.0）  
✅ **前驱状态追踪** - 高效的价值更新反向传播  
✅ **模型学习循环** - 10倍更新放大（每次真实交互10次规划步骤）  
✅ **初始状态追踪** - 防止不必要的更新  
✅ **收敛检测** - 奖励稳定时提前停止  
✅ **并行多线程** - Web Workers实现3-4倍加速

### 🎻 中提琴特定约束

- **空弦音高**：A4(69), D4(62), G3(55), C3(48) — CGDA定弦
- **手指范围**：0-4（0=空弦，1-4=手指，无拇指）
- **琴弦数量**：4根弦
- **位置范围**：0-35个位置
- **上把位截止点**：位置6
- **指法模式**：1-2-3-4（与小提琴相同，非大提琴的1-3-4）
- **空弦奖励**：-30（积极鼓励空弦使用）
- **换弦惩罚**：2.5×（介于小提琴2×和大提琴3×之间）
- **换把惩罚**：1.1×（介于小提琴1.0×和大提琴1.2×之间）

### 🚀 快速开始

#### 💻 本地开发

1. **克隆仓库**
```bash
git clone [repository-url]
cd Viola-Fingering-Generator-A01
```

2. **安装依赖**
```bash
cd frontend
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **打开浏览器**
```
http://localhost:3000
```

### 📖 使用方法

1. 访问 http://localhost:3000
2. 选择您偏好的语言（English/中文/日本語）
3. 上传 MusicXML 文件（.musicxml 或 .mxl 格式）
4. 等待处理（通常需要 15 秒到 4 分钟）
5. 下载带有指法标注的 MusicXML 文件
6. 在 MuseScore 或其他乐谱软件中打开下载的文件

### 🌐 部署

#### Vercel（推荐）

1. Fork 本仓库
2. 将 GitHub 仓库连接到 Vercel
3. 配置：
   - Framework Preset: Next.js
   - **Root Directory: `frontend`** ← 重要！
   - Build Command: （使用默认）
   - Output Directory: （使用默认）
4. 部署

---

## 日本語

### 🌟 機能

#### 🎯 完全な Dyna-Q アルゴリズム実装

**コアコンポーネント：**

✅ **優先度付きリプレイ** - TD誤差ベースの優先度キュー（θ=3.0）  
✅ **前任状態追跡** - 効率的な価値更新の逆伝播  
✅ **モデル学習ループ** - 10倍の更新増幅  
✅ **初期状態追跡** - 不要な更新を防止  
✅ **収束検出** - 報酬が安定したら早期停止  
✅ **並列マルチスレッド** - Web Workersによる3-4倍高速化

### 🎻 ビオラ固有の制約

- **開放弦音高**：A4(69), D4(62), G3(55), C3(48) — CGDA調弦
- **指範囲**：0-4（0=開放弦、1-4=指、親指なし）
- **弦数**：4弦
- **ポジション範囲**：0-35ポジション
- **アッパーボートカットオフ**：ポジション6
- **運指パターン**：1-2-3-4（バイオリンと同じ、チェロの1-3-4とは異なる）
- **開放弦報酬**：-30（開放弦の使用を奨励）
- **弦移行ペナルティ**：2.5×（バイオリン2×とチェロ3×の中間）
- **ポジション移動ペナルティ**：1.1×（バイオリン1.0×とチェロ1.2×の中間）

### 🚀 クイックスタート

#### 💻 ローカル開発

1. **リポジトリをクローン**
```bash
git clone [repository-url]
cd Viola-Fingering-Generator-A01
```

2. **依存関係をインストール**
```bash
cd frontend
npm install
```

3. **開発サーバーを起動**
```bash
npm run dev
```

4. **ブラウザを開く**
```
http://localhost:3000
```

### 🌐 デプロイ

#### Vercel（推奨）

1. このリポジトリをフォーク
2. GitHubリポジトリをVercelに接続
3. 設定：
   - Framework Preset: Next.js
   - **Root Directory: `frontend`** ← 重要！
   - Build Command: （デフォルトを使用）
   - Output Directory: （デフォルトを使用）
4. デプロイ

---

## ⚠️ Copyright Notice

© 2026 Jeffrey Zhou. All rights reserved.

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ for music education by Jeffrey Zhou*
