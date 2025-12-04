// script.js (v3.1 CSP-safe)
// Config
const PAGE_PREFIX = "images_page";   // images_page1.js, images_page2.js, ...
const PAGE_SUFFIX = ".js";
const IMAGES_PER_PAGE = 50;          // generator should use same batch size
const LAZY_THRESHOLD = 3;            // how many images around viewport to preload
const STORAGE_KEY = "stc_selected_images_v3";

// compute base URL (same folder as index.html)
const baseURL = (function(){
    const p = location.pathname;
    return location.origin + p.substring(0, p.lastIndexOf('/') + 1);
})();

let currentPage = 1;
let totalPages = Infinity; // generator may set window.__TOTAL_PAGES__ in a page file
let loading = false;
let gallery = null;
let statusEl = null;
let loadMoreBtn = null;

let selectedSet = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));

// helper: append external page script
function loadPageScript(pageNum){
    if (loading) return;
    loading = true;
    setStatus("Loading page " + pageNum + "...");
    const s = document.createElement("script");
    s.src = baseURL + PAGE_PREFIX + pageNum + PAGE_SUFFIX;
    s.async = true;
    s.onload = () => {
        // pages must set window.imagePages[pageNum] = [ {name, base64}, ... ];
        if (window.imagePages && window.imagePages[pageNum]) {
            displayImages(window.imagePages[pageNum], pageNum);
            // total pages can be provided by generator via window.__TOTAL_PAGES__
            if (window.__TOTAL_PAGES__ && Number.isFinite(window.__TOTAL_PAGES__)) {
                totalPages = window.__TOTAL_PAGES__;
            }
        } else {
            console.warn("No data in images_page" + pageNum + ".js");
        }
        loading = false;
        setStatus("");
    };
    s.onerror = () => {
        console.error("Failed to load page script:", s.src);
        loading = false;
        setStatus("Failed to load page " + pageNum);
    };
    document.body.appendChild(s);
}

// display images array for a page
function displayImages(arr, pageNum){
    if (!gallery) return;
    arr.forEach((it, idx) => {
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.name = it.name;
        // checkbox
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "checkbox";
        cb.checked = selectedSet.has(it.name);
        cb.addEventListener("change", (e) => {
            const checked = e.target.checked;
            if (checked) selectedSet.add(it.name);
            else selectedSet.delete(it.name);
            saveSelection();
        });
        // img element: lazy using data-src
        const img = document.createElement("img");
        img.alt = it.name;
        img.dataset.src = "data:image/jpeg;base64," + it.base64;
        img.loading = "lazy";
        img.addEventListener("click", () => openFullscreenByName(it.name));
        // filename
        const fname = document.createElement("div");
        fname.className = "filename";
        fname.textContent = it.name;
        // assemble
        // place checkbox at top-left absolute: wrap in relative container
        card.style.position = "relative";
        cb.style.position = "absolute";
        cb.style.left = "6px";
        cb.style.top = "6px";
        card.appendChild(cb);
        card.appendChild(img);
        card.appendChild(fname);
        gallery.appendChild(card);
    });
    // after adding, init lazy loading (IntersectionObserver)
    initBatchLazyObserver();
}

// lazy loader for image elements using IntersectionObserver
let lazyObserver = null;
function initBatchLazyObserver(){
    const imgs = Array.from(document.querySelectorAll("img[data-src]"));
    if (!imgs.length) return;
    if ('IntersectionObserver' in window){
        if (!lazyObserver){
            lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting){
                        const el = entry.target;
                        el.src = el.dataset.src;
                        el.removeAttribute('data-src');
                        lazyObserver.unobserve(el);
                    }
                });
            }, {rootMargin: "400px 0px 400px 0px"});
        }
        imgs.forEach(i => lazyObserver.observe(i));
    } else {
        // fallback: load all
        imgs.forEach(i => { i.src = i.dataset.src; i.removeAttribute('data-src'); });
    }
}

// open fullscreen by image name (search current DOM / loaded pages)
function openFullscreenByName(name){
    // try to find DOM card
    const cards = document.querySelectorAll(".card");
    let index = -1;
    let imgSrc = null;
    let foundName = null;

    for (let c of cards){
        if (c.dataset.name === name){
            const img = c.querySelector("img");
            if (img) { imgSrc = img.src || img.dataset.src; foundName = name; break; }
        }
    }
    // fallback: search loaded imagePages data
    if (!imgSrc && window.imagePages){
        for (let k in window.imagePages){
            const arr = window.imagePages[k];
            for (let it of arr){
                if (it.name === name){
                    imgSrc = "data:image/jpeg;base64," + it.base64;
                    foundName = it.name;
                    break;
                }
            }
            if (imgSrc) break;
        }
    }
    if (!imgSrc) { alert("Image not found in loaded pages yet. Scroll to load."); return; }
    openFullscreen(imgSrc, foundName);
}

