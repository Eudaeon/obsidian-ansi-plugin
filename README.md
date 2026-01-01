# Obsidian ANSI Plugin

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/Eudaeon/set-uid-gid-root?style=for-the-badge)](https://github.com/Eudaeon/set-uid-gid-root/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Eudaeon/set-uid-gid-root?style=for-the-badge)](https://github.com/Eudaeon/set-uid-gid-root/network)
[![GitHub issues](https://img.shields.io/github/issues/Eudaeon/set-uid-gid-root?style=for-the-badge)](https://github.com/Eudaeon/set-uid-gid-root/issues)
[![GitHub license](https://img.shields.io/github/license/Eudaeon/set-uid-gid-root?style=for-the-badge)](LICENSE)

**An Obsidian plugin to render ANSI escape codes in your notes.**

</div>

## 📖 Overview

This plugin automatically parses ANSI escape sequences—including 8-color, 256-color, and truecolor (RGB) formats—and converts them into styled HTML within your Markdown previews.

## 📦 Setup

### Installation

Clone the repository into your vault and install dependencies with:

```bash
mkdir -p .obsidian/plugins
git clone https://github.com/Eudaeon/obsidian-ansi-plugin .obsidian/plugins
cd .obsidian/plugins/obsidian-ansi-plugin
npm install
```

### Serve

To start a local development server:

```bash
npm run dev
```

### Build

To type-check and build the application for production:

```bash
npm run build
```

## 🔧 Usage

Wrap your ANSI-encoded text in a code block with the `ansi` language identifier:

```ansi
\x1b[38;2;255;255;0mH\x1b[0;1;3;35me\x1b[95ml\x1b[42ml\x1b[0;41mo\x1b[0m\n\n\u001b[31mRed\u001b[39m, \u001b[32mgreen\u001b[39m, and \u001b[44mblue background\u001b[49m.\n\n\u001b[1mBold\u001b[22m, \u001b[3mItalic\u001b[23m, \u001b[4mUnderline\u001b[24m, and \u001b[9mStrikethrough\u001b[29m.
```

The plugin will automatically detect these blocks and render them with the appropriate styling in "Reading view" mode.

<div align="center">

![ANSI output](img/ansi-output.png)

</div>

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by [Eudaeon](https://github.com/Eudaeon)

</div>
