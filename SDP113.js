// ============================================
// NEURALSCAN — GROQ AI ENGINE
// ============================================
const GROQ_BASE    = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL   = "llama-3.3-70b-versatile";

// ============================================
// API KEY (HIDDEN MODE - DEMO USE)
// ============================================

// Split keys into parts (basic obfuscation)
const _k1 = ["gsk_", "z6I8eXJmodrqn8ejuyaN", "WGdyb3FY4RQHW5lh7QXq5KigPNG24qwb"];
const _k2 = ["gsk_", "hPbGEFHZNbJhQBoP9NXL", "WGdyb3FYk7VwiPveeYFa179B3cBbbUBc"];
const _k3 = ["gsk_", "Q3ixNvctyf9CKym9fw41", "WGdyb3FYXPQAGz3FYDILhIKGxin6ngkD"];
const _k4 = ["gsk_", "bhzGKjyCB1UT3c7XSQFI", "WGdyb3FYE8QtDsQe0G4VZmVZiR3pKd5o"];

// Join them
const API_IMAGE = _k1.join("");
const API_VIDEO = _k2.join("");
const API_SURV  = _k3.join("");
const API_DOC   = _k4.join("");

// All keys
const ALL_KEYS  = [API_IMAGE, API_VIDEO, API_SURV, API_DOC];

// ============================================
// LANGUAGES
// ============================================
const languages = {
    hi:{name:"Hindi",     flag:"🇮🇳",native:"हिंदी"},
    te:{name:"Telugu",    flag:"🇮🇳",native:"తెలుగు"},
    ta:{name:"Tamil",     flag:"🇮🇳",native:"தமிழ்"},
    bn:{name:"Bengali",   flag:"🇮🇳",native:"বাংলা"},
    mr:{name:"Marathi",   flag:"🇮🇳",native:"मराठी"},
    gu:{name:"Gujarati",  flag:"🇮🇳",native:"ગુજરાતી"},
    kn:{name:"Kannada",   flag:"🇮🇳",native:"ಕನ್ನಡ"},
    ml:{name:"Malayalam", flag:"🇮🇳",native:"മലയാളം"},
    pa:{name:"Punjabi",   flag:"🇮🇳",native:"ਪੰਜਾਬੀ"},
    or:{name:"Odia",      flag:"🇮🇳",native:"ଓଡ଼ିଆ"},
    as:{name:"Assamese",  flag:"🇮🇳",native:"অসমীয়া"},
    ks:{name:"Kashmiri",  flag:"🇮🇳",native:"कॉशुर"},
    ur:{name:"Urdu",      flag:"🇮🇳",native:"اردو"},
    es:{name:"Spanish",   flag:"🇪🇸",native:"Español"},
    fr:{name:"French",    flag:"🇫🇷",native:"Français"},
    de:{name:"German",    flag:"🇩🇪",native:"Deutsch"},
    zh:{name:"Chinese",   flag:"🇨🇳",native:"中文"},
    ja:{name:"Japanese",  flag:"🇯🇵",native:"日本語"},
    ko:{name:"Korean",    flag:"🇰🇷",native:"한국어"},
    ar:{name:"Arabic",    flag:"🇸🇦",native:"العربية"},
    ru:{name:"Russian",   flag:"🇷🇺",native:"Русский"},
    pt:{name:"Portuguese",flag:"🇵🇹",native:"Português"},
    it:{name:"Italian",   flag:"🇮🇹",native:"Italiano"},
    nl:{name:"Dutch",     flag:"🇳🇱",native:"Nederlands"},
    tr:{name:"Turkish",   flag:"🇹🇷",native:"Türkçe"},
    pl:{name:"Polish",    flag:"🇵🇱",native:"Polski"},
    vi:{name:"Vietnamese",flag:"🇻🇳",native:"Tiếng Việt"},
    th:{name:"Thai",      flag:"🇹🇭",native:"ไทย"},
    id:{name:"Indonesian",flag:"🇮🇩",native:"Bahasa Indonesia"},
    ms:{name:"Malay",     flag:"🇲🇾",native:"Bahasa Melayu"},
    fa:{name:"Persian",   flag:"🇮🇷",native:"فارسی"},
    he:{name:"Hebrew",    flag:"🇮🇱",native:"עברית"},
    sw:{name:"Swahili",   flag:"🇰🇪",native:"Kiswahili"}
};

// ============================================
// STATE
// ============================================
let selectedLang      = "hi";
let uploadedImage     = null;
let uploadedImageMime = "image/jpeg";
let uploadedDoc       = null;
let uploadedSurv      = null;
let survFrame         = null;   // cached base64 frame for Q&A
let survChatHistory   = [];     // Q&A conversation history
let cdTimer           = null;
let retryFn           = null;
let cancelled         = false;
let retryCount        = 0;
const RETRY_WAITS     = [20, 40];

// ============================================
// INIT LANGUAGE GRID
// ============================================
function initLanguages() {
    const grid = document.getElementById("languageGrid");
    if (!grid) return;
    grid.innerHTML = "";
    Object.keys(languages).forEach(function(code) {
        var lang = languages[code];
        var btn  = document.createElement("button");
        btn.className    = "lang-btn" + (code === "hi" ? " active" : "");
        btn.dataset.code = code;
        btn.innerHTML    = "<span class='lflag'>" + lang.flag + "</span><span>" + lang.name + "</span>";
        btn.onclick      = function() { selectLang(code); };
        grid.appendChild(btn);
    });
}

function selectLang(code) {
    selectedLang = code;
    document.querySelectorAll(".lang-btn").forEach(function(b) {
        b.classList.toggle("active", b.dataset.code === code);
    });
    var badge = document.getElementById("selectedLangBadge");
    if (badge) badge.textContent = languages[code].native;
}

