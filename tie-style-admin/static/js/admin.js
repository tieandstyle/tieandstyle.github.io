// --- Publish to GitHub ---
window.publishToGitHub = async function () {
  const btn = document.getElementById("publishBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Publishing...";
  }
  try {
    const res = await fetch(
      "/publish?message=" + encodeURIComponent("Publish from Admin"),
      { method: "GET" }
    );
    const data = await res.json();
    if (data.ok) {
      let message = data.message;
      if (data.changes && data.changes.length > 0) {
        message += "\n\nChanged files:\n" + data.changes.join("\n");
      }
      alert(message);
    } else {
      alert("❌ Publish failed: " + (data.error || "Unknown error"));
    }
  } catch (e) {
    alert("❌ Publish error: " + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🚀 Publish to GitHub";
    }
  }
};
// Tie-Style Admin Panel - JavaScript Functions

// Image Preview Function (Single Image - Legacy)
function previewImage(input) {
  const preview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");

  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      previewImg.src = e.target.result;
      preview.style.display = "block";
    };

    reader.readAsDataURL(input.files[0]);
  } else {
    preview.style.display = "none";
  }
}

// Multiple Images Preview Function (Up to 6 images)
function previewMultipleImages(input) {
  const preview = document.getElementById("images-preview");
  const previewContainer = document.getElementById("preview-container");

  if (input.files && input.files.length > 0) {
    // Limit to 6 images
    const maxImages = 6;
    const filesToPreview = Math.min(input.files.length, maxImages);

    if (input.files.length > maxImages) {
      alert(
        `⚠️ Maximum 6 images allowed. Only first ${maxImages} images will be uploaded.`
      );
    }

    previewContainer.innerHTML = "";

    for (let i = 0; i < filesToPreview; i++) {
      const reader = new FileReader();

      reader.onload = function (e) {
        const div = document.createElement("div");
        div.style.position = "relative";
        div.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${i + 1}" 
                         style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; border: 2px solid #df20df;">
                    <small style="display: block; margin-top: 4px; text-align: center; font-weight: bold; color: #df20df;">Image ${
                      i + 1
                    }</small>
                `;
        previewContainer.appendChild(div);
      };

      reader.readAsDataURL(input.files[i]);
    }

    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
}

// Auto-generate SKU from title
function autoGenerateSKU() {
  const titleInput = document.getElementById("title");
  const skuInput = document.getElementById("sku");

  if (!titleInput || !skuInput || skuInput.value) return; // Don't override existing SKU

  titleInput.addEventListener("blur", function () {
    if (!skuInput.value && titleInput.value) {
      // Generate SKU from title
      // Example: "Skinny Scrunchie" -> "SKIN-SCR"
      const words = titleInput.value.trim().toUpperCase().split(/\s+/);
      let sku = "";

      if (words.length >= 2) {
        // Take first 4 letters of first two words
        sku = words[0].substring(0, 4) + "-" + words[1].substring(0, 3);
      } else if (words.length === 1) {
        // Take first 7 letters
        sku = words[0].substring(0, 7);
      }

      // Add a random number suffix
      sku += "-" + Math.floor(Math.random() * 900 + 100);

      skuInput.value = sku;
    }
  });
}

// Initialize auto-generation on page load
document.addEventListener("DOMContentLoaded", function () {
  autoGenerateSKU();
});

// Dynamic Color Variant Fields
function addColor() {
  const container = document.getElementById("colors-container");
  const colorRow = document.createElement("div");
  colorRow.className = "color-row";
  colorRow.style.cssText =
    "background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;";
  colorRow.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 5px;">Color Name</label>
                <input type="text" 
                       name="color_name" 
                       placeholder="e.g., Ocean Blue"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
            </div>
            <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 5px;">Pick Color</label>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <!-- Visual Color Picker -->
                    <input type="color" 
                           class="color-picker-input"
                           value="#CCCCCC"
                           style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; padding: 0;"
                           onchange="syncColorFromPicker(this)"
                           oninput="syncColorFromPicker(this)">
                    <!-- Hex Input -->
                    <input type="text" 
                           name="color_hex" 
                           placeholder="#0000FF"
                           pattern="^#[0-9A-Fa-f]{6}$"
                           style="width: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: monospace; text-transform: uppercase;"
                           onchange="syncColorFromHex(this)"
                           oninput="syncColorFromHex(this)">
                </div>
                <!-- Preset Color Palette -->
                <div class="preset-colors" style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
                    <button type="button" class="preset-color-btn" data-color="#FF0000" style="width: 28px; height: 28px; background: #FF0000; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Red" onclick="selectPresetColor(this, '#FF0000')"></button>
                    <button type="button" class="preset-color-btn" data-color="#FF6B6B" style="width: 28px; height: 28px; background: #FF6B6B; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Light Red" onclick="selectPresetColor(this, '#FF6B6B')"></button>
                    <button type="button" class="preset-color-btn" data-color="#FF69B4" style="width: 28px; height: 28px; background: #FF69B4; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Hot Pink" onclick="selectPresetColor(this, '#FF69B4')"></button>
                    <button type="button" class="preset-color-btn" data-color="#FF1493" style="width: 28px; height: 28px; background: #FF1493; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Deep Pink" onclick="selectPresetColor(this, '#FF1493')"></button>
                    <button type="button" class="preset-color-btn" data-color="#800080" style="width: 28px; height: 28px; background: #800080; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Purple" onclick="selectPresetColor(this, '#800080')"></button>
                    <button type="button" class="preset-color-btn" data-color="#4169E1" style="width: 28px; height: 28px; background: #4169E1; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Royal Blue" onclick="selectPresetColor(this, '#4169E1')"></button>
                    <button type="button" class="preset-color-btn" data-color="#0000FF" style="width: 28px; height: 28px; background: #0000FF; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Blue" onclick="selectPresetColor(this, '#0000FF')"></button>
                    <button type="button" class="preset-color-btn" data-color="#00CED1" style="width: 28px; height: 28px; background: #00CED1; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Turquoise" onclick="selectPresetColor(this, '#00CED1')"></button>
                    <button type="button" class="preset-color-btn" data-color="#008000" style="width: 28px; height: 28px; background: #008000; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Green" onclick="selectPresetColor(this, '#008000')"></button>
                    <button type="button" class="preset-color-btn" data-color="#32CD32" style="width: 28px; height: 28px; background: #32CD32; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Lime Green" onclick="selectPresetColor(this, '#32CD32')"></button>
                    <button type="button" class="preset-color-btn" data-color="#FFD700" style="width: 28px; height: 28px; background: #FFD700; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Gold" onclick="selectPresetColor(this, '#FFD700')"></button>
                    <button type="button" class="preset-color-btn" data-color="#FFA500" style="width: 28px; height: 28px; background: #FFA500; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Orange" onclick="selectPresetColor(this, '#FFA500')"></button>
                    <button type="button" class="preset-color-btn" data-color="#8B4513" style="width: 28px; height: 28px; background: #8B4513; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Brown" onclick="selectPresetColor(this, '#8B4513')"></button>
                    <button type="button" class="preset-color-btn" data-color="#000000" style="width: 28px; height: 28px; background: #000000; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Black" onclick="selectPresetColor(this, '#000000')"></button>
                    <button type="button" class="preset-color-btn" data-color="#808080" style="width: 28px; height: 28px; background: #808080; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Gray" onclick="selectPresetColor(this, '#808080')"></button>
                    <button type="button" class="preset-color-btn" data-color="#FFFFFF" style="width: 28px; height: 28px; background: #FFFFFF; border: 2px solid #999; border-radius: 6px; cursor: pointer;" title="White" onclick="selectPresetColor(this, '#FFFFFF')"></button>
                    <button type="button" class="preset-color-btn" data-color="#F5F5DC" style="width: 28px; height: 28px; background: #F5F5DC; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Beige" onclick="selectPresetColor(this, '#F5F5DC')"></button>
                    <button type="button" class="preset-color-btn" data-color="#C0C0C0" style="width: 28px; height: 28px; background: #C0C0C0; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;" title="Silver" onclick="selectPresetColor(this, '#C0C0C0')"></button>
                </div>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: end;">
            <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 5px;">Stock Quantity</label>
                <input type="number" 
                       name="color_stock" 
                       placeholder="0"
                       min="0"
                       value="0"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
            </div>
            <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 5px;">Status</label>
                <label style="display: flex; align-items: center; gap: 8px; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">
                    <input type="checkbox" 
                           name="color_available" 
                           checked
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="font-size: 14px; font-weight: 500;">Available</span>
                </label>
            </div>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeColor(this)" style="padding: 10px 16px; height: 45px; display: flex; align-items: center; gap: 5px;">
                <span style="font-size: 16px;">✖</span>
                <span>Remove</span>
            </button>
        </div>
    `;
  container.appendChild(colorRow);
}

function removeColor(button) {
  const container = document.getElementById("colors-container");
  const row = button.closest(".color-row");

  // Keep at least one color row
  if (container.children.length > 1) {
    row.remove();
  } else {
    // Clear the inputs instead of removing
    const inputs = row.querySelectorAll(
      'input[type="text"], input[type="number"]'
    );
    inputs.forEach((input) => (input.value = ""));
    const checkbox = row.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = true;
    const colorPicker = row.querySelector(".color-picker-input");
    if (colorPicker) colorPicker.value = "#CCCCCC";
  }
}

// Sync color picker -> hex input
function syncColorFromPicker(colorPickerInput) {
  const colorRow = colorPickerInput.closest(".color-row");
  if (!colorRow) return;

  const hexInput = colorRow.querySelector('input[name="color_hex"]');
  if (hexInput) {
    hexInput.value = colorPickerInput.value.toUpperCase();
  }
}

// Sync hex input -> color picker
function syncColorFromHex(hexInput) {
  const colorRow = hexInput.closest(".color-row");
  if (!colorRow) return;

  const colorPicker = colorRow.querySelector(".color-picker-input");
  const hexValue = hexInput.value.trim();

  // Validate hex color
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  if (hexRegex.test(hexValue)) {
    if (colorPicker) {
      colorPicker.value = hexValue;
    }
    hexInput.style.borderColor = "#ddd";
    hexInput.style.boxShadow = "none";
  } else if (hexValue) {
    hexInput.style.borderColor = "#dc3545";
    hexInput.style.boxShadow = "0 0 0 0.2rem rgba(220, 53, 69, 0.25)";
  } else {
    hexInput.style.borderColor = "#ddd";
    hexInput.style.boxShadow = "none";
  }
}

// Select preset color from palette
function selectPresetColor(button, color) {
  const colorRow = button.closest(".color-row");
  if (!colorRow) return;

  const hexInput = colorRow.querySelector('input[name="color_hex"]');
  const colorPicker = colorRow.querySelector(".color-picker-input");

  if (hexInput) {
    hexInput.value = color.toUpperCase();
    hexInput.style.borderColor = "#ddd";
    hexInput.style.boxShadow = "none";
  }

  if (colorPicker) {
    colorPicker.value = color;
  }

  // Visual feedback - highlight selected button
  const allButtons = colorRow.querySelectorAll(".preset-color-btn");
  allButtons.forEach((btn) => {
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = "none";
  });
  button.style.transform = "scale(1.2)";
  button.style.boxShadow = "0 0 0 3px rgba(223, 32, 223, 0.5)";

  // Reset after animation
  setTimeout(() => {
    button.style.transform = "scale(1)";
    button.style.boxShadow = "none";
  }, 300);
}

// Legacy function for backwards compatibility
function updateColorPreview(input) {
  syncColorFromHex(input);
}

// Dynamic Attribute Fields for Products
function addAttribute() {
  const container = document.getElementById("attributes-container");
  const attributeRow = document.createElement("div");
  attributeRow.className = "attribute-row";
  attributeRow.innerHTML = `
        <input type="text" name="attribute_key" placeholder="Attribute name (e.g., material)">
        <input type="text" name="attribute_value" placeholder="Attribute value (e.g., Cotton)">
        <button type="button" class="btn btn-sm btn-danger" onclick="removeAttribute(this)">✖</button>
    `;
  container.appendChild(attributeRow);
}

function removeAttribute(button) {
  const container = document.getElementById("attributes-container");
  const row = button.parentElement;

  // Keep at least one attribute row
  if (container.children.length > 1) {
    row.remove();
  } else {
    // Clear the inputs instead of removing
    const inputs = row.querySelectorAll("input");
    inputs.forEach((input) => (input.value = ""));
  }
}

// Load Subcategories based on selected Category
function loadSubcategories(categoryId) {
  const subcategorySelect = document.getElementById("subcategoryId");

  if (!subcategorySelect) return;

  // Get all option elements
  const allOptions = subcategorySelect.querySelectorAll("option");

  // Hide all subcategory options except the first one (placeholder)
  allOptions.forEach((option, index) => {
    if (index === 0) {
      option.style.display = "block";
      return;
    }

    const parentId = option.getAttribute("data-parent");
    if (parentId === categoryId) {
      option.style.display = "block";
    } else {
      option.style.display = "none";
    }
  });

  // Reset the subcategory selection
  subcategorySelect.value = "";
}

// Initialize subcategories on page load (for edit mode)
document.addEventListener("DOMContentLoaded", function () {
  const categorySelect = document.getElementById("categoryIds");
  const subcategorySelect = document.getElementById("subcategoryId");

  if (categorySelect && subcategorySelect) {
    // If there's a selected category, load its subcategories
    const selectedCategory = categorySelect.value;
    if (selectedCategory) {
      loadSubcategories(selectedCategory);

      // Restore the selected subcategory after loading
      const selectedSubcategory =
        subcategorySelect.getAttribute("data-selected");
      if (selectedSubcategory) {
        subcategorySelect.value = selectedSubcategory;
      }
    }
  }
});

// Form Validation
function validateProductForm(form) {
  const requiredFields = form.querySelectorAll("[required]");
  let isValid = true;

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      field.style.borderColor = "var(--danger-color)";
      isValid = false;
    } else {
      field.style.borderColor = "var(--border-color)";
    }
  });

  if (!isValid) {
    alert("Please fill in all required fields.");
  }

  return isValid;
}

