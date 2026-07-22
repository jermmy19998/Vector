# Vector

![Vector logo](public/vector-logo.png)

## Research Automation Platform

Vector is a desktop-first research information automation platform. Configure a monitor once, choose real internet sources, define keywords and filters, and run a reproducible scan when needed.

Vector is not an RSS reader and does not generate AI summaries or recommendations. Findings are produced from provider data and retain the original source URL.

## 研究信息自动化平台

Vector 是一款桌面优先的科研信息自动化平台。用户只需配置一次监控器，即可选择真实互联网来源、关键词和过滤规则，并按需执行可复现的扫描。

Vector 不是 RSS 阅读器，也不会生成 AI 摘要或推荐。所有 Findings 均来自 Provider 的真实数据，并保留原始链接。

## Features / 功能

- Monitor wizard with schedule, timezone, sources, keywords, exclusions, Regex and filters
- Real provider execution for arXiv, PubMed, OpenReview, Crossref, OpenAlex, GitHub, Hugging Face Papers, Semantic Scholar and custom RSS/Atom feeds where the upstream API is available
- Findings with source icon, fetched time, publication time, authors, institutions, subjects and original link
- Execution history with success, partial success, failure, timing, scan counts and error details
- Editable keyword and multi-channel notification configuration
- Chinese / English UI switch
- Dark-first desktop UI packaged with Electron

## 当前状态 / Current status

This repository contains the working desktop application and provider execution foundation. Upstream services may enforce rate limits or require credentials; Vector shows the actual provider error instead of fabricating results. Email delivery is intentionally not exposed yet.

本仓库包含可运行的桌面应用和 Provider 执行基础设施。上游服务可能限流或要求认证；Vector 会展示真实错误，不会伪造结果。当前暂不提供 Email 发送渠道。

## Run from source / 源码运行

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run typecheck
npm run lint
npm run build
```

## Desktop build / 构建桌面版

```bash
npm run desktop
```

The Windows portable build is emitted under `release/` when electron-builder is configured for the current environment.

## Data and privacy / 数据与隐私

Workspace configuration is stored locally in the browser storage used by the Electron app. Provider requests go directly to the configured upstream endpoint through the local Next.js execution route. Do not enter secrets into a destination until its authentication flow is implemented and reviewed.

工作区配置保存在 Electron 应用使用的本地存储中。Provider 请求通过本地 Next.js 执行路由访问配置的上游地址。在渠道认证流程实现并审核前，请勿填写敏感密钥。

## About

Gray Medical Computing Laboratory · Shenzhen Gray Technology Co., Ltd.  
[www.gray.org.cn](https://www.gray.org.cn)

## License

MIT License. See [LICENSE](LICENSE).
