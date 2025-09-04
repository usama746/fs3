// ===============================
// F&S Inventory Manager JS
// ===============================

// --- Config & Constants ---
const SUPABASE_URL = "https://kgghhqeascvwamueftcr.supabase.co";
const SUPABASE_ANON_KEY =
   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZ2hocWVhc2N2d2FtdWVmdGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTIyNDIsImV4cCI6MjA2OTA4ODI0Mn0.1xfneEDdl6OIq7567AZ70ABBkUiBlAeaL1yU21pnCTk";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- Supabase Client ---
let supabase;
let authListenerInitialized = false;

// Initialize Supabase client with error handling
function initializeSupabase() {
   try {
      if (
         typeof window.supabase !== "undefined" &&
         window.supabase.createClient
      ) {
         supabase = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            {
               auth: {
                  persistSession: true,
                  autoRefreshToken: true,
                  detectSessionInUrl: true,
               },
            },
         );

         if (!authListenerInitialized && supabase?.auth?.onAuthStateChange) {
            supabase.auth.onAuthStateChange(async (_event, session) => {
               isAdmin = !!session;
               updateAuthBtn();
               try {
                  await loadDataFromSupabase();
               } catch (_) {
                  // ignore, handled inside loader
               }
            });
            authListenerInitialized = true;
         }
         return true;
      } else {
         return false;
      }
   } catch (error) {
      return false;
   }
}

// Attempt to wake a paused free-tier Supabase project with retries
async function wakeSupabase(maxRetries = 3) {
   try {
      if (!supabase) {
         if (!initializeSupabase()) return false;
      }
      let attempt = 0;
      while (attempt <= maxRetries) {
         const { error } = await supabase
            .from("categories")
            .select("id")
            .limit(1);
         if (!error) return true;
         // Only retry if likely a transient/unpaused state
         const message = (error?.message || "").toLowerCase();
         const shouldRetry =
            navigator.onLine &&
            (message.includes("fetch") ||
               message.includes("timeout") ||
               message.includes("503") ||
               message.includes("connection"));
         if (!shouldRetry) return false;
         const backoffMs = Math.min(1500 * Math.pow(2, attempt), 6000);
         await new Promise((res) => setTimeout(res, backoffMs));
         attempt++;
      }
      return false;
   } catch (_) {
      return false;
   }
}

// --- DOM Elements Cache ---
const DOM = {
   signinModal: null,
   signinSubmit: null,
   signinCancel: null,
   mainTitle: null,
   backBtn: null,
   mainContent: null,
   modalOverlay: null,
   modalTitle: null,
   modalMessage: null,
   modalCancel: null,
   modalConfirm: null,
   toast: null,
   signinUsername: null,
   signinPassword: null,
   burgerMenuBtn: null,
   mobileMenuOverlay: null,
   mobileMenuClose: null,
   mobileThemeToggle: null,
   mobileRefreshBtn: null,
   mobileAuthBtn: null,
};

// Cache DOM elements
function cacheDOMElements() {
   Object.keys(DOM).forEach((key) => {
      DOM[key] = document.getElementById(key);
   });
}

// --- State Variables ---
let categories = [];
let items = [];
let currentView = "categories";
let selectedCategory = null;
let editingItemId = null;
let isAdmin = false;
let modalCallback = null;
let itemPriceVisibility = {}; // Track price visibility per item

// --- Utility Functions ---
function showToast(msg, type = "error") {
   if (!DOM.toast) return;
   DOM.toast.textContent = msg;
   DOM.toast.className = `toast${type === "success" ? " success" : ""}`;
   DOM.toast.classList.remove("hidden");
   setTimeout(() => DOM.toast.classList.add("hidden"), 2200);
}

function showModal(title, message, onConfirm) {
   if (!DOM.modalTitle || !DOM.modalMessage || !DOM.modalOverlay) return;
   DOM.modalTitle.textContent = title;
   DOM.modalMessage.textContent = message;
   DOM.modalOverlay.classList.remove("hidden");
   modalCallback = onConfirm;
}

function hideModal() {
   if (!DOM.modalOverlay) return;
   DOM.modalOverlay.classList.add("hidden");
   modalCallback = null;
}

// Simple UUID generator that works on all browsers
function generateUUID() {
   return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
   });
}

function updateAuthBtn() {
   const authText = isAdmin ? "Sign Out" : "Sign In";
   if (DOM.mobileAuthBtn) {
      const span = DOM.mobileAuthBtn.querySelector("span:last-child");
      if (span) span.textContent = authText;
   }

   const header = document.querySelector(".header");
   if (!header) return;

   header.querySelector(".mode-indicator")?.remove();
   if (!isAdmin) {
      const indicator = document.createElement("div");
      indicator.className = "mode-indicator";
      indicator.innerHTML = '<span class="mode-badge">👁️ View Only</span>';
      header.appendChild(indicator);
   }
}

// Mobile menu functions
function openMobileMenu() {
   if (!DOM.mobileMenuOverlay) return;
   DOM.mobileMenuOverlay.classList.remove("hidden");
   document.body.style.overflow = "hidden";
}

function closeMobileMenu() {
   if (!DOM.mobileMenuOverlay) return;
   DOM.mobileMenuOverlay.classList.add("hidden");
   document.body.style.overflow = "";
}

