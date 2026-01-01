import { Plugin } from "obsidian";
import { parse } from "@ansi-tools/parser";

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
			const codeblocks = element.querySelectorAll("code.language-ansi");

			codeblocks.forEach((codeblock) => {
				const originalText = (codeblock as HTMLElement).innerText;
				const textToConvert = originalText
					.replace(/\\e/g, "\x1b")
					.replace(/\\n/g, "\n")
					.replace(/\\t/g, "\t")
					.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex: string) =>
						String.fromCharCode(parseInt(hex, 16))
					)
					.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex: string) =>
						String.fromCharCode(parseInt(hex, 16))
					);

				const htmlContent = this.ansiToHtml(textToConvert);

				if (htmlContent) {
					const preElement = codeblock.parentElement;

					if (preElement && preElement.tagName === "PRE") {
						const newPre = document.createElement("pre");
						newPre.className = preElement.className;

						const newCode = newPre.createEl("code", {
							cls: "language-ansi is-loaded",
						});

						// eslint-disable-next-line @microsoft/sdl/no-inner-html
						newCode.innerHTML = htmlContent;
						preElement.replaceWith(newPre);
					} else {
						// eslint-disable-next-line @microsoft/sdl/no-inner-html
						codeblock.innerHTML = htmlContent;
						codeblock.addClass("is-loaded");
					}
				}
			});
		});
	}

	ansiToHtml(input: string): string {
		const tokens = parse(input) as unknown as AnsiToken[];
		let html = "";
		let style: AnsiStyle = {};

		if (!tokens || !Array.isArray(tokens)) {
			return input;
		}

		for (const token of tokens) {
			if (token.type === "TEXT") {
				const content = token.value || token.text || token.raw;
				if (content) {
					html += this.renderText(content, style);
				}
			} else if (token.type === "CSI" && token.command === "m") {
				const rawParams =
					token.params && token.params.length > 0
						? token.params
						: ["0"];
				const params = rawParams.map((p) => parseInt(p, 10));

				for (let i = 0; i < params.length; i++) {
					const code = params[i];
					if (code === undefined || isNaN(code)) continue;

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
						const type = params[i + 1];

						const colorCode = params[i + 2];

						if (type === 5 && colorCode !== undefined) {
							const color = this.get256Color(colorCode);
							if (isFg) style.fg = color;
							else style.bg = color;
							i += 2;
						} else if (type === 2) {
							let isIso = false;
							if (params[i + 2] === 0 && params[i + 5] === 0) {
								isIso = true;
							}

							const offset = isIso ? 1 : 0;
							const r = params[i + 2 + offset] ?? 0;
							const g = params[i + 3 + offset] ?? 0;
							const b = params[i + 4 + offset] ?? 0;

							const color = `rgb(${r},${g},${b})`;
							if (isFg) style.fg = color;
							else style.bg = color;
							i += 4 + offset;
						}
					}
				}
			}
		}
		return html;
	}

	renderText(text: string, style: AnsiStyle): string {
		const styles: string[] = [];
		if (style.bold) styles.push("font-weight:bold");
		if (style.italic) styles.push("font-style:italic");
		if (style.underline) styles.push("text-decoration:underline");
		if (style.strikethrough) styles.push("text-decoration:line-through");
		if (style.dim) styles.push("opacity:0.6");

		let fg = style.fg;
		let bg = style.bg;

		if (style.inverse) {
			const temp = fg;
			fg = bg || "var(--text-normal)";
			bg = temp || "var(--background-primary)";
		}

		if (fg) styles.push(`color:${fg}`);
		if (bg) styles.push(`background-color:${bg}`);

		const escapedText = text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");

		if (styles.length > 0) {
			return `<span style="${styles.join(";")}">${escapedText}</span>`;
		}
		return escapedText;
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