// Auto-save functionality (optional enhancement)
let autoSaveTimer;
function enableAutoSave(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  const inputs = form.querySelectorAll("input, textarea, select");

  inputs.forEach((input) => {
    input.addEventListener("change", function () {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        saveFormData(formId);
      }, 2000);
    });
  });
}

function saveFormData(formId) {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const data = {};

  formData.forEach((value, key) => {
    data[key] = value;
  });

  // Save to localStorage
  localStorage.setItem(`${formId}_draft`, JSON.stringify(data));

  // Show saved indicator
  showAutoSaveIndicator();
}

function showAutoSaveIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "alert alert-success";
  indicator.style.position = "fixed";
  indicator.style.top = "20px";
  indicator.style.right = "20px";
  indicator.style.zIndex = "1000";
  indicator.textContent = "✓ Draft saved";

  document.body.appendChild(indicator);

  setTimeout(() => {
    indicator.remove();
  }, 2000);
}

// Confirm before deleting
document.addEventListener("DOMContentLoaded", function () {
  const deleteForms = document.querySelectorAll('form[action*="delete"]');

  deleteForms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      const itemType = this.action.includes("product")
        ? "product"
        : this.action.includes("category")
        ? "category"
        : this.action.includes("news")
        ? "news item"
        : "item";

      if (
        !confirm(
          `Are you sure you want to delete this ${itemType}? This action cannot be undone.`
        )
      ) {
        e.preventDefault();
      }
    });
  });
});

