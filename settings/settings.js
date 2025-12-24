
document.addEventListener('DOMContentLoaded', async () => {
    DEFAULT_SETTINGS = {
        "urlFormatting":{
            "stripProtocol":true,
            "stripSubdomain":true,
            "stripPort":true,
            "stripPath":true
        },
        "defaultInputs":{
            "login":"",
            "charset":"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*?-_.+",
            "length":16,
            "index":1
        },
        "uiSettings":{
            "monochromePassMojis":true,
            "animateUI":true,
            "autoFocus":"masterPassword",
            "overlay":{
                "enabled":true,
                "duration":1250
            }
        },
        "security":{
            "staticSecret":""
        },
        "advanced":{
            "genLogin":{
                "enabled":false,
                "settings":{
                    "template":"",
                    "domain":""
                }
            },
            "debounceDelay":100
        }
    }

    document.getElementById("regenSecret")?.addEventListener("click", () => {
        const newSecret = crypto.randomUUID().replace(/-/g, '');
        document.getElementById("staticSecret").value = newSecret;
    })

    // Iterate over all inputs, textareas, selects and build/fill UI extras
    document.querySelectorAll('.settingsContainer input, .settingsContainer textarea, .settingsContainer select').forEach(el => {
        // Helper method to make it easier
        const labelText = el.getAttribute('aria-label');
        // Load settings from localstorage for filling in form
        const SETTINGS = JSON.parse(localStorage.getItem("LPSettings")) || DEFAULT_SETTINGS;

        // handle staticSecret stuff
        if (SETTINGS.security.staticSecret === undefined || SETTINGS.security.staticSecret == "") {
            SETTINGS.security.staticSecret = crypto.randomUUID().replace(/-/g, '');
        } else {
            // Overwrite local default settings to keep secret when resetting settings
            DEFAULT_SETTINGS.security.staticSecret = SETTINGS.security.staticSecret;
        }



        // --- Checkboxes
        if (el.type === 'checkbox') {
            if (labelText) {
                const label = document.createElement('h2');
                label.textContent = labelText;

                const wrapper = document.createElement('div');
                wrapper.className = 'flex-side-side';

                // checkbox first, label second
                el.parentNode.insertBefore(wrapper, el);
                wrapper.appendChild(el);
                wrapper.appendChild(label);
            }

            // Fill in value from settings
            const parents = [];
            let current = el;
            // Go up recursively
            while (current) {
               if (current.id) parents.push(...current.id.split(".").reverse());
                current = current.parentElement;
            }

            // Reverse since we went up and now we wanna go down into the settings
            const key = parents.reverse()
            value = SETTINGS
            key.forEach(k => {
                if (value) value = value[k];
            });

            // And finally set the value
            el.checked = value

        }
        // --- Number
       else if (el.type === 'number') {

            // Outer wrapper div that will contain the label and combo
            const wrapper = document.createElement('div');
            // wrapper.className = 'number-wrapper';

            // Insert wrapper BEFORE the input
            el.parentNode.insertBefore(wrapper, el);

            // Add label if exists
            if (labelText) {
                const label = document.createElement('h2');
                label.textContent = labelText;
                wrapper.appendChild(label);
            }

            // Inner combo div with buttons + input
            const combo = document.createElement('div');
            // combo.className = 'input-combo';
            combo.style.display = 'flex';
            combo.style.alignItems = 'center';
            // combo.style.gap = '4px';

            const minus = document.createElement('button');
            // minus.type = 'button';
            minus.textContent = '-';
            minus.classList.add("minus")
            minus.addEventListener('click', () => {
                if (el.value >= 2) {
                    el.value -= 1
                }
            });

            const plus = document.createElement('button');
            plus.type = 'button';
            plus.textContent = '+';
            plus.classList.add("plus")
            plus.addEventListener('click', () => {
                el.value = Number(el.value) + 1
            });

            // Move the input into the combo
            combo.appendChild(minus);
            combo.appendChild(el);
            combo.appendChild(plus);

            // Append combo to the wrapper
            wrapper.appendChild(combo);

             // Fill in value from settings
            const parents = [];
            let current = el;
            // Go up recursively
            while (current) {
               if (current.id) parents.push(...current.id.split(".").reverse());
                current = current.parentElement;
            }

            // Reverse since we went up and now we wanna go down into the settings
            const key = parents.reverse()
            value = SETTINGS
            key.forEach(k => {
                if (value) value = value[k];
            });

            el.value = Number(value)

        }
        // Fill in rest
        else if (el.type === 'text' || el.type === "password" || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            // Fill in value from settings
           const parents = [];
           let current = el;
           // Go up recursively
           while (current) {
               if (current.id) parents.push(...current.id.split(".").reverse());
               current = current.parentElement;
           }

           // Reverse since we went up and now we wanna go down into the settings
           const key = parents.reverse()
           value = SETTINGS
           key.forEach(k => {
               if (value) value = value[k];
           });

           el.value = value

           if (value === undefined) {
            console.log(el,key);
           }

        }

        // --- other
        else if (labelText) {
            const h2 = document.createElement('h2');
            h2.textContent = labelText;
            el.insertAdjacentElement('beforebegin', h2);
        }
    });

    // --- Save settings
    document.getElementById('save').addEventListener('click', () => {
        const settingsContainer = document.querySelector('.settingsContainer');

        function buildJSON(element) {
            const SETTINGS = {};

            element.childNodes.forEach(child => {
                if (child.nodeType !== Node.ELEMENT_NODE) return;

                if (child.tagName === 'SECTION') {
                    const sectionId = child.id || child.getAttribute('sectionTitle') || 'unknown';
                    SETTINGS[sectionId] = buildJSON(child);
                } else if (child.tagName === 'DIV') {
                    // Recurse inside wrapper divs
                    const inner = buildJSON(child);
                    mergeObjects(SETTINGS, inner);
                } else if (child.tagName === 'INPUT' || child.tagName === 'TEXTAREA' || child.tagName === 'SELECT') {
                    let key = child.id || child.name || 'unknown';
                    let value;

                    if (child.type === 'checkbox') value = child.checked;
                    else if (child.type === 'number') value = child.value ? Number(child.value) : 0;
                    else value = child.value;

                    // Split on '.' to create nested objects
                    const parts = key.split('.');
                    let target = SETTINGS;
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        if (i === parts.length - 1) {
                            target[part] = value;
                        } else {
                            if (!target[part]) target[part] = {};
                            target = target[part];
                        }
                    }
                }
            });
            return SETTINGS;
        }

        const output = buildJSON(settingsContainer);
        localStorage.setItem("LPSettings",JSON.stringify(output))
        alert("Settings saved!")
    });

    document.getElementById("reset").addEventListener("click", () => {
        localStorage.setItem("LPSettings", JSON.stringify(DEFAULT_SETTINGS));
        window.location.reload();
    })

    // // remove "hide" class from incognito banner if the extension cant access incognito windows
    const canAccessIncognito = await chrome.extension.isAllowedIncognitoAccess()
    const incognitoBanner = document.getElementById("incognitoBanner")

    if (!canAccessIncognito) {
        incognitoBanner.style.display = "flex";
    }

});


function mergeObjects(target, source) {
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            mergeObjects(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
}