// --- Event Listeners ---
function setupEventListeners() {
   DOM.modalConfirm?.addEventListener("click", function () {
      if (modalCallback) modalCallback();
      hideModal();
   });

   DOM.modalCancel?.addEventListener("click", hideModal);

   DOM.backBtn?.addEventListener("click", () => {
      currentView = "categories";
      selectedCategory = null;
      editingItemId = null;
      render();
   });

   // Authentication event listeners
   DOM.mobileAuthBtn?.addEventListener("click", handleAuthClick);

   DOM.signinSubmit?.addEventListener("click", window.handleSignin);
   DOM.signinCancel?.addEventListener("click", () => {
      if (DOM.signinModal) DOM.signinModal.classList.add("hidden");
   });

   DOM.signinPassword?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSignin();
   });

   // Password toggle functionality
   const passwordToggle = document.getElementById("passwordToggle");
   const signinPassword = document.getElementById("signinPassword");

   passwordToggle?.addEventListener("click", () => {
      if (signinPassword.type === "password") {
         signinPassword.type = "text";
         passwordToggle.textContent = "🙈";
      } else {
         signinPassword.type = "password";
         passwordToggle.textContent = "👁️";
      }
   });

   // Theme toggle event listeners
   DOM.mobileThemeToggle?.addEventListener("click", () => {
      closeMobileMenu();
      toggleTheme();
   });

   // Refresh button event listeners
   DOM.mobileRefreshBtn?.addEventListener("click", () => {
      closeMobileMenu();
      handleRefresh();
   });

   // Mobile menu event listeners
   DOM.burgerMenuBtn?.addEventListener("click", openMobileMenu);
   DOM.mobileMenuClose?.addEventListener("click", closeMobileMenu);

   // Close mobile menu when clicking outside
   DOM.mobileMenuOverlay?.addEventListener("click", (e) => {
      if (e.target === DOM.mobileMenuOverlay) {
         closeMobileMenu();
      }
   });

   // Close mobile menu on escape key
   document.addEventListener("keydown", (e) => {
      if (
         e.key === "Escape" &&
         DOM.mobileMenuOverlay &&
         !DOM.mobileMenuOverlay.classList.contains("hidden")
      ) {
         closeMobileMenu();
      }
   });
}

// Event handler functions
async function handleAuthClick() {
   if (isAdmin) {
      try {
         await supabase.auth.signOut();
         isAdmin = false;
         updateAuthBtn();
         showToast("Signed out - Now in view-only mode", "success");
         await loadDataFromSupabase();
      } catch (error) {
         showToast("Sign out failed", "error");
      }
   } else {
      if (DOM.signinModal) DOM.signinModal.classList.remove("hidden");
   }

   // Close mobile menu after auth action
   closeMobileMenu();
}

function toggleTheme() {
   document.body.classList.toggle("dark-mode");
   localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode"),
   );
}

function handleRefresh() {
   showToast("Refreshing app...", "success");
   setTimeout(() => {
      window.location.reload();
   }, 500);
}

// --- Data Persistence Functions ---
async function ensureUserExists() {
   try {
      if (!supabase) {
         if (!initializeSupabase()) {
            throw new Error("Supabase client not available");
         }
      }

      const {
         data: { user },
         error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
         showToast("Please sign in to use this feature", "error");
         return null;
      }

      const { data: existingUser, error: checkError } = await supabase
         .from("users")
         .select("id, email")
         .eq("id", user.id)
         .single();

      if (checkError) {
         if (checkError.code === "PGRST116") {
            const { error: insertError } = await supabase.from("users").insert({
               id: user.id,
               email: user.email,
               created_at: new Date().toISOString(),
            });

            if (insertError) {
               showToast(
                  "Failed to create user profile: " + insertError.message,
                  "error",
               );
               return null;
            }
         } else {
            return null;
         }
      }

      return user.id;
   } catch (error) {
      showToast("Authentication error: " + error.message, "error");
      return null;
   }
}