// Search/Filter functionality for tables
function filterTable(inputId, tableId) {
  const input = document.getElementById(inputId);
  const filter = input.value.toUpperCase();
  const table = document.getElementById(tableId);
  const tr = table.getElementsByTagName("tr");

  for (let i = 1; i < tr.length; i++) {
    const td = tr[i].getElementsByTagName("td");
    let found = false;

    for (let j = 0; j < td.length; j++) {
      if (td[j]) {
        const txtValue = td[j].textContent || td[j].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          found = true;
          break;
        }
      }
    }

    tr[i].style.display = found ? "" : "none";
  }
}

// Slug generator
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Auto-generate slug from title
document.addEventListener("DOMContentLoaded", function () {
  const titleInput = document.getElementById("title");
  const slugDisplay = document.querySelector(".slug-preview");

  if (titleInput) {
    titleInput.addEventListener("input", function () {
      const slug = generateSlug(this.value);
      if (slugDisplay) {
        slugDisplay.textContent = slug;
      }
    });
  }
});

// Character counter for textareas
function addCharacterCounter(textareaId, maxLength) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  const counter = document.createElement("small");
  counter.className = "character-counter";
  counter.style.color = "var(--text-secondary)";

  textarea.parentElement.appendChild(counter);

  function updateCounter() {
    const length = textarea.value.length;
    counter.textContent = `${length}${
      maxLength ? "/" + maxLength : ""
    } characters`;

    if (maxLength && length > maxLength) {
      counter.style.color = "var(--danger-color)";
    } else {
      counter.style.color = "var(--text-secondary)";
    }
  }

  textarea.addEventListener("input", updateCounter);
  updateCounter();
}

