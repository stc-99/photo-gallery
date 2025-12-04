async function loadPage(page) {
    const gallery = document.getElementById("gallery");
    gallery.innerHTML = "Loading...";

    try {
        const res = await fetch(`images/page${page}.json`);
        const data = await res.json();

        gallery.innerHTML = "";

        data.forEach(img => {
            const div = document.createElement("div");
            div.className = "imgBox";
            div.innerHTML = `
                <img src="data:image/jpeg;base64,${img.base64}" onclick="openFS('${img.base64}', '${img.name}')">
                <div class="caption">${img.name}</div>
            `;
            gallery.appendChild(div);
        });

    } catch (e) {
        gallery.innerHTML = "⚠ No images found (page file too big or missing)";
    }
}

function openFS(b64, name) {
    document.getElementById("fullscreen").style.display = "flex";
    document.getElementById("fsImg").src = "data:image/jpeg;base64," + b64;
    document.getElementById("fsName").innerText = name;
}

document.getElementById("close").onclick = function () {
    document.getElementById("fullscreen").style.display = "none";
};