async function loadDataFromSupabase() {
   try {
      if (!supabase) {
         if (!initializeSupabase()) {
            throw new Error("Supabase client not available");
         }
      }

      // Attempt to wake the database in case the project is paused
      if (navigator.onLine) {
         await wakeSupabase(2);
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      let categoriesData, itemsData;

      if (user) {
         const [cats, itemsResp] = await Promise.all([
            supabase
               .from("categories")
               .select("*")
               .eq("user_id", user.id)
               .order("name"),
            supabase
               .from("items")
               .select("*")
               .eq("user_id", user.id)
               .order("name"),
         ]);
         if (cats.error) throw cats.error;
         if (itemsResp.error) throw itemsResp.error;
         categoriesData = cats.data;
         itemsData = itemsResp.data;
      } else {
         const [cats, itemsResp] = await Promise.all([
            supabase.from("categories").select("*").order("name"),
            supabase.from("items").select("*").order("name"),
         ]);
         if (cats.error) throw cats.error;
         if (itemsResp.error) throw itemsResp.error;
         categoriesData = cats.data;
         itemsData = itemsResp.data;
      }

      categories = (categoriesData || []).map((cat) => ({
         id: cat.id,
         user_id: cat.user_id,
         name: cat.name,
         created_at: cat.created_at,
      }));

      items = (itemsData || []).map((item) => ({
         id: item.id,
         user_id: item.user_id,
         category_id: item.category_id,
         name: item.name,
         quantity: item.quantity ?? 0,
         created_at: item.created_at,
         variants: item.variants || [],
      }));

      render();
   } catch (error) {
      // Retry once after trying to wake the project
      try {
         if (navigator.onLine) {
            const woke = await wakeSupabase(2);
            if (woke) {
               const {
                  data: { user },
               } = await supabase.auth.getUser();
               // Re-run the read after wake
               let categoriesData, itemsData;
               if (user) {
                  const [cats, itemsResp] = await Promise.all([
                     supabase
                        .from("categories")
                        .select("*")
                        .eq("user_id", user.id)
                        .order("name"),
                     supabase
                        .from("items")
                        .select("*")
                        .eq("user_id", user.id)
                        .order("name"),
                  ]);
                  categoriesData = cats.data;
                  itemsData = itemsResp.data;
               } else {
                  const [cats, itemsResp] = await Promise.all([
                     supabase.from("categories").select("*").order("name"),
                     supabase.from("items").select("*").order("name"),
                  ]);
                  categoriesData = cats.data;
                  itemsData = itemsResp.data;
               }
               categories = (categoriesData || []).map((cat) => ({
                  id: cat.id,
                  user_id: cat.user_id,
                  name: cat.name,
                  created_at: cat.created_at,
               }));
               items = (itemsData || []).map((item) => ({
                  id: item.id,
                  user_id: item.user_id,
                  category_id: item.category_id,
                  name: item.name,
                  quantity: item.quantity ?? 0,
                  created_at: item.created_at,
                  variants: item.variants || [],
               }));
               render();
               return;
            }
         }
      } catch (_) {
         // fallthrough to offline/cached path
      }

      if (!isAdmin) {
         loadDataFromLocalStorage();
         showToast("Using cached data (database connection issue)", "error");
      } else {
         showToast(
            "Failed to load data from database: " + (error.message || error),
            "error",
         );
      }
   }
}

async function saveDataToSupabase() {
   if (!isAdmin)
      return Promise.resolve({ success: false, message: "Not admin" });

   try {
      if (!supabase) {
         if (!initializeSupabase()) {
            throw new Error("Supabase client not available");
         }
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();
      let userId = null;

      if (user) {
         userId = await ensureUserExists();
         if (!userId) {
            showToast("User not authenticated", "error");
            return Promise.resolve({
               success: false,
               message: "User not authenticated",
            });
         }
      } else {
         saveDataToLocalStorage();
         return Promise.resolve({
            success: true,
            message: "Saved to localStorage",
         });
      }

      const { data: existingCategories, error: catFetchError } = await supabase
         .from("categories")
         .select("id")
         .eq("user_id", userId);

      if (catFetchError) throw catFetchError;

      const { data: existingItems, error: itemFetchError } = await supabase
         .from("items")
         .select("id")
         .eq("user_id", userId);

      if (itemFetchError) throw itemFetchError;

      const localCategoryIds = categories.map((cat) => cat.id);
      const categoriesToDelete =
         existingCategories
            ?.filter((dbCat) => !localCategoryIds.includes(dbCat.id))
            .map((cat) => cat.id) || [];

      const localItemIds = items.map((item) => item.id);
      const itemsToDelete =
         existingItems
            ?.filter((dbItem) => !localItemIds.includes(dbItem.id))
            .map((item) => item.id) || [];

      if (categoriesToDelete.length > 0) {
         const { error: deleteCatError } = await supabase
            .from("categories")
            .delete()
            .in("id", categoriesToDelete);

         if (deleteCatError) throw deleteCatError;
      }

      if (itemsToDelete.length > 0) {
         const { error: deleteItemError } = await supabase
            .from("items")
            .delete()
            .in("id", itemsToDelete);

         if (deleteItemError) throw deleteItemError;
      }

      const categoriesForDB = categories.map((cat) => ({
         id: cat.id || generateUUID(),
         user_id: userId,
         name: cat.name,
      }));

      let catResult = [];
      if (categoriesForDB.length > 0) {
         const { data: catData, error: categoriesError } = await supabase
            .from("categories")
            .upsert(categoriesForDB, { onConflict: "id" })
            .select();

         if (categoriesError) throw categoriesError;
         catResult = catData || [];
      }

      const itemsForDB = items.map((item) => ({
         id: item.id || generateUUID(),
         user_id: userId,
         category_id: item.category_id,
         name: item.name,
         quantity: item.quantity ?? 0,
         variants: item.variants || [],
      }));

      let itemResult = [];
      if (itemsForDB.length > 0) {
         const { data: itemData, error: itemsError } = await supabase
            .from("items")
            .upsert(itemsForDB, { onConflict: "id" })
            .select();

         if (itemsError) throw itemsError;
         itemResult = itemData || [];
      }

      saveDataToLocalStorage();
      return { success: true, categories: catResult, items: itemResult };
   } catch (error) {
      showToast(
         "Failed to save data to database: " + (error.message || error),
         "error",
      );
      throw error;
   }
}

function loadDataFromLocalStorage() {
   try {
      categories = JSON.parse(localStorage.getItem("stockpile-cats") || "[]");
      items = JSON.parse(localStorage.getItem("stockpile-items") || "[]");
      render();
   } catch (error) {
      categories = items = [];
      showToast("Failed to load saved data. Starting fresh.", "error");
   }
}

function saveDataToLocalStorage() {
   try {
      localStorage.setItem("stockpile-cats", JSON.stringify(categories));
      localStorage.setItem("stockpile-items", JSON.stringify(items));
   } catch (error) {
      showToast("Failed to save data. Please try again.", "error");
   }
}

async function saveData() {
   try {
      if (isAdmin) {
         const result = await saveDataToSupabase();
         return result;
      } else {
         saveDataToLocalStorage();
         return Promise.resolve({
            success: true,
            message: "Saved to localStorage",
         });
      }
   } catch (error) {
      throw error;
   }
}

// --- PWA Service Worker Registration ---
if ("serviceWorker" in navigator) {
   window.addEventListener("load", () => {
      navigator.serviceWorker
         .register("./sw.js", { scope: "./" })
         .then((registration) => {
            // Check if there's an update available
            registration.addEventListener("updatefound", () => {
               const newWorker = registration.installing;
               newWorker.addEventListener("statechange", () => {
                  if (
                     newWorker.state === "installed" &&
                     navigator.serviceWorker.controller
                  ) {
                     showToast(
                        "App update available! Refresh to update.",
                        "success",
                     );
                  }
               });
            });

            // Force activation if needed
            if (registration.waiting) {
               registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
         })
         .catch((registrationError) => {
            // Don't show error to user as it's not critical for basic functionality
         });
   });
} else {
   // Service Worker not supported in this browser
   // This is expected for some browsers, no need to show error to user
}

// --- PWA Standalone Mode Detection ---
function isStandalone() {
   const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      window.location.search.includes("standalone=true") ||
      document.referrer.includes("android-app://");
   return isStandaloneMode;
}

// Handle standalone mode
if (isStandalone()) {
   // Add standalone-specific styles or behaviors
   document.body.classList.add("standalone-mode");

   // iOS standalone mode optimizations
   if (
      navigator.userAgent.includes("iPhone") ||
      navigator.userAgent.includes("iPad")
   ) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
         viewport.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, user-scalable=yes",
         );
      }
   }

   // Android Chrome specific optimizations
   if (
      navigator.userAgent.includes("Android") &&
      navigator.userAgent.includes("Chrome")
   ) {
      // Add Android-specific optimizations
      document.body.classList.add("android-standalone");
   }
}