function filterLangs(q) {
    q = q.toLowerCase();
    document.querySelectorAll(".lang-btn").forEach(function(b) {
        var lang = languages[b.dataset.code];
        var show = !q || lang.name.toLowerCase().includes(q) || lang.native.toLowerCase().includes(q);
        b.style.display = show ? "" : "none";
    });
}

// ============================================
// TABS
// ============================================
function switchTab(tab, btn) {
    document.querySelectorAll(".tab-btn").forEach(function(b){ b.classList.remove("active"); });
    btn.classList.add("active");
    ["image","video","surveillance","document"].forEach(function(t) {
        var el = document.getElementById(t + "Tab");
        if (el) el.style.display = (t === tab) ? "block" : "none";
    });
    clearAll();
}

// ============================================
// DRAG & DROP
// ============================================
function onDragOver(e)      { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }
function onDragLeave(e, id) { var el = document.getElementById(id); if(el) el.classList.remove("drag-over"); }
function onDrop(e, type)    {
    e.preventDefault(); e.currentTarget.classList.remove("drag-over");
    var f = e.dataTransfer.files[0];
    if (!f) return;
    if (type === "image") loadImage(f);
    else if (type === "surv") loadSurv(f);
    else if (type === "doc")  loadDoc(f);
}

// ============================================
// IMAGE
// ============================================
function onImagePick(e)  { if (e.target.files[0]) loadImage(e.target.files[0]); }
function loadImage(file) {
    uploadedImageMime = file.type || "image/jpeg";
    var r = new FileReader();
    r.onload = function(ev) {
        uploadedImage = ev.target.result.split(",")[1];
        document.getElementById("uploadArea").innerHTML =
            "<div class='file-preview-wrap'>" +
            "<img src='" + ev.target.result + "' class='img-preview'>" +
            "<button class='remove-btn-small' onclick='clearImage()'>✕</button></div>";
        document.getElementById("analyzeImageBtn").disabled = false;
    };
    r.readAsDataURL(file);
}
function clearImage() {
    uploadedImage = null;
    document.getElementById("uploadArea").innerHTML = dzHTML("🖼","Drop image here","PNG · JPG · WEBP","image/*","onImagePick");
    document.getElementById("analyzeImageBtn").disabled = true;
}

// ============================================
// SURVEILLANCE
// ============================================
function onSurvPick(e) { if (e.target.files[0]) loadSurv(e.target.files[0]); }
function loadSurv(file) {
    uploadedSurv = file;
    survFrame    = null;   // reset cached frame for new video
    clearSurvChat();
    document.getElementById("survUploadArea").innerHTML =
        chipHTML("📹", file.name, (file.size/1024/1024).toFixed(1)+" MB", "clearSurv()");
    document.getElementById("analyzeSurvBtn").disabled = false;
    var askBtn = document.getElementById("askSurvBtn");
    if (askBtn) askBtn.disabled = true;
}
function clearSurv() {
    uploadedSurv = null;
    survFrame    = null;
    clearSurvChat();
    document.getElementById("survUploadArea").innerHTML = dzHTML("📹","Drop surveillance video","MP4 · AVI · MOV","video/*","onSurvPick");
    document.getElementById("analyzeSurvBtn").disabled = true;
    var askBtn = document.getElementById("askSurvBtn");
    if (askBtn) askBtn.disabled = true;
    var qEl = document.getElementById("survQuestion");
    if (qEl) qEl.value = "";
}

// ============================================
// DOCUMENT
// ============================================
function onDocPick(e) { if (e.target.files[0]) loadDoc(e.target.files[0]); }
function loadDoc(file) {
    uploadedDoc = file;
    var ext = file.name.split(".").pop().toUpperCase();
    document.getElementById("docUploadArea").innerHTML =
        chipHTML(ext==="PDF"?"📕":"📘", file.name, (file.size/1024/1024).toFixed(1)+" MB · "+ext, "clearDoc()");
    document.getElementById("analyzeDocBtn").disabled = false;
}
function clearDoc() {
    uploadedDoc = null;
    document.getElementById("docUploadArea").innerHTML = dzHTML("📄","Drop document here","PDF · DOC · DOCX",".pdf,.doc,.docx","onDocPick");
    document.getElementById("analyzeDocBtn").disabled = true;
}

// ============================================
// VIDEO INPUT
// ============================================
function onVideoInput() {
    var val = document.getElementById("videoInput").value.trim();
    document.getElementById("analyzeVideoBtn").disabled = !val;
    var info = document.getElementById("videoUrlInfo");
    if (!val) { info.innerHTML = ""; return; }
    var p = getPlatform(val);
    info.innerHTML = p
        ? "<span style='color:#00ffc8'>✅ " + p + " detected</span>"
        : "<span style='color:#ffb347'>⚠ Custom URL</span>";
}
function getPlatform(url) {
    var map = {"youtube.com":"YouTube","youtu.be":"YouTube","instagram.com":"Instagram",
               "tiktok.com":"TikTok","vimeo.com":"Vimeo","twitter.com":"Twitter","x.com":"Twitter",
               "facebook.com":"Facebook","twitch.tv":"Twitch"};
    for (var d in map) { if (url.includes(d)) return map[d]; }
    return null;
}