const fs = {
    el: null, img: null, nameEl: null, checkbox: null, prev: null, next: null,
    currentName: null
};

function openFullscreen(srcOrIndex, name){
    if (!fs.el){
        fs.el = document.getElementById("fullscreen");
        fs.img = document.getElementById("fsImg");
        fs.nameEl = document.getElementById("fsName");
        fs.checkbox = document.getElementById("fsCheckbox");
        fs.prev = document.getElementById("fsPrev");
        fs.next = document.getElementById("fsNext");
        document.getElementById("fsClose").addEventListener("click", closeFullscreen);
        // prev/next
        fs.prev.addEventListener("click", ()=>navigateFullscreen(-1));
        fs.next.addEventListener("click", ()=>navigateFullscreen(1));
        // checkbox
        fs.checkbox.addEventListener("change", () => {
            if (!fs.currentName) return;
            const checked = fs.checkbox.checked;
            if (checked) selectedSet.add(fs.currentName);
            else selectedSet.delete(fs.currentName);
            saveSelection();
            // sync visible card checkbox
            const card = Array.from(document.querySelectorAll(".card")).find(c=>c.dataset.name===fs.currentName);
            if (card) card.querySelector("input[type=checkbox]").checked = checked;
        });
        // touch swipe
        let startX = 0;
        fs.el.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, {passive:true});
        fs.el.addEventListener("touchend", e => {
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) {
                if (dx < 0) navigateFullscreen(1); else navigateFullscreen(-1);
            }
        }, {passive:true});
    }
    fs.el.style.display = "flex";
    fs.img.src = (srcOrIndex.startsWith && srcOrIndex.startsWith("data:")) ? srcOrIndex : srcOrIndex;
    fs.nameEl.textContent = name || "";
    fs.currentName = name || null;
    fs.checkbox.checked = fs.currentName ? selectedSet.has(fs.currentName) : false;
}

function closeFullscreen(){
    if (fs.el) fs.el.style.display = "none";
}

// navigation across loaded items: move to next/prev based on DOM order
function navigateFullscreen(delta){
    const cards = Array.from(document.querySelectorAll(".card"));
    if (!cards.length) return;
    let idx = cards.findIndex(c => c.dataset.name === fs.currentName);
    if (idx === -1) {
        // if not present, try find first loaded image and show that
        const first = cards[0];
        if(first) openFullscreen(first.querySelector("img").src, first.dataset.name);
        return;
    }
    idx = (idx + delta + cards.length) % cards.length;
    const c = cards[idx];
    const imgEl = c.querySelector("img");
    openFullscreen(imgEl.src || imgEl.dataset.src, c.dataset.name);
}

// save selection to localStorage
function saveSelection(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedSet)));
    updateStatus();
}

// update status text
function updateStatus(){
    const status = document.getElementById("status");
    if (!status) return;
    status.textContent = `Loaded page ${currentPage}  •  Selected: ${selectedSet.size}`;
}

// set temporary status
function setStatus(text){
    const s = document.getElementById("status");
    if (s) s.textContent = text || "";
}

// init UI and events
function init(){
    gallery = document.getElementById("gallery");
    statusEl = document.getElementById("status");
    loadMoreBtn = document.getElementById("btnLoadMore");
    document.getElementById("btnDownload").addEventListener("click", downloadSelection);
    document.getElementById("btnShare").addEventListener("click", shareSelection);

    loadMoreBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadPageScript(currentPage);
        }
    });

    // auto load next page on scroll near bottom
    window.addEventListener("scroll", () => {
        if (loading) return;
        if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 300)) {
            if (currentPage < totalPages) {
                currentPage++;
                loadPageScript(currentPage);
            }
        }
    });

    // initial load
    loadPageScript(currentPage);
    updateStatus();
}

// download selected list as .txt
function downloadSelection(){
    if (selectedSet.size === 0){ alert("No images selected"); return; }
    const text = Array.from(selectedSet).join("\n");
    const blob = new Blob([text], {type: "text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "selected_images.txt";
    a.click();
}

// share via WhatsApp (opens web.whatsapp)
function shareSelection(){
    if (selectedSet.size === 0){ alert("No images selected"); return; }
    const text = Array.from(selectedSet).join("\n");
    const url = "https://wa.me/?text=" + encodeURIComponent(text);
    window.open(url, "_blank");
}

// run init when script loaded (deferred in index.html)
document.addEventListener("DOMContentLoaded", init);