// Show refresh button in standalone mode or when offline
function updateRefreshButtonVisibility() {
   const refreshBtn = DOM.mobileRefreshBtn;
   if (refreshBtn) {
      refreshBtn.style.display = "flex";
   }
}

// --- PWA Lifecycle & Offline Support ---
window.addEventListener("online", () => {
   showToast("You're back online!", "success");
   updateRefreshButtonVisibility();
});

window.addEventListener("offline", () => {
   showToast("You're offline. Some features may be limited.", "error");
   updateRefreshButtonVisibility();
});

// PWA version tracking
const APP_VERSION = "1.0.0";
localStorage.setItem("app_version", APP_VERSION);

// PWA lifecycle events
window.addEventListener("appinstalled", () => {
   // Show success message
   showToast(
      "App installed successfully! You can now access it from your home screen.",
      "success",
   );
});

// --- App Initialization ---
window.addEventListener("DOMContentLoaded", () => {
   // Load saved theme
   if (
      localStorage.getItem("darkMode") === "true" ||
      localStorage.getItem("darkMode") === "1"
   ) {
      document.body.classList.add("dark-mode");
   }

   // Cache DOM elements after DOM is loaded
   cacheDOMElements();
   setupEventListeners();
   updateAuthBtn();
   updateRefreshButtonVisibility();

   // Initialize with a small delay to ensure Supabase library is loaded
   setTimeout(() => {
      checkSession();
   }, 100);
});

// --- Session Check ---
async function checkSession() {
   try {
      if (!supabase) {
         if (!initializeSupabase()) {
            setTimeout(() => {
               if (!supabase && initializeSupabase()) {
                  checkSession();
               } else {
                  isAdmin = false;
                  updateAuthBtn();
                  loadDataFromLocalStorage();
               }
            }, 500);
            return;
         }
      }

      // Wake project before session check in case of cold start
      if (navigator.onLine) {
         await wakeSupabase(1);
      }

      const {
         data: { session },
         error,
      } = await supabase.auth.getSession();
      if (error) throw error;

      if (session) {
         isAdmin = true;
         updateAuthBtn();
         try {
            await loadDataFromSupabase();
         } catch (_) {
            if (navigator.onLine) {
               await wakeSupabase(2);
               await loadDataFromSupabase();
            }
         }
      } else {
         isAdmin = false;
         updateAuthBtn();
         try {
            await loadDataFromSupabase();
         } catch (_) {
            if (navigator.onLine) {
               await wakeSupabase(2);
               await loadDataFromSupabase();
            }
         }
      }
   } catch (error) {
      isAdmin = false;
      updateAuthBtn();
      loadDataFromLocalStorage();
   }
}

// --- Rendering & UI Logic ---
function render() {
   updateAuthBtn();
   if (currentView === "categories") {
      if (DOM.mainTitle) {
         DOM.mainTitle.textContent = "FAYYAZ & SONS";
         DOM.mainTitle.classList.remove("category-title", "center");
      }
   } else {
      if (DOM.mainTitle) {
         DOM.mainTitle.textContent = selectedCategory
            ? selectedCategory.name
            : "";
         DOM.mainTitle.classList.add("category-title", "center");
      }
   }

   if (DOM.backBtn)
      DOM.backBtn.classList.toggle("hidden", currentView === "categories");

   if (DOM.mainContent) {
      DOM.mainContent.innerHTML = "";
      if (currentView === "categories") {
         renderCategoriesView();
      } else {
         renderItemsView();
      }
   }
}

function createCard(innerHTML) {
   const card = document.createElement("div");
   card.className = "card";
   card.innerHTML = innerHTML;
   return card;
}

