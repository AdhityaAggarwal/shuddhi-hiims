/* ==========================================
   SHUDDHI HIIMS — Admin Dashboard Logic
   In-memory CRUD — Local mode (no Cloudflare)
   ========================================== */

// ─── Local admin password (change this!) ───
const LOCAL_ADMIN_PASSWORD = "shuddhi2024";

// ─── In-memory content store ───
let adminData = { carousel: [], videos: [], audio: [], texts: [] };

// ─── Admin Section Configs (generic CRUD) ───
const ADMIN_SECTIONS = {
  carousel: {
    label: "Carousel Slide",
    columns: [
      { key: "imageUrl", label: "Preview", render: "thumbnail" },
      { key: "caption", label: "Caption", render: "title" },
      { key: "description", label: "Description", render: "desc" },
      { key: "order", label: "Order", render: "text" },
    ],
  },
  videos: {
    label: "Video",
    columns: [
      { key: "thumbnailUrl", label: "Thumbnail", render: "thumbnail" },
      { key: "title", label: "Title", render: "title" },
      { key: "description", label: "Description", render: "desc" },
    ],
  },
  audio: {
    label: "Audio",
    columns: [
      { key: "title", label: "Title", render: "title" },
      { key: "description", label: "Description", render: "desc" },
      { key: "audioUrl", label: "Audio URL", render: "desc" },
    ],
  },
  texts: {
    label: "Article",
    columns: [
      { key: "title", label: "Title", render: "title" },
      { key: "category", label: "Category", render: "badge" },
      { key: "body", label: "Preview", render: "excerpt" },
    ],
  },
};

let editingItem = null; // { type, id }
let activeSection = "carousel";

// ─── Init ───
document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
});

// =========================================
// LOGIN (UX gate — stores secret for API calls)
// =========================================
function initLoginForm() {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = document.getElementById("adminPassword").value.trim();

    if (!pw || pw !== LOCAL_ADMIN_PASSWORD) {
      document.querySelector(".login-error").classList.add("show");
      return;
    }

    document.querySelector(".login-error").classList.remove("show");
    document.querySelector(".admin-login-page").style.display = "none";
    const dashboard = document.querySelector(".admin-dashboard");
    dashboard.classList.add("active");
    enterDashboard();
  });
}

async function enterDashboard() {
  // Load current live data to populate tables
  await cm.load();
  adminData = JSON.parse(JSON.stringify(cm.data));

  renderAllTables();

  // Sidebar nav
  document.querySelectorAll(".admin-nav-item").forEach((item) => {
    item.addEventListener("click", () => switchSection(item.dataset.section));
  });

  // Exit button
  document.querySelector(".admin-exit-btn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // Mobile sidebar
  document
    .querySelector(".admin-mobile-toggle")
    ?.addEventListener("click", toggleSidebar);
  document
    .querySelector(".admin-sidebar-backdrop")
    ?.addEventListener("click", toggleSidebar);

  // Init all forms
  Object.keys(ADMIN_SECTIONS).forEach((type) => {
    const form = document.getElementById(`form-${type}`);
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSubmit(type, form);
      });
    }
  });

  // Publish & Exit button
  const publishBtn = document.querySelector(".btn-accent");
  if (publishBtn) {
    publishBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await publishToStaging();
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    });
  }
}

// =========================================
// SIDEBAR NAVIGATION
// =========================================
function switchSection(section) {
  activeSection = section;
  document
    .querySelectorAll(".admin-nav-item")
    .forEach((n) =>
      n.classList.toggle("active", n.dataset.section === section),
    );
  document
    .querySelectorAll(".admin-section")
    .forEach((s) =>
      s.classList.toggle("active", s.id === `section-${section}`),
    );

  const titles = {
    carousel: "Carousel Images",
    videos: "Video Content",
    audio: "Audio Content",
    texts: "Text / Articles",
  };
  const titleEl = document.getElementById("adminSectionTitle");
  if (titleEl) titleEl.textContent = titles[section] || section;

  // Close mobile sidebar
  document.querySelector(".admin-sidebar")?.classList.remove("open");
  document.querySelector(".admin-sidebar-backdrop")?.classList.remove("show");
}

function toggleSidebar() {
  document.querySelector(".admin-sidebar").classList.toggle("open");
  document.querySelector(".admin-sidebar-backdrop").classList.toggle("show");
}

// =========================================
// IN-MEMORY CRUD HELPERS
// =========================================
function getData(type) {
  return adminData[type] || [];
}

