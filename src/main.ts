import { Plugin } from "obsidian";
import { parse } from "@ansi-tools/parser";

// Cache regex patterns to avoid recompilation
const REGEX_ESCAPE = /\\e/g;
const REGEX_NEWLINE = /\\n/g;
const REGEX_TAB = /\\t/g;
const REGEX_HEX = /\\x([0-9A-Fa-f]{2})/g;
const REGEX_UNICODE = /\\u([0-9A-Fa-f]{4})/g;

interface AnsiStyle {
	fg?: string;
	bg?: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	dim?: boolean;
	inverse?: boolean;
	strikethrough?: boolean;
}

interface AnsiToken {
	type: string;
	raw: string;
	command?: string;
	params?: string[];
	value?: string;
	text?: string;
}

export default class AnsiPlugin extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor((element, context) => {
			const codeblocks = element.querySelectorAll("code.language-terminal");

			codeblocks.forEach((codeblock) => {
				const originalText = (codeblock as HTMLElement).innerText;
				const textToConvert = originalText
					.replace(REGEX_ESCAPE, "\x1b")
					.replace(REGEX_NEWLINE, "\n")
					.replace(REGEX_TAB, "\t")
					.replace(REGEX_HEX, (_, hex: string) =>
						String.fromCharCode(parseInt(hex, 16))
					)
					.replace(REGEX_UNICODE, (_, hex: string) =>
						String.fromCharCode(parseInt(hex, 16))
					);

				const fragment = this.ansiToFragment(textToConvert);

				const preElement = codeblock.parentElement;

				if (preElement && preElement.tagName === "PRE") {
					const newPre = document.createElement("pre");
					newPre.className = preElement.className;

					const newCode = newPre.createEl("code", {
						cls: "language-terminal is-loaded",
					});

					newCode.appendChild(fragment);
					preElement.replaceWith(newPre);
				} else {
					codeblock.innerHTML = "";
					codeblock.appendChild(fragment);
					codeblock.addClass("is-loaded");
				}
			});
		});
	}

	ansiToFragment(input: string): DocumentFragment {
		const tokens = parse(input) as unknown as AnsiToken[];
		const fragment = document.createDocumentFragment();
		let style: AnsiStyle = {};

		if (!tokens || !Array.isArray(tokens)) {
			fragment.textContent = input;
			return fragment;
		}

		for (const token of tokens) {
			if (token.type === "TEXT") {
				const content = token.value || token.text || token.raw;
				if (content) {
					fragment.appendChild(this.createStyledSpan(content, style));
				}
			} else if (token.type === "CSI" && token.command === "m") {
				const params =
					token.params && token.params.length > 0
						? token.params
						: ["0"];

				for (let i = 0; i < params.length; i++) {
					const code = parseInt(params[i] ?? "", 10);
					if (isNaN(code)) continue;

					if (code === 0) {
						style = {};
					} else if (code === 1) {
						style.bold = true;
					} else if (code === 2) {
						style.dim = true;
					} else if (code === 3) {
						style.italic = true;
					} else if (code === 4) {
						style.underline = true;
					} else if (code === 7) {
						style.inverse = true;
					} else if (code === 9) {
						style.strikethrough = true;
					} else if (code === 22) {
						style.bold = false;
						style.dim = false;
					} else if (code === 23) {
						style.italic = false;
					} else if (code === 24) {
						style.underline = false;
					} else if (code === 27) {
						style.inverse = false;
					} else if (code === 29) {
						style.strikethrough = false;
					} else if (code >= 30 && code <= 37) {
						style.fg = this.getAnsiColor(code - 30);
					} else if (code === 39) {
						delete style.fg;
					} else if (code >= 40 && code <= 47) {
						style.bg = this.getAnsiColor(code - 40);
					} else if (code === 49) {
						delete style.bg;
					} else if (code >= 90 && code <= 97) {
						style.fg = this.getAnsiColor(code - 90, true);
					} else if (code >= 100 && code <= 107) {
						style.bg = this.getAnsiColor(code - 100, true);
					} else if (code === 38 || code === 48) {
						const isFg = code === 38;
						const type = parseInt(params[i + 1] ?? "", 10);

						if (type === 5) {
							const colorCode = parseInt(params[i + 2] ?? "", 10);
							if (!isNaN(colorCode)) {
								const color = this.get256Color(colorCode);
								if (isFg) style.fg = color;
								else style.bg = color;
							}
							i += 2;
						} else if (type === 2) {
							let isIso = false;
							const p2 = parseInt(params[i + 2] ?? "", 10);
							if (p2 === 0) {
								isIso = true;
							}

							const offset = isIso ? 1 : 0;
							const r = parseInt(params[i + 2 + offset] ?? "", 10) || 0;
							const g = parseInt(params[i + 3 + offset] ?? "", 10) || 0;
							const b = parseInt(params[i + 4 + offset] ?? "", 10) || 0;

							const color = `rgb(${r},${g},${b})`;
							if (isFg) style.fg = color;
							else style.bg = color;
							i += 4 + offset;
						}
					}
				}
			}
		}
		return fragment;
	}

	createStyledSpan(text: string, style: AnsiStyle): HTMLElement {
		const span = document.createElement("span");
		span.textContent = text;

		if (style.bold) span.setCssProps({ "font-weight": "bold" });
		if (style.italic) span.setCssProps({ "font-style": "italic" });
		if (style.underline) span.setCssProps({ "text-decoration": "underline" });
		if (style.strikethrough) span.setCssProps({ "text-decoration": "line-through" });
		if (style.dim) span.setCssProps({ "opacity": "0.6" });

		let fg = style.fg;
		let bg = style.bg;

		if (style.inverse) {
			const temp = fg;
			fg = bg || "var(--text-normal)";
			bg = temp || "var(--background-primary)";
		}

		if (fg) span.style.color = fg;
		if (bg) span.style.backgroundColor = bg;

		return span;
	}

	getAnsiColor(index: number, bright = false): string {
		const colors = [
			"var(--color-black, black)",
			"var(--color-red, #d04255)",
			"var(--color-green, #08979c)",
			"var(--color-yellow, #d4b106)",
			"var(--color-blue, #1890ff)",
			"var(--color-purple, #6900a1)",
			"var(--color-cyan, #08979c)",
			"var(--color-white, white)",
		];
		const brightColors = [
			"gray",
			"#ff7875",
			"#5cdbd3",
			"#ffec3d",
			"#69c0ff",
			"#b37feb",
			"#5cdbd3",
			"white",
		];
		return (bright ? brightColors[index] : colors[index]) || "";
	}

	get256Color(n: number): string {
		if (n < 16) return this.getAnsiColor(n % 8, n >= 8);
		if (n < 232) {
			const index = n - 16;
			const r = Math.floor(index / 36) * 51;
			const g = Math.floor((index % 36) / 6) * 51;
			const b = (index % 6) * 51;
			return `rgb(${r},${g},${b})`;
		}
		const gray = (n - 232) * 10 + 8;
		return `rgb(${gray},${gray},${gray})`;
	}
}