function createEmptyState(message, subMessage) {
   const empty = document.createElement("div");
   empty.className = "card card-content text-center";
   empty.innerHTML = `<p>${message}</p><p class="text-muted">${subMessage}</p>`;
   return empty;
}

function renderCategoriesView() {
   if (isAdmin && DOM.mainContent) {
      const addCategoryCard = createCard(`
         <div class="card-content">
            <input id="new-cat-input" type="text" placeholder="New Category..." onkeydown="if(event.key==='Enter') window.addCategory()">
            <button id="add-cat-btn" class="btn btn-primary" onclick="window.addCategory()" data-action="add-category">Add Category</button>
         </div>
      `);
      addCategoryCard.classList.add("add-category-card");
      DOM.mainContent.appendChild(addCategoryCard);
   }

   if (categories.length > 0 && DOM.mainContent) {
      const ul = document.createElement("ul");
      ul.className = "categories-list";
      categories.forEach((cat) => {
         const li = document.createElement("li");
         li.style.marginBottom = "24px";

         // Create card container
         const card = document.createElement("div");
         card.className = "card";

         // Create header
         const header = document.createElement("div");
         header.className = `item-header${isAdmin ? "" : " center"}`;

         // Create clickable category name
         const categoryName = document.createElement("div");
         categoryName.className = "category-name-with-padding";
         categoryName.textContent = cat.name;
         categoryName.setAttribute("role", "button");
         categoryName.setAttribute("tabindex", "0");
         categoryName.setAttribute(
            "aria-label",
            `Select category: ${cat.name}`,
         );
         categoryName.addEventListener("click", () =>
            window.selectCategory(cat.id),
         );
         categoryName.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
               e.preventDefault();
               window.selectCategory(cat.id);
            }
         });

         header.appendChild(categoryName);

         // Create actions container
         if (isAdmin) {
            const actions = document.createElement("div");
            actions.className = "item-actions";

            // Edit button
            const editBtn = document.createElement("button");
            editBtn.className = "icon-btn edit-cat-btn";
            editBtn.title = "Edit";
            editBtn.setAttribute("aria-label", `Edit category: ${cat.name}`);
            editBtn.innerHTML =
               '<svg class="icon-svg" width="20" height="20"><use href="#icon-edit"></use></svg>';
            editBtn.addEventListener("click", () =>
               window.editCategory(cat.id),
            );

            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "icon-btn del-cat-btn btn-destructive-icon";
            deleteBtn.title = "Delete";
            deleteBtn.setAttribute(
               "aria-label",
               `Delete category: ${cat.name}`,
            );
            deleteBtn.innerHTML =
               '<svg class="icon-svg" width="20" height="20"><use href="#icon-delete"></use></svg>';
            deleteBtn.addEventListener("click", () =>
               window.deleteCategory(cat.id, cat.name),
            );

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            header.appendChild(actions);
         }

         card.appendChild(header);
         li.appendChild(card);
         ul.appendChild(li);
      });
      DOM.mainContent.appendChild(ul);
   } else if (DOM.mainContent) {
      const message = isAdmin
         ? "No categories yet."
         : "No categories available for viewing.";
      const subMessage = isAdmin
         ? "Add one above to get started!"
         : "Sign in to add categories and items.";
      DOM.mainContent.appendChild(createEmptyState(message, subMessage));
   }
}

function startEditCategory(catId) {
   if (!isAdmin) return;
   render();
   const ul = DOM.mainContent?.querySelector("ul");
   if (!ul) return;
   const idx = categories.findIndex((c) => c.id === catId);
   const li = ul.children[idx];
   const cat = categories[idx];
   li.innerHTML = `
    <div class="card">
      <div class="item-header">
        <input id="edit-cat-input" type="text" value="${cat.name}">
        <div class="item-actions">
                      <button class="icon-btn save-edit-cat-btn btn-success-icon" title="Save" aria-label="Save category">
               <svg class="icon-svg" width="20" height="20"><use href="#icon-save"></use></svg>
            </button>
                      <button class="icon-btn cancel-edit-cat-btn btn-cancel-icon" title="Cancel" aria-label="Cancel edit">
               <svg class="icon-svg" width="20" height="20"><use href="#icon-cancel"></use></svg>
            </button>
        </div>
      </div>
    </div>
  `;
   const input = li.querySelector("#edit-cat-input");
   const saveBtn = li.querySelector(".save-edit-cat-btn");
   const cancelBtn = li.querySelector(".cancel-edit-cat-btn");
   input.focus();
   saveBtn.onclick = () => {
      const newName = input.value.trim();
      if (!newName) return showToast("Category name cannot be empty.");
      categories[idx].name = newName;
      saveData();
      render();
      showToast("Category updated!", "success");
   };
   cancelBtn.onclick = render;
   input.onkeydown = (e) => {
      if (e.key === "Enter") saveBtn.onclick();
      if (e.key === "Escape") cancelBtn.onclick();
   };
}

