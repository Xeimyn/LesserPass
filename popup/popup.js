document.addEventListener("DOMContentLoaded", async () => {
	const getElementByClass = (className) => document.getElementsByClassName(className)[0];

	const siteElement = getElementByClass("site");
	const loginElement = getElementByClass("login");
	const masterPasswordElement = getElementByClass("masterPassword");
	const outputElement = getElementByClass("output");
	const lengthElement = document.getElementById("LengthInput");
	const indexElement = document.getElementById("IndexInput");
	const toggleViewButton = getElementByClass("toggleViewButton");
	const toggleViewButtonImage = getElementByClass("toggleButtonImg");
	const copiedOverlayElement = getElementByClass("copiedOverlay");
	const emojiListElement = getElementByClass("emojiList");
	const emojiElements = document.getElementsByClassName("emoji");

	const SETTINGS = JSON.parse(localStorage.getItem("LesserPassSettings")) || {};
	if (!SETTINGS.defaultInputs) {
		chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
		return;
	}

	loginElement.value = SETTINGS.defaultInputs.defaultLogin;
	lengthElement.value = SETTINGS.defaultInputs.defaultLength;
	indexElement.value = SETTINGS.defaultInputs.defaultIndex;

	const regeneratePassword = async () => {
		const { value: site } = siteElement;
		const { value: login } = loginElement;
		const { value: masterPassword } = masterPasswordElement;
		const { value: length } = lengthElement;
		const { value: index } = indexElement;
		const { charset, iterations } = SETTINGS.defaultInputs;

		if (site && login && masterPassword.length >= 1 && Number(length) >= 1 && Number(index)) {
			const finalPW = await genPW(site, login, masterPassword, length, index, charset, iterations);
			outputElement.value = finalPW;
		} else {
			outputElement.value = "";
		}
	};

	// 45

	[siteElement, loginElement, masterPasswordElement, lengthElement, indexElement].forEach(element =>
		element.addEventListener("keyup", regeneratePassword));

	["minusBL", "plusBL", "minusBI", "plusBI"].forEach(id =>
		document.getElementById(id).addEventListener("click", regeneratePassword));

	masterPasswordElement.addEventListener("input", () => {
		if (masterPasswordElement.value.length === 0) {
			emojiElements[0].innerText = "-"
			emojiElements[1].innerText = "-"
			emojiElements[2].innerText = "-"
			outputElement.value = "";
			return
		}

		emojis = [
			"🍒","🚽","🌊","🐶","👍","🐀","🌴","🍌", //8
			"🍏","🔒","🍓","🎓","🎉","🐐","🔥","✋", // 16
			"🤡","🤛","🐈","🚁","🔆","🌜","🔑","🎻",
			"🚧","🏓","🎮","💜","💩","👽","👻","💀", // 32
			"🐱‍👤","🦄","🐍","🐉","🦖","🐘","🦞","🦴",
			"🦷","👀","👅","🦾","🦿","🧠","✨","🎉",
			"💍","💎","🛒","🏆","🥇","🔊","🔧","📞",
			"💣","🔍","📌","🍗","🍇","🥕","🚲","🚀"] // 64

		// Get 3 emojis based on the password hash. Must be deterministic.
		const hash = masterPasswordElement.value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const emoji1 = emojis[hash % emojis.length];
		const emoji2 = emojis[(hash * 2) % emojis.length];
		const emoji3 = emojis[(hash * 3) % emojis.length];
		emojiElements[0].innerText = emoji1;
		emojiElements[1].innerText = emoji2;
		emojiElements[2].innerText = emoji3;
	})

	toggleViewButton.addEventListener("click", () => {
		const isPassword = outputElement.type === "password";
		outputElement.type = isPassword ? "text" : "password";
		toggleViewButtonImage.src = isPassword ? "../assets/icons/eye_blind.svg" : "../assets/icons/eye.svg";
	});

	emojiListElement.addEventListener("click", () => {
		const isPassword = masterPasswordElement.type === "password";
		masterPasswordElement.type = isPassword ? "text" : "password";
	});

	const adjustValue = (element, delta) => {
		element.value = Math.max(1, (Number(element.value) || 1) + delta);
	};

	document.getElementById("minusBL").addEventListener("click", () => adjustValue(lengthElement, -1));
	document.getElementById("plusBL").addEventListener("click", () => adjustValue(lengthElement, 1));
	document.getElementById("minusBI").addEventListener("click", () => adjustValue(indexElement, -1));
	document.getElementById("plusBI").addEventListener("click", () => adjustValue(indexElement, 1));

	masterPasswordElement.addEventListener("keydown", (event) => {
		if (event.key === "Enter") copyToClipboard(outputElement.value);
	});

	outputElement.addEventListener("click", () => copyToClipboard(outputElement.value));

	copiedOverlayElement.addEventListener("click", () => {
		copiedOverlayElement.style.visibility = "hidden";
	});

	const showOverlay = () => {
		if (SETTINGS.uiSettings?.copiedOverlay) {
			copiedOverlayElement.style.visibility = "visible";
			setTimeout(() => copiedOverlayElement.style.visibility = "hidden", SETTINGS.uiSettings.copiedOverlayDuration);
		}
	};

	const copyToClipboard = (value) => {
		if (!value) return console.log('[LesserPass] Not gonna copy empty text');
		if (SETTINGS.experimentalSettings?.autoFill) return autoFillPassword(value);

		navigator.clipboard.writeText(value).then(() => {
			showOverlay();
			console.log('[LesserPass] Password copied to clipboard');
		}).catch(err => console.error('[LesserPass] Could not copy text: ', err));
	};

	const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
	siteElement.value = cleanUrl(tab.url, SETTINGS.urlFormatting);

	if (SETTINGS.uiSettings?.autoFocus) {
		const focusMap = {
			"Site": siteElement,
			"Login": loginElement,
			"MasterPW": masterPasswordElement,
			"PWLength": lengthElement,
			"PWIndex": indexElement,
		};
		focusMap[SETTINGS.uiSettings.autoFocus]?.focus();
	}
});

async function genPW(site, login, masterPassword, length, index, chars, iterations) {
	const encoder = new TextEncoder();
	const salt = encoder.encode(site + login + index);

	try {
		const keyMaterial = await window.crypto.subtle.importKey(
			"raw", encoder.encode(masterPassword), { name: "PBKDF2" }, false, ["deriveBits"]
		);

		const derivedBits = await window.crypto.subtle.deriveBits(
			{ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, keyMaterial, 256
		);

		const hashArray = Array.from(new Uint8Array(derivedBits));
		return Array.from({ length }, (_, i) => chars[(hashArray[i] + hashArray[(i + length) % hashArray.length]) % chars.length]).join('');
	} catch (error) {
		console.warn("[LesserPass] PBKDF2 failed.");
		return "";
	}
}

function autoFillPassword(value) {
	chrome.runtime.sendMessage({ action: "autofillPassword", password: value });
}

function cleanUrl(url, settings) {
	if (settings?.stripSubdomain) url = url.replace(/([a-zA-Z0-9-]+\.)+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g, '');
	if (settings?.stripProtocol) url = url.replace(/^([a-zA-Z\d+\-.]*):\/\//, '');
	if (settings?.stripPath) url = url.replace(/\/.*$/, '');
	if (settings?.stripPort) url = url.replace(/:\d+$/, '');
	return url;
}