// ============================================
// UTILITIES
// ============================================
function dzHTML(icon, title, sub, accept, fn) {
    return "<div class='dz-icon'>" + icon + "</div>" +
           "<div class='dz-title'>" + title + "</div>" +
           "<div class='dz-sub'>" + sub + "</div>" +
           "<label class='choose-btn'>Browse File<input type='file' class='file-input' accept='" + accept + "' onchange='" + fn + "(event)'></label>" +
           "<div class='dz-scanline'></div>";
}
function chipHTML(icon, name, meta, removeFn) {
    return "<div class='file-chip'>" +
           "<span class='file-chip-icon'>" + icon + "</span>" +
           "<div class='file-chip-info'><div class='file-chip-name'>" + name + "</div>" +
           "<div class='file-chip-meta'>" + meta + "</div></div>" +
           "<button class='remove-btn-small' onclick='" + removeFn + "'>✕</button></div>";
}

function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

function grabVideoFrame(file) {
    return new Promise(function(resolve, reject) {
        var video  = document.createElement("video");
        var canvas = document.createElement("canvas");
        var url    = URL.createObjectURL(file);
        video.src = url; video.muted = true; video.playsInline = true;
        video.addEventListener("loadedmetadata", function() {
            video.currentTime = Math.min(3, video.duration * 0.1);
        });
        video.addEventListener("seeked", function() {
            canvas.width  = Math.min(video.videoWidth  || 640, 640);
            canvas.height = Math.min(video.videoHeight || 360, 360);
            canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
        });
        video.addEventListener("error", function() { URL.revokeObjectURL(url); reject(new Error("Video load failed")); });
        setTimeout(function() { URL.revokeObjectURL(url); reject(new Error("Timeout")); }, 8000);
    });
}

async function readPdf(file) {
    if (typeof pdfjsLib === "undefined") return "";
    try {
        var pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        var max = Math.min(pdf.numPages, 10);
        var all = [];
        for (var i = 1; i <= max; i++) {
            var page = await pdf.getPage(i);
            var tc   = await page.getTextContent();
            all.push(tc.items.map(function(s){ return s.str; }).join(" "));
        }
        return all.join("\n").trim().substring(0, 8000);
    } catch(e) { return ""; }
}

async function readDocx(file) {
    if (typeof mammoth === "undefined") return "";
    try {
        var result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        return result.value.trim().substring(0, 8000);
    } catch(e) { return ""; }
}

function isRateErr(msg) {
    var m = (msg || "").toLowerCase();
    return m.includes("rate_limit") || m.includes("429") ||
           m.includes("too many")   || m.includes("quota") || m.includes("exceeded");
}