function renderItemsView() {
   if (isAdmin && DOM.mainContent) {
      const card = createCard(`
      <div class="card-content" data-item-id="${selectedCategory?.id || ""}">
        <input id="new-item-input" type="text" placeholder="New Item...">
        <button id="add-item-btn" class="btn btn-primary">Add Item</button>
      </div>
    `);
      DOM.mainContent.appendChild(card);
   }

   const categoryItems = items.filter(
      (i) => i.category_id === selectedCategory.id,
   );

   if (categoryItems.length > 0 && DOM.mainContent) {
      categoryItems.forEach((item) => {
         renderItemCard(item);
      });
   } else if (DOM.mainContent) {
      const message = `No items found in "${selectedCategory.name}".`;
      const subMessage = isAdmin
         ? "Add a new item type above to get started."
         : "Sign in to add items to this category.";

      DOM.mainContent.appendChild(createEmptyState(message, subMessage));
   }

   if (isAdmin && DOM.mainContent) {
      const newItemInput = DOM.mainContent.querySelector("#new-item-input");
      const addItemBtn = DOM.mainContent.querySelector("#add-item-btn");

      if (newItemInput && addItemBtn) {
         const handleAddItem = async () => {
            const name = newItemInput.value.trim();
            if (!name) return showToast("Item name cannot be empty.");
            if (
               categoryItems.some(
                  (i) => i.name.toLowerCase() === name.toLowerCase(),
               )
            )
               return showToast("Item with this name already exists.");

            items.push({
               id: generateUUID(),
               name,
               category_id: selectedCategory.id,
               quantity: 0,
               variants: [],
            });
            await saveData();
            newItemInput.value = "";
            render();
            showToast("Item added!", "success");
         };

         addItemBtn.onclick = handleAddItem;
         newItemInput.onkeydown = (e) => {
            if (e.key === "Enter") handleAddItem();
         };
      }
   }
}

function startEditItem(itemId) {
   if (!isAdmin) return;
   editingItemId = itemId;
   render();
}

function createActionButton({
   className,
   title,
   ariaLabel,
   iconClass,
   svgIcon,
   onClick,
}) {
   const btn = document.createElement("button");
   btn.className = className;
   btn.title = title;
   btn.setAttribute("aria-label", ariaLabel);
   if (svgIcon) {
      btn.innerHTML = `<svg class="icon-svg" width="20" height="20"><use href="#${svgIcon}"></use></svg>`;
   } else if (iconClass) {
      btn.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;
   }

   btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
   });

   return btn;
}

function createItemActions({ onEdit, onDelete, editTitle, deleteTitle }) {
   if (!isAdmin) return document.createElement("div");
   const actions = document.createElement("div");
   actions.className = "item-actions";
   actions.appendChild(
      createActionButton({
         className: "icon-btn edit-item-btn",
         title: editTitle,
         ariaLabel: editTitle,
         svgIcon: "icon-edit",
         onClick: onEdit,
      }),
   );
   actions.appendChild(
      createActionButton({
         className: "icon-btn del-item-btn btn-destructive-icon",
         title: deleteTitle,
         ariaLabel: deleteTitle,
         svgIcon: "icon-delete",
         onClick: onDelete,
      }),
   );
   return actions;
}

function createSaveCancelActions({ onSave, onCancel, saveTitle, cancelTitle }) {
   if (!isAdmin) return document.createElement("div");
   const actions = document.createElement("div");
   actions.className = "item-actions";
   actions.appendChild(
      createActionButton({
         className: "icon-btn save-edit-item-btn btn-success-icon",
         title: saveTitle,
         ariaLabel: saveTitle,
         svgIcon: "icon-save",
         onClick: onSave,
      }),
   );
   actions.appendChild(
      createActionButton({
         className: "icon-btn cancel-edit-item-btn btn-cancel-icon",
         title: cancelTitle,
         ariaLabel: cancelTitle,
         svgIcon: "icon-cancel",
         onClick: onCancel,
      }),
   );
   return actions;
}

function createVariantActions({ onDelete, deleteTitle }) {
   if (!isAdmin) return document.createElement("div");
   const actions = document.createElement("div");
   actions.className = "item-actions";
   actions.appendChild(
      createActionButton({
         className: "icon-btn del-variant-btn btn-destructive-icon",
         title: deleteTitle,
         ariaLabel: deleteTitle,
         svgIcon: "icon-delete",
         onClick: onDelete,
      }),
   );
   return actions;
}

