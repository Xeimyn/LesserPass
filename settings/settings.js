document.addEventListener("DOMContentLoaded", async () => {
	const stripSubdomainElement = document.getElementById("stripSubdomain")
	const stripSubdomainLabelElement = document.getElementById("togSub")

	const stripPathElement = document.getElementById("stripPath")
	const stripPathLabelElement = document.getElementById("togPath")

	const stripProtocolElement = document.getElementById("stripProtocol")
	const stripProtocolLabelElement = document.getElementById("togProt")

	const stripPortElement = document.getElementById("stripPort")
	const stripPortLabelElement = document.getElementById("togPort")

	const defaultLoginElement = document.getElementById("login")
	const defaultLengthElement = document.getElementById("length")
	const minusButtonLength = document.getElementById("minusBL")
	const plusButtonLength  = document.getElementById("plusBL")
	const defaultIndexElement = document.getElementById("index")
	const minusButtonIndex = document.getElementById("minusBI")
	const plusButtonIndex  = document.getElementById("plusBI")
	const charsetElement = document.getElementById("charset")

	const copiedOverlayElement = document.getElementById("copiedOverlay")
	const copiedOverlayLabelElement = document.getElementById("togOverlay")
	const copiedOverlayMSDurationElement = document.getElementById("copiedOverlayDuration")

	const autoFocusElement = document.getElementById("autoFocus")

	const autoFillElement = document.getElementById("autoFill")
	const autoFillLabelElement = document.getElementById("togAuto")

	const iterationsElement = document.getElementById("iterations")
	const minusButtonIterations = document.getElementById("minusIter")
	const plusButtonIterations = document.getElementById("plusIter")

	const saveButton = document.getElementsByClassName("saveButton")[0]

	stripSubdomainLabelElement.addEventListener("click", () => {
		stripSubdomainElement.checked = !stripSubdomainElement.checked;
	});

	stripPathLabelElement.addEventListener("click", () => {
		stripPathElement.checked = !stripPathElement.checked;
	});

	stripProtocolLabelElement.addEventListener("click", () => {
		stripProtocolElement.checked = !stripProtocolElement.checked;
	});

	copiedOverlayLabelElement.addEventListener("click", () => {
		copiedOverlayElement.checked = !copiedOverlayElement.checked;
	});

	autoFillLabelElement.addEventListener("click", () => {
		autoFillElement.checked = !autoFillElement.checked;
	});

	stripPortLabelElement.addEventListener("click", () => {
		stripPortElement.checked = !stripPortElement.checked;
	});

	minusButtonLength.addEventListener("click",function() {
		if (defaultLengthElement.value >= 2) {
			defaultLengthElement.value -=1
		}
		if (defaultLengthElement.value == "") {
			defaultLengthElement.value = 1
		}
	})

	plusButtonLength.addEventListener("click",function() {
		defaultLengthElement.value = Number(defaultLengthElement.value) + 1
	})

	minusButtonIndex.addEventListener("click",function() {
		if (defaultIndexElement.value >= 2) {
			defaultIndexElement.value -= 1
		}
		if (defaultIndexElement.value == "") {
			defaultIndexElement.value = 1
		}
	})

	plusButtonIndex.addEventListener("click",function() {
		defaultIndexElement.value = Number(defaultIndexElement.value) + 1
	})

	minusButtonIterations.addEventListener("click",function() {
		if (iterationsElement.value >= 50000) {
			iterationsElement.value -= 50000
		}
		if (iterationsElement.value == "") {
			iterationsElement.value = 50000
		}
		if (iterationsElement.value < 300000) {
			document.getElementById("warningMessage").style.display = "block";
		} else {
			document.getElementById("warningMessage").style.display = "none";
		}
	})

	plusButtonIterations.addEventListener("click",function() {
		iterationsElement.value = Number(iterationsElement.value) + 50000
		if (iterationsElement.value < 300000) {
			document.getElementById("warningMessage").style.display = "block";
		} else {
			document.getElementById("warningMessage").style.display = "none";
		}
	})

	const defaultSettings = {
		urlFormatting: {
			stripSubdomain: true,
			stripPath: true,
			stripProtocol: true
		},
		defaultInputs: {
			defaultLogin: "",
			defaultLength: 16,
			defaultIndex: 1,
			charset: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!`\"§$\%&/(){[]}=?'#.,;:<>|_-",
			iterations: 1000000
		},
		uiSettings: {
			copiedOverlay: true,
			copiedOverlayDuration: 1250,
			autoFocus: "None"
		},
		experimentalSettings: {
			autoFill: false
		}
	};

	let settings = JSON.parse(localStorage.getItem("LesserPassSettings"));
	if (!settings) {
		settings = defaultSettings;
		localStorage.setItem("LesserPassSettings", JSON.stringify(settings));
	}

	stripSubdomainElement.checked = settings.urlFormatting.stripSubdomain;
	stripPathElement.checked = settings.urlFormatting.stripPath;
	stripProtocolElement.checked = settings.urlFormatting.stripProtocol;
	stripPortElement.checked = settings.urlFormatting.stripPort;
	defaultLoginElement.value = settings.defaultInputs.defaultLogin;
	defaultLengthElement.value = settings.defaultInputs.defaultLength;
	defaultIndexElement.value = settings.defaultInputs.defaultIndex;
	charsetElement.value = settings.defaultInputs.charset;
	iterationsElement.value = settings.defaultInputs.iterations;
	copiedOverlayElement.checked = settings.uiSettings.copiedOverlay;
	copiedOverlayMSDurationElement.value = settings.uiSettings.copiedOverlayDuration;
	autoFocusElement.value = settings.uiSettings.autoFocus;
	autoFillElement.checked = settings.experimentalSettings.autoFill;

	if (iterationsElement.value < 300000) {
		document.getElementById("warningMessage").style.display = "block";
	} else {
		document.getElementById("warningMessage").style.display = "none";
	}

	saveButton.addEventListener("click", () => {
		const updatedSettings = {
			urlFormatting: {
				stripSubdomain: stripSubdomainElement.checked,
				stripPath: stripPathElement.checked,
				stripProtocol: stripProtocolElement.checked,
				stripPort: stripPortElement.checked
			},
			defaultInputs: {
				defaultLogin: defaultLoginElement.value,
				defaultLength: Number(defaultLengthElement.value),
				defaultIndex: Number(defaultIndexElement.value),
				charset: charsetElement.value,
				iterations: Number(iterationsElement.value)
			},
			uiSettings: {
				copiedOverlay: copiedOverlayElement.checked,
				copiedOverlayDuration: Number(copiedOverlayMSDurationElement.value),
				autoFocus: autoFocusElement.value
			},
			experimentalSettings: {
				autoFill: autoFillElement.checked
			}
		};

		localStorage.setItem("LesserPassSettings", JSON.stringify(updatedSettings));
		alert("Settings saved!");
	});
});