// Initialize character counters
document.addEventListener("DOMContentLoaded", function () {
  addCharacterCounter("description", 500);
  addCharacterCounter("shortDescription", 100);
});

// Price formatter
function formatPrice(input) {
  let value = input.value.replace(/[^0-9.]/g, "");
  const parts = value.split(".");

  if (parts.length > 2) {
    value = parts[0] + "." + parts.slice(1).join("");
  }

  if (parts[1] && parts[1].length > 2) {
    value = parts[0] + "." + parts[1].substring(0, 2);
  }

  input.value = value;
}

// Stock alert
function checkStockLevel(stockInput) {
  const stock = parseInt(stockInput.value);
  const warning = document.getElementById("stock-warning");

  if (stock < 10) {
    if (!warning) {
      const alert = document.createElement("small");
      alert.id = "stock-warning";
      alert.style.color = "var(--warning-color)";
      alert.textContent = "⚠️ Low stock level!";
      stockInput.parentElement.appendChild(alert);
    }
  } else {
    if (warning) {
      warning.remove();
    }
  }
}

// Initialize stock alerts
document.addEventListener("DOMContentLoaded", function () {
  const stockInput = document.getElementById("stock");
  if (stockInput) {
    stockInput.addEventListener("input", function () {
      checkStockLevel(this);
    });
    checkStockLevel(stockInput);
  }
});

// Copy to clipboard functionality
function copyToClipboard(text, buttonElement) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = "✓ Copied!";
      buttonElement.style.backgroundColor = "var(--success-color)";

      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.backgroundColor = "";
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
    });
}

// Dark mode toggle (optional enhancement)
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDark);
}

// Load dark mode preference
document.addEventListener("DOMContentLoaded", function () {
  const darkMode = localStorage.getItem("darkMode") === "true";
  if (darkMode) {
    document.body.classList.add("dark-mode");
  }
});

// Export data functionality
function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll("tr");

  rows.forEach((row) => {
    const cols = row.querySelectorAll("td, th");
    const rowData = [];

    cols.forEach((col) => {
      rowData.push('"' + col.textContent.replace(/"/g, '""') + '"');
    });

    csv.push(rowData.join(","));
  });

  // Download CSV
  const csvContent = csv.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

console.log("Tie-Style Admin JS loaded successfully!");