function renderItemCard(item) {
   const isItemEditing = editingItemId === item.id;
   const card = document.createElement("div");
   card.className = "card";
   card.setAttribute("data-item-id", item.id);
   const header = document.createElement("div");
   header.className = "item-header" + (isAdmin ? "" : " center");
   if (isItemEditing) {
      header.innerHTML = `<input id="edit-item-input" type="text" value="${item.name}">`;
      const input = header.querySelector("#edit-item-input");
      const save = async () => {
         const newName = input.value.trim();
         if (!newName) return showToast("Item name cannot be empty.");
         item.name = newName;
         editingItemId = null;
         await saveData();
         render();
         showToast("Item updated!", "success");
      };
      const cancel = () => {
         editingItemId = null;
         render();
      };
      header.appendChild(
         createSaveCancelActions({
            onSave: save,
            onCancel: cancel,
            saveTitle: "Save item",
            cancelTitle: "Cancel edit",
         }),
      );
      input.focus();
      input.onkeydown = (e) => {
         if (e.key === "Enter") save();
         if (e.key === "Escape") cancel();
      };
   } else {
      header.innerHTML = `<div class="item-header-with-toggle">
        <div class="item-name-with-padding">${item.name}</div>
        <div class="toggle-button-container">
          ${
             !isAdmin
                ? `<button onclick="window.togglePriceVisibility('${
                     item.id
                  }')" class="price-toggle-btn" title="${
                     itemPriceVisibility[item.id] ? "Hide" : "Show"
                  } prices">${
                     itemPriceVisibility[item.id] ? "🙈 Hide" : "👁️ Show"
                  }</button>`
                : ""
          }
        </div>
      </div>`;
      header.appendChild(
         createItemActions({
            onEdit: () => startEditItem(item.id),
            onDelete: () => {
               showModal(
                  "Delete Item",
                  `This will permanently delete "${item.name}" and all its variants.`,
                  async () => {
                     card.remove();
                     items = items.filter((i) => i.id !== item.id);
                     try {
                        await saveData();
                        showToast("Item deleted", "success");
                     } catch (error) {
                        render();
                        showToast("Failed to delete item", "error");
                     }
                  },
               );
            },
            editTitle: "Edit item",
            deleteTitle: "Delete item",
         }),
      );
   }
   card.appendChild(header);
   const tableContainer = document.createElement("div");
   tableContainer.className = "table-container";
   const table = document.createElement("div");
   table.className = "table-wrapper";
   table.style.overflowX = "auto";
   table.innerHTML = `<table>
    <thead>
      <tr>
        <th class="variant-color-header">Variant / Color</th>
        <th>Qty</th>
        <th class="${
           !isAdmin && !itemPriceVisibility[item.id] ? "hidden" : ""
        }">Price</th>
        ${isItemEditing ? '<th class="actions-cell">Actions</th>' : ""}
      </tr>
    </thead>
    <tbody></tbody>
  </table>`;
   const tbody = table.querySelector("tbody");
   item.variants.forEach((variant) => {
      renderVariantRow(item, variant, tbody);
   });
   const tr = document.createElement("tr");
   if (isItemEditing) {
      tr.innerHTML = `<td colspan="4">
      <div class="add-variant-row-container">
        <button class="btn add-variant-btn w-100 add-variant-btn-light">
          <i class="fa-solid fa-circle-plus fa-xl" aria-hidden="true"></i> Add Variant
        </button>
      </div>
    </td>`;
      tr.querySelector("button").onclick = () => startAddVariant(item.id);
   }
   tbody.appendChild(tr);
   tableContainer.appendChild(table);
   card.appendChild(tableContainer);

   // Add overflow indicator for tables
   setTimeout(() => {
      const tableWrapper = card.querySelector(".table-wrapper");
      if (
         tableWrapper &&
         tableWrapper.scrollHeight > tableWrapper.clientHeight
      ) {
         tableWrapper.classList.add("has-overflow");
      }
   }, 100);

   if (DOM.mainContent) DOM.mainContent.appendChild(card);
}

function renderVariantRow(item, variant, tbody) {
   const tr = document.createElement("tr");
   const isItemEditing = editingItemId === item.id;
   if (isItemEditing && isAdmin) {
      tr.innerHTML = `<td class="variant-color-cell">
        <input id="edit-variant-color-${variant.id}" type="text" value="${variant.color}" class="variant-color-input">
      </td>
      <td>
        <input id="edit-variant-qty-${variant.id}" type="number" min="0" value="${variant.qty}" class="quantity-input">
      </td>
      <td>
        <input id="edit-variant-price-${variant.id}" type="number" min="0" value="${variant.price}" class="price-input">
      </td>
      <td class="actions-cell">
        <div class="action-button-container"></div>
      </td>`;
      const colorInput = tr.querySelector(`#edit-variant-color-${variant.id}`);
      const priceInput = tr.querySelector(`#edit-variant-price-${variant.id}`);
      const qtyInput = tr.querySelector(`#edit-variant-qty-${variant.id}`);
      const actionsTd = tr.querySelector("td:last-child > div");
      actionsTd.appendChild(
         createVariantActions({
            onDelete: () => {
               showModal(
                  "Delete Variant",
                  `This will permanently delete the variant (Color: ${variant.color}).`,
                  async () => {
                     tr.remove();
                     item.variants = item.variants.filter(
                        (v) => v.id !== variant.id,
                     );
                     try {
                        await saveData();
                        showToast("Variant deleted", "success");
                     } catch (error) {
                        render();
                        showToast("Failed to delete variant", "error");
                     }
                  },
               );
            },
            deleteTitle: "Delete variant",
         }),
      );
      const autoSave = () => {
         const color = colorInput.value.trim();
         const price = parseFloat(priceInput.value) || 0;
         const qty = parseInt(qtyInput.value) || 0;
         if (color && price >= 0 && qty >= 0) {
            variant.color = color;
            variant.price = price;
            variant.qty = qty;
            saveData();
         }
      };
      colorInput.oninput = autoSave;
      priceInput.oninput = autoSave;
      qtyInput.oninput = autoSave;
      const handleKeydown = (e) => {
         if (e.key === "Escape") {
            editingItemId = null;
            render();
         }
      };
      colorInput.onkeydown = handleKeydown;
      priceInput.onkeydown = handleKeydown;
      qtyInput.onkeydown = handleKeydown;
   } else {
      tr.innerHTML = `<td class="variant-color-cell">${variant.color}</td>
      <td class="quantity-cell">${variant.qty}</td>
      <td class="price-cell ${
         !isAdmin && !itemPriceVisibility[item.id] ? "hidden" : ""
      }">${formatPrice(variant.price)}</td>`;
   }
   tbody.appendChild(tr);
}

