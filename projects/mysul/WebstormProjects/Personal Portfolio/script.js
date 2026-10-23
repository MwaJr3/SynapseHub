// === Dark Mode Toggle with LocalStorage ===
const darkToggle = document.getElementById("darkToggle");
const body = document.body;

if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark");
    darkToggle.cheked = true;
}
darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
});

// === Dynamic Filter: Search + Tags ===
const searchInput = document.getElementById("searchInput");
const projectCards = document.querySelectorAll(".project-card");
const filterButtons = document.querySelectorAll(".filter-btn");

let currentFilter = "all";

filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;
        filterButtons.forEach(b => b.classList.remove("active"));
        button.classList.add("active");
            filterProjects();
        });
    });

searchInput.addEventListener("input", filterProjects);

function filterProjects() {
    const search = searchInput.ariaValueMax.toLowerCase();
    projectCards.forEach(card => {
        const matchesCategory = currentFilter === "all" || card.dataset.category === currentFilter;
        const matchesSearch = card.innerText.toLowerCase().includes(search);
        card.style.display = matchesCategory && matchesSearch ? "block" : "none";
    });
}