function setData(type, items) {
  adminData[type] = items;
}

function addItem(type, item) {
  item.id = "id_" + Date.now();
  item.createdAt = new Date().toISOString();
  adminData[type].push(item);
  return item;
}

function updateItem(type, id, updates) {
  const items = adminData[type];
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    return items[idx];
  }
  return null;
}

function removeItem(type, id) {
  adminData[type] = adminData[type].filter((i) => i.id !== id);
}

// =========================================
// PUBLISH LOCALLY (saves to localStorage)
// =========================================
async function publishToStaging() {
  try {
    localStorage.setItem("shuddhi_data", JSON.stringify(adminData));
    showToast("✅ Published! Changes saved locally.");
  } catch (err) {
    showToast("Save error: " + err.message);
  }
}

// =========================================
// GENERIC FORM HANDLING
// =========================================
function handleSubmit(type, formEl) {
  const config = ADMIN_SECTIONS[type];
  const formData = new FormData(formEl);
  const data = Object.fromEntries(formData.entries());

  // Cast numeric fields if present
  if (data.order !== undefined) {
    data.order = parseInt(data.order) || 1;
  }

  if (editingItem && editingItem.type === type) {
    updateItem(type, editingItem.id, data);
    showToast(`${config.label} updated`);
    editingItem = null;
    formEl.querySelector(".admin-form-header h3").textContent =
      `Add New ${config.label}`;
  } else {
    addItem(type, data);
    showToast(`${config.label} added`);
  }

  formEl.reset();
  renderTable(type);
}

function editItem(type, id) {
  const item = getData(type).find((i) => i.id === id);
  if (!item) return;
  editingItem = { type, id };

  const config = ADMIN_SECTIONS[type];
  const form = document.getElementById(`form-${type}`);
  if (!form) return;

  Object.keys(item).forEach((key) => {
    const el = form.elements[key];
    if (el) el.value = item[key];
  });

  form.querySelector(".admin-form-header h3").textContent =
    `Edit ${config.label}`;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteItem(type, id) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  removeItem(type, id);
  renderTable(type);
  showToast("Item deleted");

  if (editingItem && editingItem.type === type && editingItem.id === id)
    cancelEdit(type);
}

function cancelEdit(type) {
  editingItem = null;
  const config = ADMIN_SECTIONS[type];
  const form = document.getElementById(`form-${type}`);
  if (form) {
    form.reset();
    form.querySelector(".admin-form-header h3").textContent =
      `Add New ${config.label}`;
  }
}

// =========================================
// GENERIC TABLE RENDERING
// =========================================
function renderAllTables() {
  Object.keys(ADMIN_SECTIONS).forEach(renderTable);
}

function renderTable(type) {
  const config = ADMIN_SECTIONS[type];
  let items = getData(type);
  if (type === "carousel")
    items = items.sort((a, b) => (a.order || 0) - (b.order || 0));

  const container = document.getElementById(`table-${type}`);
  const countEl = document.getElementById(`count-${type}`);
  if (!container) return;
  if (countEl)
    countEl.textContent = `${items.length} item${items.length !== 1 ? "s" : ""}`;

  if (items.length === 0) {
    container.innerHTML = `<div class="admin-empty">${ICONS.inbox}<p>No items yet. Use the form above to add one.</p></div>`;
    return;
  }

  const headerCells =
    config.columns.map((c) => `<th>${c.label}</th>`).join("") +
    "<th>Actions</th>";

  const rows = items
    .map((item) => {
      const cells = config.columns
        .map((c) => {
          const val = item[c.key] || "";
          switch (c.render) {
            case "thumbnail":
              return `<td><img class="thumb-preview" src="${val}" alt="" onerror="this.style.background='var(--primary)';this.src=''"></td>`;
            case "title":
              return `<td class="td-title">${val}</td>`;
            case "desc":
              return `<td class="td-desc">${val || "\u2014"}</td>`;
            case "badge":
              return `<td><span class="text-category" style="margin:0">${val || "General"}</span></td>`;
            case "excerpt":
              return `<td class="td-desc">${(val || "").substring(0, 80)}\u2026</td>`;
            default:
              return `<td>${val || "\u2014"}</td>`;
          }
        })
        .join("");

      return `<tr>${cells}<td class="actions">
      <button class="btn btn-secondary btn-sm" onclick="editItem('${type}','${item.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteItem('${type}','${item.id}')">Delete</button>
    </td></tr>`;
    })
    .join("");

  container.innerHTML = `<table class="admin-table"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
}