function startAddVariant(itemId) {
   if (!isAdmin) return;
   render();
   const item = items.find((i) => i.id === itemId);
   if (!item) return;
   const targetCard = DOM.mainContent?.querySelector(
      `.card[data-item-id="${item.id}"]`
   );
   if (!targetCard) return;
   const table = targetCard.querySelector("table");
   const tbody = table.querySelector("tbody");
   const addVariantRow = tbody.querySelector("tr:last-child");
   if (addVariantRow) {
      addVariantRow.innerHTML = `<td class="variant-color-cell">
        <input id="new-variant-color" type="text" placeholder="Color" class="variant-color-input">
      </td>
      <td>
        <input id="new-variant-qty" type="number" min="0" placeholder="Qty" class="quantity-input">
      </td>
      <td>
        <input id="new-variant-price" type="number" min="0" placeholder="Price" class="price-input">
      </td>
      <td class="actions-cell">
        <div class="action-button-container">
          <div class="item-actions">
                        <button class="icon-btn save-variant-btn btn-success-icon" title="Add variant" aria-label="Add variant">
               <svg class="icon-svg" width="20" height="20"><use href="#icon-save"></use></svg>
            </button>
                          <button class="icon-btn cancel-variant-btn btn-cancel-icon" title="Cancel" aria-label="Cancel">
                 <svg class="icon-svg" width="20" height="20"><use href="#icon-cancel"></use></svg>
              </button>
          </div>
        </div>
      </td>`;
   }
   const colorInput = addVariantRow.querySelector("#new-variant-color");
   const priceInput = addVariantRow.querySelector("#new-variant-price");
   const qtyInput = addVariantRow.querySelector("#new-variant-qty");
   const saveBtn = addVariantRow.querySelector(".save-variant-btn");
   const cancelBtn = addVariantRow.querySelector(".cancel-variant-btn");
   colorInput.focus();
   saveBtn.onclick = async () => {
      const color = colorInput.value.trim();
      const price = parseFloat(priceInput.value) || 0;
      const qty = parseInt(qtyInput.value) || 0;
      if (!color || price < 0 || qty < 0) {
         return showToast("All variant fields are required.");
      }
      if (
         item.variants.some(
            (v) => v.color.toLowerCase() === color.toLowerCase(),
         )
      ) {
         return showToast("Variant with this color already exists.");
      }
      const newVariant = { id: generateUUID(), color, price, qty };
      item.variants.push(newVariant);

      await saveData();
      render();
      showToast("Variant added!", "success");
   };
   cancelBtn.onclick = () => {
      render();
   };
   colorInput.onkeydown =
      priceInput.onkeydown =
      qtyInput.onkeydown =
         (e) => {
            if (e.key === "Enter") saveBtn.onclick();
            if (e.key === "Escape") cancelBtn.onclick();
         };
}

function formatPrice(val) {
   if (val === undefined || val === null || val === "") {
      return "0";
   }
   const num = parseFloat(val);
   if (isNaN(num)) {
      return "0";
   }
   return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

// Define global functions for inline handlers
window.handleSignin = async () => {
   if (!DOM.signinUsername || !DOM.signinPassword) return;

   const email = DOM.signinUsername.value.trim();
   const password = DOM.signinPassword.value;

   if (!email) {
      showToast("Email is required");
      return;
   }
   if (!EMAIL_PATTERN.test(email)) {
      showToast("Please enter a valid email address");
      return;
   }
   if (!password) {
      showToast("Password is required");
      return;
   }

   try {
      const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password,
      });
      if (error) {
         if (error.message.includes("Invalid login credentials")) {
            showToast(
               "Invalid email or password. Please check your credentials.",
            );
         } else if (error.message.includes("Email not confirmed")) {
            showToast(
               "Please check your email and confirm your account before signing in.",
            );
         } else {
            showToast("Login failed: " + error.message);
         }
      } else {
         isAdmin = true;
         if (DOM.signinModal) DOM.signinModal.classList.add("hidden");
         updateAuthBtn();
         showToast("Signed in - Now in edit mode", "success");
         await loadDataFromSupabase();
      }
   } catch (error) {
      showToast("Login failed: " + (error.message || error));
   }

   // Close mobile menu after signin
   closeMobileMenu();
};

window.addCategory = async () => {
   const newCatInput = document.getElementById("new-cat-input");
   if (!newCatInput) {
      showToast("Input field not found", "error");
      return;
   }

   const name = newCatInput.value.trim();
   if (!name) {
      showToast("Category name cannot be empty.");
      return;
   }

   if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      showToast("Category with this name already exists.");
      return;
   }

   const newCategory = { id: generateUUID(), name };
   categories.push(newCategory);
   newCatInput.value = "";

   render();
   showToast("Category added!", "success");

   try {
      await saveData();
   } catch (error) {
      showToast("Failed to save category", "error");
   }
};

window.selectCategory = (catId) => {
   selectedCategory = categories.find((c) => c.id === catId);
   if (selectedCategory) {
      currentView = "items";
      render();
   }
};

window.editCategory = (catId) => {
   startEditCategory(catId);
};

window.deleteCategory = async (catId, name) => {
   showModal(
      "Delete Category",
      `This will permanently delete "${name}" and all its items.`,
      async () => {
         const li = document
            .querySelector(`[onclick*="${catId}"]`)
            ?.closest("li");
         if (li) li.remove();

         categories = categories.filter((c) => c.id !== catId);
         items = items.filter((i) => i.category_id !== catId);

         try {
            await saveData();
            showToast("Category deleted", "success");
         } catch (error) {
            render();
            showToast("Failed to delete category", "error");
         }
      },
   );
};

window.togglePriceVisibility = (itemId) => {
   itemPriceVisibility[itemId] = !itemPriceVisibility[itemId];
   render();
};
