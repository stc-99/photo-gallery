// -----------------------------------------
// GLOBALS
// -----------------------------------------
let currentPage = 1;
let totalPages = 999999; // Will auto-update when JS page reports its index count
let loading = false;

// REQUIRED FOR STORING PAGES
window.imagePages = {}; 


// -----------------------------------------
// LOAD PAGE SCRIPT FROM GITHUB PAGES
// -----------------------------------------
function loadPage(p) {
    if (p > totalPages || loading) return;
    loading = true;

    // 🔥 Put your GitHub pages username + repo HERE:
    const baseURL = "https://stc-99.github.io/photo-gallery/";

    const script = document.createElement("script");
    script.src = `${baseURL}images_page${p}.js?v=${Date.now()}`; // avoid cache

    script.onload = () => {
        if (window.imagePages[p]) {
            displayImages(window.imagePages[p]);
        }
        loading = false;
    };

    script.onerror = () => {
        console.log("No more pages.");
        totalPages = p - 1;  // auto adjust
        loading = false;
    };

    document.body.appendChild(script);
}


// -----------------------------------------
// DISPLAY IMAGES ON SCREEN
// -----------------------------------------
function displayImages(arr) {
    const g = document.getElementById("gallery");

    arr.forEach(img => {
        let d = document.createElement("div");
        d.className = "imgBox";

        let im = document.createElement("img");
        im.loading = "lazy";
        im.src = img.base64;  // already full data URL
        im.onclick = () => openFullscreen(img);

        let t = document.createElement("div");
        t.className = "caption";
        t.innerText = img.name;

        d.appendChild(im);
        d.appendChild(t);
        g.appendChild(d);
    });
}


// -----------------------------------------
// AUTO LOAD NEXT PAGE WHEN SCROLLING
// -----------------------------------------
window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
        currentPage++;
        loadPage(currentPage);
    }
});


// -----------------------------------------
// FULLSCREEN VIEWER
// -----------------------------------------
function openFullscreen(img) {
    document.getElementById("fsImg").src = img.base64;
    document.getElementById("fsName").innerText = img.name;
    document.getElementById("fullscreen").style.display = "flex";
}

function closeFullscreen() {
    document.getElementById("fullscreen").style.display = "none";
}


// -----------------------------------------
// START LOADING
// -----------------------------------------
loadPage(1);
