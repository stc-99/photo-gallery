let currentPage = 1;
let totalPages = 999999; // will reset when pages load
let loading = false;

function loadPage(p) {
    if (p > totalPages || loading) return;
    loading = true;

    const script = document.createElement("script");
    script.src = `images_page${p}.js`;
    script.onload = () => {
        if (window.imagePages[p]) {
            displayImages(window.imagePages[p]);
        }
        loading = false;
    };
    document.body.appendChild(script);
}

function displayImages(arr) {
    const g = document.getElementById("gallery");

    arr.forEach(img => {
        let d = document.createElement("div");
        d.className = "imgBox";

        let im = document.createElement("img");
        im.loading = "lazy";
        im.src = "data:image/jpeg;base64," + img.base64;
        im.onclick = () => openFullscreen(img);

        let t = document.createElement("div");
        t.className = "caption";
        t.innerText = img.name;

        d.appendChild(im);
        d.appendChild(t);
        g.appendChild(d);
    });
}

// Lazy loading pages on scroll
window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
        currentPage++;
        loadPage(currentPage);
    }
});

// Fullscreen viewer
function openFullscreen(img) {
    document.getElementById("fsImg").src = "data:image/jpeg;base64," + img.base64;
    document.getElementById("fsName").innerText = img.name;
    document.getElementById("fullscreen").style.display = "flex";
}

function closeFullscreen() {
    document.getElementById("fullscreen").style.display = "none";
}