// ============================================
// JSON PARSER — robust
// ============================================
function parseResponse(raw) {
    if (!raw || raw.trim().length === 0) return null;
    var text = raw.trim();
    try { var r = JSON.parse(text); if (r && r.english) return r; } catch(e){}
    try {
        var s = text.replace(/^```json\s*/i,"").replace(/^```\s*/,"").replace(/```\s*$/,"").trim();
        var r = JSON.parse(s); if (r && r.english) return r;
    } catch(e){}
    var depth=0, start=-1;
    for (var i=0; i<text.length; i++) {
        if (text[i]==="{") { if(!depth) start=i; depth++; }
        else if (text[i]==="}") {
            if (--depth === 0 && start !== -1) {
                try { var r=JSON.parse(text.substring(start,i+1)); if(r&&r.english) return r; } catch(e){}
            }
        }
    }
    var em = text.match(/"english"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    var tm = text.match(/"translated"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (em) return { english: em[1], translated: tm ? tm[1] : "" };
    if (text.length > 40) return { english: text.substring(0,1500), translated: "" };
    return null;
}

// ============================================
// TWO-STEP: ANALYZE then TRANSLATE SEPARATELY
// This is the most reliable way to get translation
// ============================================

async function callGroqRaw(messages, preferredKey, vision, extraTokens) {
    if (cancelled) throw new Error("CANCELLED");
    var model    = vision ? VISION_MODEL : TEXT_MODEL;
    var maxTok   = extraTokens || 1800;
    var keyOrder = [preferredKey].concat(ALL_KEYS.filter(function(k){ return k !== preferredKey; }));

    for (var ki = 0; ki < keyOrder.length; ki++) {
        if (cancelled) throw new Error("CANCELLED");
        var key = keyOrder[ki];
        setStatus("Calling Groq AI" + (ki > 0 ? " (key " + (ki+1) + ")" : "") + "...");
        try {
            var payload = {
                model: model,
                messages: messages,
                max_tokens: maxTok,
                temperature: 0.3
            };
            var res = await fetch(GROQ_BASE, {
                method: "POST",
                headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                var errData = await res.json().catch(function(){ return {}; });
                var errMsg  = (errData.error && errData.error.message) ? errData.error.message : ("HTTP " + res.status);
                if (isRateErr(errMsg)) { setStatus("Rate limited, trying next key..."); await sleep(800); continue; }
                throw new Error(errMsg);
            }
            var data = await res.json();
            var raw  = (data.choices && data.choices[0] && data.choices[0].message)
                        ? data.choices[0].message.content : "";
            if (!raw || raw.trim().length === 0) throw new Error("Empty response from AI.");
            return raw.trim();
        } catch(e) {
            if (e.message === "CANCELLED") throw e;
            if (isRateErr(e.message)) { setStatus("Rate limited, trying next key..."); await sleep(800); continue; }
            throw e;
        }
    }
    throw new Error("RATE_LIMITED");
}

// Step 1: Get English analysis
async function getEnglishAnalysis(userMessages, preferredKey, vision) {
    var sysPrompt = 'You are an expert AI analyst. Produce a thorough, detailed structured analysis report in English.\n' +
                    'Use section headings formatted as: ### Emoji Title\n' +
                    'Write detailed paragraphs under each heading. Use bullet points starting with - for lists.\n' +
                    'ALWAYS end your report with exactly these three sections:\n' +
                    '  ### Key Highlights  (5-7 bullet points)\n' +
                    '  ### Sentiment and Tone  (detailed paragraph)\n' +
                    '  ### Conclusion  (strong closing paragraph)\n' +
                    'Output ONLY the plain analysis text. No JSON. No markdown fences.';
    var msgs = [{ role: "system", content: sysPrompt }].concat(userMessages);
    return await callGroqRaw(msgs, preferredKey, vision, 1800);
}

// ============================================
// ============================================
// PARSE English into sections: [{heading, body}]
// heading = full "### Title" line (or "" if none)
// body    = all content lines joined
// ============================================
function parseSections(text) {
    var lines    = text.split(/\n/);
    var sections = [];
    var cur      = null;

    lines.forEach(function(line) {
        if (line.trim().startsWith("###")) {
            if (cur) sections.push(cur);
            cur = { heading: line.trim(), body: [] };
        } else {
            if (!cur) cur = { heading: "", body: [] };
            cur.body.push(line);
        }
    });
    if (cur) sections.push(cur);
    return sections;
}

// ============================================
// Single-section translator — pure text in, pure text out
// JS code always re-injects ### so the AI cannot drop it
// ============================================
async function translateChunk(text, langName, keyOrder) {
    if (!text || !text.trim()) return text;

    var sysPrompt = 'You are a professional translator. Translate the following text into ' + langName + '.\n' +
                    'Rules:\n' +
                    '- Translate every word accurately into ' + langName + '\n' +
                    '- Lines starting with "- " must stay as "- " followed by the translated text\n' +
                    '- Keep all emoji characters exactly as they are\n' +
                    '- Output ONLY the translated text with no explanation or extra words';

    var msgs = [
        { role: "system", content: sysPrompt },
        { role: "user",   content: text }
    ];

    for (var ki = 0; ki < keyOrder.length; ki++) {
        if (cancelled) throw new Error("CANCELLED");
        try {
            var res = await fetch(GROQ_BASE, {
                method: "POST",
                headers: { "Authorization": "Bearer " + keyOrder[ki], "Content-Type": "application/json" },
                body: JSON.stringify({ model: TEXT_MODEL, messages: msgs, max_tokens: 900, temperature: 0.1 })
            });
            if (!res.ok) {
                var ed  = await res.json().catch(function(){ return {}; });
                var em  = (ed.error && ed.error.message) ? ed.error.message : ("HTTP " + res.status);
                if (isRateErr(em)) { await sleep(800); continue; }
                return text; // non-rate error → return original
            }
            var data = await res.json();
            var out  = (data.choices && data.choices[0] && data.choices[0].message)
                        ? data.choices[0].message.content.trim() : "";
            if (out.length > 2) return out;
        } catch(e) {
            if (e.message === "CANCELLED") throw e;
            if (isRateErr(e.message)) { await sleep(800); continue; }
            return text;
        }
    }
    return text; // all keys failed → original
}

// ============================================
// TRANSLATE — section-by-section
// ### markers are injected by JS, never by AI
// ============================================
async function translateText(englishText, langName, preferredKey) {
    if (cancelled) throw new Error("CANCELLED");
    var sections  = parseSections(englishText);
    var keyOrder  = [preferredKey].concat(ALL_KEYS.filter(function(k){ return k !== preferredKey; }));
    var output    = [];
    var total     = sections.length;

    for (var i = 0; i < total; i++) {
        if (cancelled) throw new Error("CANCELLED");
        var sec = sections[i];
        setStatus("Translating to " + langName + "... (" + (i + 1) + "/" + total + ")");

        // --- Translate heading title (strip ###, translate, re-add ###) ---
        var translatedHeading = "";
        if (sec.heading) {
            var titleText        = sec.heading.replace(/^###\s*/, "").trim();
            var translatedTitle  = await translateChunk(titleText, langName, keyOrder);
            // Ensure ### prefix is always present — JS adds it, not AI
            translatedHeading    = "### " + (translatedTitle || titleText);
        }

        // --- Translate body ---
        var bodyText        = sec.body.join("\n").trim();
        var translatedBody  = bodyText ? await translateChunk(bodyText, langName, keyOrder) : "";

        if (translatedHeading) output.push(translatedHeading);
        if (translatedBody)    output.push(translatedBody);
        output.push(""); // blank line between sections
    }

    return output.join("\n").trim();
}

// ============================================
// MAIN ORCHESTRATOR
// ============================================
async function analyzeAndTranslate(userMessages, preferredKey, vision, langName) {
    setStatus("Generating analysis...");
    var english = await getEnglishAnalysis(userMessages, preferredKey, vision);

    var translated = english; // default = English (when lang is English)
    if (langName && langName.toLowerCase() !== "english") {
        translated = await translateText(english, langName, preferredKey);
    }

    return { english: english, translated: translated };
}


// ============================================
// RICH ANALYSIS PROMPTS (plain text — no JSON needed)
// ============================================
function makeImagePrompt(lang) {
    return 'Perform a comprehensive expert-level visual analysis of this image.\n' +
           'Write a detailed structured report with these sections:\n\n' +
           '### Overview\n' +
           'Describe the overall scene, context, and purpose of the image in detail.\n\n' +
           '### Scene and Environment\n' +
           'Describe the setting, location type, time of day, lighting conditions, and spatial composition.\n\n' +
           '### Objects and Elements\n' +
           'List and describe every significant object, element, and subject present.\n\n' +
           '### People and Subjects\n' +
           'Describe people present — appearance, expressions, posture, clothing, activity. If no people, describe the main subjects.\n\n' +
           '### Visual Style and Colors\n' +
           'Analyze the color palette, contrast, saturation, artistic style, and photographic techniques.\n\n' +
           '### Text and Symbols\n' +
           'Identify and transcribe any visible text, logos, signs, watermarks, or branding.\n\n' +
           '### Key Highlights\n' +
           '- List the 5-7 most notable observations as bullet points\n\n' +
           '### Sentiment and Tone\n' +
           'Describe the emotional mood, atmosphere, and tone this image evokes.\n\n' +
           '### Conclusion\n' +
           'Summarize the overall message, intent, or story this image communicates.';
}

function makeVideoPrompt(desc, lang) {
    return 'Perform a comprehensive expert-level analysis of this video.\n' +
           'Video info: ' + desc + '\n\n' +
           'Write a detailed structured report with these sections:\n\n' +
           '### Topic and Overview\n' +
           'What is this video about? Provide full context, background, and purpose.\n\n' +
           '### Content Breakdown\n' +
           'Describe the content in detail — what happens, what is shown or discussed, key moments, and flow.\n\n' +
           '### Target Audience and Purpose\n' +
           'Who is this made for? What is its intent — educational, entertainment, marketing, news?\n\n' +
           '### Style and Presentation\n' +
           'Describe production style, visual and audio quality, editing, pacing, and presentation.\n\n' +
           '### Key Points\n' +
           'Extract the most important messages, facts, claims, or takeaways.\n\n' +
           '### Key Highlights\n' +
           '- List the 5-7 most notable aspects as bullet points\n\n' +
           '### Overall Assessment\n' +
           'Evaluate quality, effectiveness, credibility, and impact.\n\n' +
           '### Sentiment and Tone\n' +
           'What is the overall tone — serious, humorous, urgent, inspirational? Describe the emotional register.\n\n' +
           '### Conclusion\n' +
           'Final verdict — what is the overall value and takeaway of this video?';
}

function makeSurvPrompt(fileInfo, lang) {
    return 'You are a professional security analyst. Analyze this surveillance footage: ' + fileInfo + '\n\n' +
           'Write a comprehensive security intelligence report with these sections:\n\n' +
           '### Scene Overview\n' +
           'Describe the location, area type, surveillance context, and time indicators.\n\n' +
           '### Environment Assessment\n' +
           'Analyze the physical layout, visibility, lighting, entry and exit points, security infrastructure visible.\n\n' +
           '### Personnel and Activity\n' +
           'Identify all individuals present — count, positions, movements, behaviors, notable actions.\n\n' +
           '### Objects and Assets\n' +
           'Identify significant objects, vehicles, equipment, or assets visible.\n\n' +
           '### Threats and Anomalies\n' +
           'Identify suspicious behavior, security risks, access violations, unusual patterns, or potential threats.\n\n' +
           '### Key Highlights\n' +
           '- List the 5-7 most critical security observations as bullet points\n\n' +
           '### Recommendations\n' +
           'Provide actionable security recommendations based on the analysis.\n\n' +
           '### Sentiment and Tone\n' +
           'Describe the situational tone — calm, tense, routine, high-risk — and behavioral patterns observed.\n\n' +
           '### Conclusion\n' +
           'Final security assessment with overall risk level and summary verdict.';
}

function makeDocPrompt(content, fileName, lang) {
    var hasContent = content && content.length > 80;
    return 'You are an expert document analyst. Perform a comprehensive in-depth analysis.\n\n' +
           (hasContent
               ? 'Document content:\n\n' + content + '\n\n'
               : 'Document file: "' + fileName + '" — analyze based on filename and file type.\n\n') +
           'Write a detailed structured report. Scale depth to richness and length of content:\n\n' +
           '### Purpose and Overview\n' +
           'What is this document? Its purpose, context, and intended use.\n\n' +
           '### Structure and Organization\n' +
           'Describe the document structure, sections, formatting, and how it is organized.\n\n' +
           '### Content Analysis\n' +
           'Thorough analysis of all main topics, arguments, and information. Write as many paragraphs as needed.\n\n' +
           '### Key Findings and Data\n' +
           'Most important facts, figures, claims, data points, and conclusions.\n\n' +
           '### Target Audience\n' +
           'Who is this written for? What expertise level is assumed?\n\n' +
           '### Background and Context\n' +
           'Relevant context or background that helps understand this document.\n\n' +
           '### Key Highlights\n' +
           '- List the 5-7 most important takeaways as bullet points\n\n' +
           '### Sentiment and Tone\n' +
           'Writing tone — formal or informal, objective or persuasive, technical or accessible — and overall sentiment.\n\n' +
           '### Conclusion\n' +
           'Comprehensive final assessment of quality, completeness, and overall value.';
}


function setStatus(t) {
    var el = document.querySelector("#loadingState .loading-sub");
    if (el) el.textContent = t;
}

// ============================================
// ANALYZE IMAGE
// ============================================
async function analyzeImage() {
    if (!uploadedImage) return;
    cancelled = false;
    var btn = document.getElementById("analyzeImageBtn");
    showLoading("Analyzing image with Groq Vision...");
    btnBusy(btn, true);
    try {
        var lang = languages[selectedLang] ? languages[selectedLang].name : "Hindi";
        var msgs = [{
            role: "user",
            content: [
                { type:"image_url", image_url:{ url:"data:" + uploadedImageMime + ";base64," + uploadedImage } },
                { type:"text", text: makeImagePrompt(lang) }
            ]
        }];
        var result = await analyzeAndTranslate(msgs, API_IMAGE, true, lang);
        showResults(result.english, result.translated);
    } catch(e) {
        if (e.message === "RATE_LIMITED") startCountdown(analyzeImage);
        else if (e.message !== "CANCELLED") showError(e.message);
    }
    btnBusy(btn, false);
}

// ============================================
// ANALYZE VIDEO
// ============================================
async function analyzeVideo() {
    var url = document.getElementById("videoInput").value.trim();
    if (!url) return;
    cancelled = false;
    var btn      = document.getElementById("analyzeVideoBtn");
    var platform = getPlatform(url) || "video";
    showLoading("Fetching video info...");
    btnBusy(btn, true);
    try {
        var lang  = languages[selectedLang] ? languages[selectedLang].name : "Hindi";
        var extra = "";
        if (platform === "YouTube") {
            try {
                var oRes = await fetch("https://www.youtube.com/oembed?url=" + encodeURIComponent(url) + "&format=json");
                if (oRes.ok) {
                    var oData = await oRes.json();
                    extra = "\nTitle: " + oData.title + "\nChannel: " + oData.author_name;
                }
            } catch(e2) {}
        }
        setStatus("Generating deep analysis with Groq AI...");
        var desc = "Platform: " + platform + "\nURL: " + url + extra;
        var msgs = [{ role:"user", content: makeVideoPrompt(desc, lang) }];
        var result = await analyzeAndTranslate(msgs, API_VIDEO, false, lang);
        showResults(result.english, result.translated);
    } catch(e) {
        if (e.message === "RATE_LIMITED") startCountdown(analyzeVideo);
        else if (e.message !== "CANCELLED") showError(e.message);
    }
    btnBusy(btn, false);
}

// ============================================
// ANALYZE SURVEILLANCE
// ============================================
async function analyzeSurv() {
    if (!uploadedSurv) return;
    cancelled = false;
    var btn = document.getElementById("analyzeSurvBtn");
    showLoading("Extracting frame from video...");
    btnBusy(btn, true);
    try {
        var lang = languages[selectedLang] ? languages[selectedLang].name : "Hindi";
        try {
            setStatus("Capturing video frame...");
            var frame = await grabVideoFrame(uploadedSurv);
            setStatus("Running security analysis with Groq Vision...");
            var msgs = [{
                role:"user",
                content:[
                    { type:"image_url", image_url:{ url:"data:image/jpeg;base64,"+frame } },
                    { type:"text", text: makeSurvPrompt(uploadedSurv.name, lang) }
                ]
            }];
            var result = await analyzeAndTranslate(msgs, API_SURV, true, lang);
            showResults(result.english, result.translated);
        } catch(frameErr) {
            setStatus("Frame capture failed, running metadata analysis...");
            var sizeMB = (uploadedSurv.size/1024/1024).toFixed(1);
            var info   = uploadedSurv.name + " (" + sizeMB + " MB, " + (uploadedSurv.type||"video") + ")";
            var msgs2  = [{ role:"user", content: makeSurvPrompt(info, lang) }];
            var result = await analyzeAndTranslate(msgs2, API_SURV, false, lang);
            showResults(result.english, result.translated);
        }
    } catch(e) {
        if (e.message === "RATE_LIMITED") startCountdown(analyzeSurv);
        else if (e.message !== "CANCELLED") showError(e.message);
    }
    btnBusy(btn, false);
}

// ============================================
// SURVEILLANCE Q&A — ask questions about the footage
// ============================================
function onSurvQuestionInput() {
    var q   = (document.getElementById("survQuestion") || {}).value || "";
    var btn = document.getElementById("askSurvBtn");
    if (btn) btn.disabled = (!q.trim() || !uploadedSurv);
}

async function askSurv() {
    var questionEl = document.getElementById("survQuestion");
    var question   = questionEl ? questionEl.value.trim() : "";
    if (!question || !uploadedSurv) return;

    cancelled = false;
    var btn  = document.getElementById("askSurvBtn");
    var lang = languages[selectedLang] ? languages[selectedLang].name : "Hindi";

    // Append user message to chat UI
    appendChatMsg("user", question);
    questionEl.value = "";
    if (btn) btn.disabled = true;

    // Show thinking indicator
    var thinkId = appendChatMsg("ai", "...", true);

    try {
        // Grab frame if not already cached
        if (!survFrame) {
            updateChatMsg(thinkId, "Extracting video frame...");
            try {
                survFrame = await grabVideoFrame(uploadedSurv);
            } catch(e) {
                survFrame = null;
            }
        }

        // Build conversation history for context
        survChatHistory.push({ role: "user", content: question });

        var sysPrompt = 'You are an expert AI security analyst with access to surveillance footage from "' + uploadedSurv.name + '".\n' +
                        'Answer questions about the video content accurately and in detail.\n' +
                        'Base your answers on what is visible in the footage frame provided.\n' +
                        'Keep answers clear, professional, and focused on the question asked.\n' +
                        'Always answer in English only, regardless of the language of the question.';

        var msgs = [{ role: "system", content: sysPrompt }];

        // Add chat history for context (last 6 messages max)
        var historySlice = survChatHistory.slice(-6);

        if (survFrame) {
            // Vision: inject frame with the first user message
            var firstUserIdx = historySlice.findIndex(function(m){ return m.role === "user"; });
            historySlice.forEach(function(m, idx) {
                if (idx === firstUserIdx) {
                    msgs.push({
                        role: "user",
                        content: [
                            { type: "image_url", image_url: { url: "data:image/jpeg;base64," + survFrame } },
                            { type: "text", text: m.content }
                        ]
                    });
                } else {
                    msgs.push(m);
                }
            });
        } else {
            // No frame — text only with file metadata
            var meta = uploadedSurv.name + " (" + (uploadedSurv.size/1024/1024).toFixed(1) + " MB)";
            msgs.push({
                role: "user",
                content: "Context: Surveillance video file — " + meta + "\n\nQuestion: " + question
            });
        }

        var keyOrder = [API_SURV].concat(ALL_KEYS.filter(function(k){ return k !== API_SURV; }));
        var answer = "";

        for (var ki = 0; ki < keyOrder.length; ki++) {
            if (cancelled) throw new Error("CANCELLED");
            var key = keyOrder[ki];
            try {
                var payload = {
                    model: survFrame ? VISION_MODEL : TEXT_MODEL,
                    messages: msgs,
                    max_tokens: 1000,
                    temperature: 0.3
                };
                var res = await fetch(GROQ_BASE, {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    var errData = await res.json().catch(function(){ return {}; });
                    var errMsg  = (errData.error && errData.error.message) ? errData.error.message : ("HTTP " + res.status);
                    if (isRateErr(errMsg)) { await sleep(800); continue; }
                    throw new Error(errMsg);
                }
                var data = await res.json();
                answer = (data.choices && data.choices[0] && data.choices[0].message)
                          ? data.choices[0].message.content.trim() : "";
                if (answer) break;
            } catch(e) {
                if (e.message === "CANCELLED") throw e;
                if (isRateErr(e.message)) { await sleep(800); continue; }
                throw e;
            }
        }

        if (!answer) throw new Error("No answer received. Please try again.");

        // Store AI reply in history
        survChatHistory.push({ role: "assistant", content: answer });
        updateChatMsg(thinkId, answer, false);

    } catch(e) {
        var errTxt = e.message === "CANCELLED" ? "Cancelled." : ("Error: " + e.message);
        updateChatMsg(thinkId, errTxt, false, true);
        if (e.message !== "CANCELLED") {
            // Remove failed message from history
            survChatHistory.pop();
        }
    }

    if (btn) btn.disabled = false;
    if (questionEl) questionEl.focus();
}

function appendChatMsg(role, text, thinking) {
    var box = document.getElementById("survChatBox");
    if (!box) return null;
    var id  = "cm_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    var div = document.createElement("div");
    div.id        = id;
    div.className = "chat-msg " + (role === "user" ? "chat-user" : "chat-ai") + (thinking ? " chat-thinking" : "");
    div.innerHTML = role === "user"
        ? "<span class='chat-you'>You</span><p>" + escHtml(text) + "</p>"
        : "<span class='chat-bot'>🤖 AI</span><p>" + (thinking ? "<span class='dot-pulse'></span>" : escHtml(text)) + "</p>";
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return id;
}

function updateChatMsg(id, text, thinking, isError) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("chat-thinking");
    if (isError) el.classList.add("chat-error");
    el.innerHTML = "<span class='chat-bot'>🤖 AI</span><p>" + (thinking ? "<span class='dot-pulse'></span>" : escHtml(text)) + "</p>";
    var box = document.getElementById("survChatBox");
    if (box) box.scrollTop = box.scrollHeight;
}

function clearSurvChat() {
    survChatHistory = [];
    var box = document.getElementById("survChatBox");
    if (box) box.innerHTML = '<div class="chat-empty">💬 Ask anything about the footage above</div>';
}

// Mode toggle
function setSurvMode(mode) {
    var analyzeBtn = document.getElementById("survModeAnalyze");
    var qaBtn      = document.getElementById("survModeQA");
    var analyzeP   = document.getElementById("survAnalyzePanel");
    var qaP        = document.getElementById("survQAPanel");
    if (mode === "analyze") {
        if (analyzeBtn) analyzeBtn.classList.add("active");
        if (qaBtn)      qaBtn.classList.remove("active");
        if (analyzeP)   analyzeP.style.display = "block";
        if (qaP)        qaP.style.display = "none";
    } else {
        if (qaBtn)      qaBtn.classList.add("active");
        if (analyzeBtn) analyzeBtn.classList.remove("active");
        if (qaP)        qaP.style.display = "block";
        if (analyzeP)   analyzeP.style.display = "none";
        // Enable ask button if video is loaded and there's a question
        onSurvQuestionInput();
    }
}

// Set question from chip
function setQuestion(q) {
    var el = document.getElementById("survQuestion");
    if (el) {
        el.value = q;
        onSurvQuestionInput();
        el.focus();
    }
}

// ============================================
// ANALYZE DOCUMENT
// ============================================
async function analyzeDoc() {
    if (!uploadedDoc) return;
    cancelled = false;
    var btn = document.getElementById("analyzeDocBtn");
    showLoading("Reading document...");
    btnBusy(btn, true);
    try {
        var lang = languages[selectedLang] ? languages[selectedLang].name : "Hindi";
        var ext  = uploadedDoc.name.split(".").pop().toLowerCase();
        var text = "";
        if (ext === "pdf")               { setStatus("Extracting PDF text (up to 10 pages)..."); text = await readPdf(uploadedDoc); }
        else if (ext==="docx"||ext==="doc") { setStatus("Extracting Word document text..."); text = await readDocx(uploadedDoc); }
        setStatus("Generating deep document analysis...");
        var msgs = [{ role:"user", content: makeDocPrompt(text, uploadedDoc.name, lang) }];
        var result = await analyzeAndTranslate(msgs, API_DOC, false, lang);
        showResults(result.english, result.translated);
    } catch(e) {
        if (e.message === "RATE_LIMITED") startCountdown(analyzeDoc);
        else if (e.message !== "CANCELLED") showError(e.message);
    }
    btnBusy(btn, false);
}

// ============================================
// COUNTDOWN
// ============================================
function startCountdown(fn) {
    retryFn = fn; cancelled = false; retryCount++;
    if (retryCount > RETRY_WAITS.length) {
        retryCount = 0;
        showError("Still rate limited. Please wait 1-2 minutes then try again.");
        return;
    }
    var TOTAL = RETRY_WAITS[retryCount - 1];
    var left  = TOTAL;
    var C     = 2 * Math.PI * 52;
    ["loadingState","resultsGrid","errorState"].forEach(function(id){
        var el = document.getElementById(id); if(el) el.style.display = "none";
    });
    document.getElementById("countdownState").style.display = "flex";
    document.getElementById("summarySection").scrollIntoView({behavior:"smooth"});
    var badge = document.getElementById("cdBadge");
    if (badge) badge.textContent = "Attempt " + retryCount + " of " + RETRY_WAITS.length;
    function tick() {
        if (cancelled) { clearInterval(cdTimer); return; }
        document.getElementById("cdNum").textContent = left;
        document.getElementById("cdSec").textContent = left;
        var circle = document.getElementById("cdCircle");
        if (circle) circle.style.strokeDashoffset = C * (1 - left/TOTAL);
        if (left <= 0) {
            clearInterval(cdTimer); cdTimer = null;
            document.getElementById("countdownState").style.display = "none";
            showLoading("Retrying...");
            if (retryFn && !cancelled) retryFn();
        }
        left--;
    }
    tick();
    cdTimer = setInterval(tick, 1000);
}

function stopCountdown() {
    cancelled = true;
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
    retryFn = null;
    var el = document.getElementById("countdownState");
    if (el) el.style.display = "none";
}

// ============================================
// RICH MARKDOWN RENDERER
// Converts ### headings + • bullets into
// styled, sectioned HTML
// ============================================
function escHtml(str) {
    return String(str)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");
}

function renderRichContent(text) {
    if (!text) return "<p class='rc-text'>—</p>";

    var lines     = text.split(/\n/);
    var html      = "";
    var inSection = false;
    var inBullets = false;

    function closeBullets() {
        if (inBullets) { html += "</ul>"; inBullets = false; }
    }
    function closeSection() {
        closeBullets();
        if (inSection) { html += "</div></div>"; inSection = false; }
    }

    lines.forEach(function(line) {
        var raw = line.trim();

        // Section heading: ### ...
        if (raw.startsWith("###")) {
            closeSection();
            var title = raw.replace(/^###\s*/, "").trim();
            html += '<div class="rich-section">' +
                    '<div class="rich-heading">' + escHtml(title) + '</div>' +
                    '<div class="rich-body">';
            inSection = true;
            return;
        }

        // Skip blank lines inside section (just spacing)
        if (!raw) { closeBullets(); return; }

        // Bullet point
        if (/^[•\-\*]/.test(raw)) {
            if (!inBullets) { html += '<ul class="rich-bullets">'; inBullets = true; }
            html += "<li>" + escHtml(raw.replace(/^[•\-\*]\s*/,"")) + "</li>";
            return;
        }

        // Normal paragraph
        closeBullets();
        html += "<p class='rich-para'>" + escHtml(raw) + "</p>";
    });

    closeSection();
    return html || "<p class='rc-text'>—</p>";
}

// ============================================
// UI HELPERS
// ============================================
function btnBusy(btn, busy) {
    btn.disabled  = busy;
    btn.innerHTML = busy
        ? "<span>⏳ Analyzing...</span>"
        : "<span>⚡</span><span>Analyze with AI</span>";
}

function showLoading(msg) {
    ["resultsGrid","errorState","countdownState"].forEach(function(id){
        var el = document.getElementById(id); if(el) el.style.display="none";
    });
    document.getElementById("loadingState").style.display = "flex";
    setStatus(msg);
    document.getElementById("summarySection").scrollIntoView({behavior:"smooth"});
}

function showResults(en, tr) {
    stopCountdown(); cancelled = false; retryCount = 0;
    ["loadingState","errorState","countdownState"].forEach(function(id){
        var el = document.getElementById(id); if(el) el.style.display="none";
    });
    var enEl = document.getElementById("englishSummary");
    var trEl = document.getElementById("translatedSummary");
    if (enEl) enEl.innerHTML = renderRichContent(en  || "—");
    if (trEl) trEl.innerHTML = renderRichContent(tr  || "(Translation unavailable)");
    var lang = languages[selectedLang];
    var titleEl = document.getElementById("translatedTitle");
    if (titleEl) titleEl.innerHTML = lang.flag + " " + lang.name + " Analysis";
    document.getElementById("resultsGrid").style.display = "block";
    document.getElementById("summarySection").scrollIntoView({behavior:"smooth"});
}

function showError(msg) {
    stopCountdown();
    ["loadingState","resultsGrid","countdownState"].forEach(function(id){
        var el = document.getElementById(id); if(el) el.style.display="none";
    });
    document.getElementById("errorMsg").textContent = msg;
    document.getElementById("errorState").style.display = "flex";
}

function clearAll() {
    stopCountdown(); cancelled = false; retryCount = 0;
    ["loadingState","resultsGrid","errorState","countdownState"].forEach(function(id){
        var el = document.getElementById(id); if(el) el.style.display="none";
    });
}

// ============================================
// BOOT
// ============================================
initLanguages();
["videoTab","surveillanceTab","documentTab"].forEach(function(id){
    var el = document.getElementById(id); if(el) el.style.display="none";
});
document.getElementById("imageTab").style.display = "block";
