// History data
    let history = [];
    let likes = [];
    let completedHistory = []; // [{date, internal, external}]
    let internalCardLocked = false;
    let externalCardLocked = false;
    let progress = {
        points: 0,
        streak: 0,
        lastDate: null,
        lastInternal: null,
        lastExternal: null
    };
    let rerollCount = 0;
    const maxRerollFree = 5;
    // Geliştirici premium test modu
const DEV_MODE = new URLSearchParams(window.location.search).get("devmode") === "verdeon";

const isPremium = DEV_MODE || false;

let internalDeviations = [];
let externalDeviations = [];
let lockedDeviations = [];

fetch("deviations.json")
  .then(response => response.json())
  .then(data => {
    lockedDeviations = data.locked;
  })
  .catch(error => {
    console.error("Veri yüklenirken hata oluştu:", error);
  });


    // DOM elements
    const mainView = document.getElementById('mainView');
    const historyView = document.getElementById('historyView');
    const favoritesView = document.getElementById('favoritesView');
    const settingsView = document.getElementById('settingsView');
    const internalDeviationEl = document.getElementById('internalDeviation');
    const externalDeviationEl = document.getElementById('externalDeviation');
    const externalSourceEl = document.getElementById('externalSource');
    const historyButton = document.getElementById('historyButton');
    const favoritessButton = document.getElementById('favoritesButton')
    const settingsButton = document.getElementById('settingsButton');
    const backFromHistory = document.getElementById('backFromHistory');
    const backFromFavorites = document.getElementById('backFromFavorites');
    const backFromSettings = document.getElementById('backFromSettings');
    const internalCard = document.getElementById('internalCard');
    const externalCard = document.getElementById('externalCard');
    const refreshButton = document.getElementById('refreshButton');
    const historyList = document.getElementById('historyList');
    const emptyHistoryState = document.getElementById('emptyHistoryState');
    const emptyFavoritesState = document.getElementById('emptyFavoritesState');
    const lightTheme = document.getElementById('lightTheme');
    const darkTheme = document.getElementById('darkTheme');
    const sepiaTheme = document.getElementById('sepiaTheme');
    const highContrastTheme = document.getElementById('highContrastTheme');
    const lavenderTheme = document.getElementById('lavenderTheme');
    const mintTheme = document.getElementById('mintTheme');
    const peachTheme = document.getElementById('peachTheme');
    const skyTheme = document.getElementById('skyTheme');
    const reminderToggle = document.getElementById('reminderToggle');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const confirmDialog = document.getElementById('confirmDialog');
    const cancelClearHistory = document.getElementById('cancelClearHistory');
    const confirmClearHistory = document.getElementById('confirmClearHistory');
    const internalLockButton = document.getElementById('internalLockButton');
    const externalLockButton = document.getElementById('externalLockButton');
    const body = document.body;
    

async function loadDeviations() {
    try {
        const response = await fetch('deviations.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        internalDeviations = data.internal;
        externalDeviations = data.external;
        console.log('Sapmalar başarıyla yüklendi:', { internalDeviations, externalDeviations });
    } catch (error) {
        console.error('Sapmalar yüklenirken bir hata oluştu:', error);
        // Hata durumunda varsayılan boş dizilerle devam edebiliriz
        internalDeviations = [];
        externalDeviations = [];
    }
}

    // Functions
    function showRandomDeviations() {
        // Get random deviations
        const randomInternalIndex = Math.floor(Math.random() * internalDeviations.length);
        const randomExternalIndex = Math.floor(Math.random() * externalDeviations.length);

        const internalDeviation = internalDeviations[randomInternalIndex];
        const externalDeviation = externalDeviations[randomExternalIndex];

        let updatedInternal = false;
        let updatedExternal = false;

        // Update the UI only if the cards are not locked
        if (!internalCardLocked) {
            internalDeviationEl.textContent = internalDeviation.text;
            updatedInternal = true;
        }
        if (!externalCardLocked) {
            externalDeviationEl.textContent = externalDeviation.text;
            externalSourceEl.textContent = externalDeviation.source;
            updatedExternal = true;
        }

        // Update history only if either card was updated
        if (updatedInternal || updatedExternal) {
            updateHistory();
        }

        updateExternalLockButtonText();
        updateInternalLockButtonText();
        updateRefreshButtonText();
        
        emptyFavoritesState.classList.remove('hidden');
        updateLikeButtons();
        updateProgressUI();

        // Son gösterilen sapmaları sakla
        localStorage.setItem('lastDeviation', JSON.stringify({
        internal: internalDeviationEl.textContent,
        external: externalDeviationEl.textContent,
        source: externalSourceEl.textContent
        }));
    }

function showLockedPrompt() {
    // Geliştirici premium test modu
const DEV_MODE = new URLSearchParams(window.location.search).get("devmode") === "verdeon";

const isPremium = DEV_MODE || false;

    const today = new Date().toLocaleDateString();
    const alreadyUsed = localStorage.getItem("lastLockedOpen") === today;

    if (!isPremium && alreadyUsed) {
        alert("Ücretsiz kullanıcılar bugün sadece 1 şifreli sapma açabilir. Premium ile sınırsız erişim sağlanır.");
        return;
    }

    const entered = prompt("🔐 Şifreli sapma için şifreyi gir:");
    if (!entered) return;

    const match = lockedDeviations.find(d => d.password === entered.trim());
    if (!match) {
        alert("❌ Geçersiz şifre!");
        return;
    }

    internalDeviationEl.textContent = match.internal;
    externalDeviationEl.textContent = match.external;
    externalSourceEl.textContent = match.source || "";

    updateHistory();
    updateLikeButtons();
    updateRerollUI();

    if (!isPremium) {
        localStorage.setItem("lastLockedOpen", today);
    }
}


    function setupDailyReminder() {
        const enabled = localStorage.getItem('reminders_enabled') === 'true';
        if (!enabled || Notification.permission !== 'granted') return;

        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 12 && now.getMinutes() === 0) {
                new Notification("🧠 Mikro Sapma", {
                    body: "Bugünün sapmasını gördün mü?",
                    icon: "/icon.png" // varsa ikonun yolu
                });
            }
        }, 60000); // her 1 dakikada kontrol
    }

    function toggleLock(cardType) {
        if (cardType === 'internal') {
            internalCardLocked = !internalCardLocked;
            internalCard.classList.toggle('locked');
        } else if (cardType === 'external') {
            externalCardLocked = !externalCardLocked;
            externalCard.classList.toggle('locked');
        }

        updateExternalLockButtonText();
        updateInternalLockButtonText();
        updateRefreshButtonText();
    }

    function updateInternalLockButtonText() {
        internalLockButton.textContent = internalCardLocked ? '🔒' : '🔓';
    }

    function updateExternalLockButtonText() {
        externalLockButton.textContent = externalCardLocked ? '🔒' : '🔓';
    }

    function loadRerollData() {
  const savedDate = localStorage.getItem("lastRerollDate");
  const today = new Date().toLocaleDateString();

  if (savedDate !== today) {
    rerollCount = 0;
    localStorage.setItem("lastRerollDate", today);
  } else {
    rerollCount = parseInt(localStorage.getItem("rerollCount")) || 0;
  }

  updateRerollUI();
}

function saveRerollData() {
  localStorage.setItem("rerollCount", rerollCount);
  localStorage.setItem("lastRerollDate", new Date().toLocaleDateString());
}

function handleReroll() {
  if (!isPremium && rerollCount >= maxRerollFree) {
    updateRerollUI(); // buton kilitli kalır
    return;
  }

  rerollCount++;
  saveRerollData();
  updateRerollUI();

  showRandomDeviations(); // 💥 hak azaldıktan sonra yeni sapma göster
}

function updateRerollUI() {
  const rerollDisplay = document.getElementById("rerollCounter");
  const refreshBtn = document.getElementById("refreshButton");

  if (rerollDisplay) {
    if (isPremium) {
      rerollDisplay.textContent = "♾️ Sınırsız";
    } else {
      rerollDisplay.textContent = `🔁 ${maxRerollFree - rerollCount} hakkın kaldı`;
    }
  }

  if (refreshBtn) {
    const disabled = !isPremium && rerollCount >= maxRerollFree;
    refreshBtn.disabled = disabled;
    refreshBtn.classList.toggle("opacity-50", disabled);
    refreshBtn.title = 'Bugünlük hakkın doldu'
  }
}

    function updateRefreshButtonText() {
        const refreshButton = document.getElementById('refreshButton');
        if (internalCardLocked && externalCardLocked) {
            refreshButton.innerHTML = `🔒İkisi de Kilitli`;
            refreshButton.disabled = true; // Butonu devre dışı bırak
        } else if (internalCardLocked && externalCardLocked==0) {
            refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>İçsel Kilitli`;
            refreshButton.disabled = false;
        } else if (internalCardLocked==0 && externalCardLocked) {
            refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>Dışsal Kilitli`;
            refreshButton.disabled = false;
        }
        else {
            refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>Yeni Sapma Göster`;
            refreshButton.disabled = false;
        }
    }

    function completeToday() {
        const today = new Date().toISOString().split('T')[0];

        const internal = internalDeviationEl.textContent;
        const external = externalDeviationEl.textContent;

        // Aynı gün ama farklı sapma mı? (Tamamlandı sanmasın)
        const alreadyDone =
            progress.lastDate === today &&
            progress.lastInternal === internal &&
            progress.lastExternal === external;

        if (alreadyDone) {
            alert("Bugünkü sapmayı zaten tamamladın 👏");
            return;
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        progress.streak = progress.lastDate === yesterday ? progress.streak + 1 : 1;
        progress.points += 1;
        progress.lastDate = today;
        progress.lastInternal = internal;
        progress.lastExternal = external;

        localStorage.setItem('progress', JSON.stringify(progress));
        updateProgressUI();

        // Tekrar tamamlandıysa ekleme
        const exists = completedHistory.some(
        item =>
            item.internal === progress.lastInternal &&
            item.external === progress.lastExternal
        );

        if (!exists) {
            completedHistory.push({
                date: progress.lastDate,
                internal: progress.lastInternal,
                external: progress.lastExternal
            });
            localStorage.setItem('completedHistory', JSON.stringify(completedHistory));
        }
        displayHistory(); // ✅ Tamamla butonuna basınca geçmiş anında güncellensin
    }

    function loadProgress() {
        const saved = localStorage.getItem('progress');
        progress = saved
            ? JSON.parse(saved)
            : {
                points: 0,
                streak: 0,
                lastDate: null,
                lastInternal: null,
                lastExternal: null
            };

        updateProgressUI();
    }

    function resetProgress() {
        progress = { points: 0, streak: 0, lastDate: null };
        localStorage.removeItem('progress');
        updateProgressUI();
    }

    function updateProgressUI() {
        const today = new Date().toISOString().split('T')[0];

        const internal = internalDeviationEl.textContent;
        const external = externalDeviationEl.textContent;

        const completed =
            progress.lastDate === today &&
            progress.lastInternal === internal &&
            progress.lastExternal === external;

        const btn = document.getElementById('completeButton');
        btn.disabled = completed;
        btn.textContent = completed ? '✅ Tamamlandı' : '✅ Tamamladım';

        document.getElementById('progressInfo').textContent =
            `🎯 Puan: ${progress.points} | 🔥 Seri: ${progress.streak}`;

        document.getElementById('badge').textContent =
            progress.streak >= 30 ? '🥇 Altın Seri!' :
            progress.streak >= 7  ? '🥈 Gümüş Seri!' :
            progress.streak >= 3  ? '🥉 Bronz Seri!' :
            '';
    }

    function loadCompletedHistory() {
        const saved = localStorage.getItem('completedHistory');
        completedHistory = saved ? JSON.parse(saved) : [];
    }

    function saveHistory() {
        localStorage.setItem('history', JSON.stringify(history));
    }

    function loadHistory() {
        const savedHistory = localStorage.getItem('history');
        history = savedHistory ? JSON.parse(savedHistory) : [];
    }

    function addHistoryEntry(internal, external, source) {
        const now = new Date();
        const date = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        history.push({ date, time, internal, external, source });
        saveHistory();
    }

    function clearHistory() {
        history = [];
        saveHistory();
        displayHistory();
        hideConfirmDialog();

        emptyHistoryState.classList.toggle('hidden', history.length !== 0);
    }

    function updateHistory() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
        });

        // Get current deviations
        const currentInternal = internalDeviationEl.textContent;
        const currentExternal = externalDeviationEl.textContent;
        const currentSource = externalSourceEl.textContent;

        // Create history entry
        const historyEntry = {
            date: dateStr,
            time: timeStr,
            internal: currentInternal,
            external: currentExternal,
            source: currentSource,
        };

        // Add to history
        history.unshift(historyEntry);
        saveHistory(); // Geçmişi kaydet

        // Update history display
        displayHistory();
    }

    function displayHistory() {
        historyList.innerHTML = '';
        historyList.classList.add('history-list');

        const filter = document.getElementById('historyFilter')?.value || 'all';
        const now = new Date();

        const filteredHistory = history.filter(entry => {
            if (filter === 'all') return true;

            const entryDate = new Date(entry.date);
            const diffDays = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));

            if(filter === '24hours') return diffDays <= 1;
            if (filter === '7days') return diffDays <= 7;
            if (filter === '15days') return diffDays <= 15;
            if (filter === 'thisMonth') return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();

            return true;
        });

        if (filteredHistory.length === 0) {
            emptyHistoryState.classList.remove('hidden');
        } else {
            emptyHistoryState.classList.add('hidden');

            filteredHistory.forEach((entry) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'app-card border rounded-xl p-4 shadow-sm';

                const isCompleted = completedHistory.some(
                    c =>
                        c.internal === entry.internal &&
                        c.external === entry.external
                );

                historyItem.innerHTML = `
                    <div class="flex justify-between items-center text-sm text-neutral-500 mb-2">
                        <span>${entry.date}</span>
                        <span>${entry.time}</span>
                    </div>
                    <div class="space-y-3 text-sm">
                        <div class="flex">
                            <span class="mr-2 flex-shrink-0">🧠</span>
                            <p>${entry.internal}</p>
                        </div>
                        <div class="flex">
                            <span class="mr-2 flex-shrink-0">🌍</span>
                            <div>
                                <p>${entry.external}</p>
                                ${entry.source ? `<p class="text-xs mt-1 app-source italic">${entry.source}</p>` : ''}
                            </div>
                        </div>
                        ${isCompleted ? `
                            <div class="flex items-center gap-1 text-green-600 text-sm mt-2">
                                <span>✅</span> <span>Tamamlandı</span>
                            </div>` : ''
                        }
                    </div>
                `;

                historyList.appendChild(historyItem);
            });
        }
    }

    function updateRandomFavButtonVisibility() {
        const btn = document.getElementById('randomFavButton');
        const hasInternal = likes.some(l => l.type === 'internal');
        const hasExternal = likes.some(l => l.type === 'external');

        if (btn) {
            btn.style.display = (hasInternal && hasExternal) ? 'inline-block' : 'none';
        }
    }

    function setupFavoriteNotification() {
        const enabled = localStorage.getItem('reminders_enabled') === 'true';
        if (!enabled || Notification.permission !== 'granted') return;

        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 15 && now.getMinutes() === 0) {
            sendRandomFavoriteNotification();
            }
        }, 60000); // her dakika kontrol
    }

    function sendRandomFavoriteNotification() {
        const internalLikes = likes.filter(l => l.type === 'internal');
        const externalLikes = likes.filter(l => l.type === 'external');

        if (internalLikes.length === 0 || externalLikes.length === 0) return;

        const internal = internalLikes[Math.floor(Math.random() * internalLikes.length)];
        const external = externalLikes[Math.floor(Math.random() * externalLikes.length)];

        const combinedText = `🧠 ${internal.text}\n🌍 ${external.text}`;

        new Notification("🎲 Rastgele Favori", {
            body: combinedText,
            icon: "/icon.png" // ikonun varsa ekle
        });
    }

function showRandomFavorite() {
    if (!likes || likes.length === 0) {
        alert("Henüz favorin yok!");
        return;
    }

    // Rastgele bir içsel ve dışsal sapma seç
    const internalLikes = likes.filter(like => like.type === "internal");
    const externalLikes = likes.filter(like => like.type === "external");

    if (internalLikes.length === 0 || externalLikes.length === 0) {
        alert("Gösterilecek hem içsel hem dışsal favori bulunamadı.");
        return;
    }

    const randomInternal = internalLikes[Math.floor(Math.random() * internalLikes.length)];
    const randomExternal = externalLikes[Math.floor(Math.random() * externalLikes.length)];

    // Popup içeriklerini doldur
    document.getElementById('popupInternal').textContent = randomInternal.text;
    document.getElementById('popupExternal').textContent = randomExternal.text;

    const sourceText = randomExternal.source || randomInternal.source;
    document.getElementById('popupSource').textContent = sourceText ? `📚 ${sourceText}` : '';

    const popup = document.getElementById('favoritePopup');
    popup.classList.remove('hidden');
    popup.style.opacity = '1';

    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 300);
    }, 6000);
    
    updateRandomFavButtonVisibility();
}


    function showView(view) {
        mainView.classList.add('hidden');
        favoritesView.classList.add('hidden');
        historyView.classList.add('hidden');
        settingsView.classList.add('hidden');

        view.classList.remove('hidden');
    }

    function setTheme(theme) {
        body.className = `h-full theme-${theme}`;
        localStorage.setItem('theme', theme);
    }

    function showConfirmDialog() {
        confirmDialog.classList.remove('hidden');
    }

    function hideConfirmDialog() {
        confirmDialog.classList.add('hidden');
    }

    // Event listeners
    historyButton.addEventListener('click', () => {
        showView(historyView);
    });

    settingsButton.addEventListener('click', () => {
        showView(settingsView);
    });

    favoritessButton.addEventListener('click', () => {
        showView(favoritesView);
    });
    
    backFromHistory.addEventListener('click', () => {
        showView(mainView);
    });

    backFromFavorites.addEventListener('click', () => {
        showView(mainView);
    });

    backFromSettings.addEventListener('click', () => {
        showView(mainView);
    });


    lightTheme.addEventListener('click', () => setTheme('light'));
    darkTheme.addEventListener('click', () => setTheme('dark'));
    sepiaTheme.addEventListener('click', () => setTheme('sepia'));
    highContrastTheme.addEventListener('click', () => setTheme('highContrast'));
    lavenderTheme.addEventListener('click', () => setTheme('lavender'));
    mintTheme.addEventListener('click', () => setTheme('mint'));
    peachTheme.addEventListener('click', () => setTheme('peach'));
    skyTheme.addEventListener('click', () => setTheme('sky'));

    reminderToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        localStorage.setItem('reminders_enabled', enabled);
        console.log('Reminder toggled:', enabled);

        if (enabled) {
            // 🔔 Bildirim izni iste
            if ("Notification" in window && Notification.permission !== "granted") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        console.log("Bildirim izni verildi");
                    } else {
                        alert("Bildirim izni verilmedi, hatırlatma gönderilemez.");
                        reminderToggle.checked = false;
                        localStorage.setItem('reminders_enabled', false);
                    }
                });
            }
        }
    });

    clearHistoryBtn.addEventListener('click', showConfirmDialog);
    cancelClearHistory.addEventListener('click', hideConfirmDialog);
    confirmClearHistory.addEventListener('click', clearHistory);

    // Close dialog when clicking outside
    confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog) {
            hideConfirmDialog();
        }
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        loadRerollData();
        // Load saved theme if any
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        setupDailyReminder();

        // Load saved reminder setting
        const remindersEnabled = localStorage.getItem('reminders_enabled') === 'true';
        reminderToggle.checked = remindersEnabled;

        // Load history
        loadHistory();

        // Show initial deviations
        loadLikes();
        updateRandomFavButtonVisibility();
        updateFavoritesUI();
        updateLikeButtons();    
        document.getElementById('completeButton').addEventListener('click', completeToday);
        document.getElementById('randomFavButton').addEventListener('click', showRandomFavorite);
        loadProgress();

     loadDeviations();

        document.addEventListener('click', function (e) {
            const target = e.target.closest('#backFromFavorites');
            if (target) {
                showView(mainView);
            }
        });
        loadCompletedHistory();
        displayHistory();

        const historyFilter = document.getElementById('historyFilter');
        if (historyFilter) {
        historyFilter.addEventListener('change', () => {
            displayHistory(); // filtre değişince liste yenilenir
        });
        }

          const refreshBtn = document.getElementById("refreshButton");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", handleReroll);
        }

        updateRerollUI();

        const badge = document.getElementById('membershipBadge');

        if (badge) {
        const DEV_MODE = new URLSearchParams(window.location.search).get("devmode") === "verdeon";
        const isPremium = DEV_MODE;

        badge.innerHTML = isPremium
            ? `<span class="text-yellow-500">💎 Premium Üye</span>`
            : `<span title="Daha fazla hak için premium'a geç">👤 Standart Üye</span>`;
        }


        const last = JSON.parse(localStorage.getItem('lastDeviation'));
        if (last) {
        internalDeviationEl.textContent = last.internal;
        externalDeviationEl.textContent = last.external;
        externalSourceEl.textContent = last.source || '';
        updateLikeButtons();
        } else {
        showRandomDeviations(); // sadece ilk kez yükleniyorsa göster
        }
    });

    function toggleLike(type) {
        const isInternal = type === 'internal';
        const currentText = isInternal ? internalDeviationEl.textContent : externalDeviationEl.textContent;
        const source = isInternal ? null : externalSourceEl.textContent;

        const current = { 
            type, 
            text: currentText, 
            source 
        };

        const key = JSON.stringify(current);
        const index = likes.findIndex(like => JSON.stringify(like) === key);

        const button = isInternal 
            ? document.getElementById('internalLikeButton') 
            : document.getElementById('externalLikeButton');

        if (index === -1) {
            likes.unshift(current); // EN ÜSTE ekle
            button.classList.add('text-red-500');
            button.innerHTML = '❤️'; // DOLU kalp
        } else {
            likes.splice(index, 1);
            button.classList.remove('text-red-500');
            button.innerHTML = '🤍'; // BOŞ kalp
        }

        localStorage.setItem('likes', JSON.stringify(likes));
        updateFavoritesUI();
        updateRandomFavButtonVisibility();
    }

    function updateLikeButtons() {
        const internalText = internalDeviationEl.textContent;
        const externalText = externalDeviationEl.textContent;
        const externalSource = externalSourceEl.textContent;

        const internalBtn = document.getElementById('internalLikeButton');
        const externalBtn = document.getElementById('externalLikeButton');

        const internalLiked = likes.some(
            like => like.type === 'internal' && like.text === internalText
        );

        const externalLiked = likes.some(
            like => like.type === 'external' && like.text === externalText && like.source === externalSource
        );

        // İçsel
        internalBtn.classList.toggle('text-red-500', internalLiked);
        internalBtn.innerHTML = internalLiked ? '❤️' : '🤍';

        // Dışsal
        externalBtn.classList.toggle('text-red-500', externalLiked);
        externalBtn.innerHTML = externalLiked ? '❤️' : '🤍';
    }

    function updateFavoritesUI() {
        const container = document.getElementById('favoritesView');
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold">Favori Sapmalar</h2>
                <button id="backFromFavorites" class="opacity-70 hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        if (likes.length === 0) {
            container.innerHTML += `
                <div id="emptyFavoritesState" class="text-center py-10">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto opacity-30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.03L12 21.35Z"/>
                    </svg>
                    <p class="text-sm opacity-70">Henüz favori yok</p>
                </div>`;
            return;
        }

        likes.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'app-card border rounded-xl p-4 shadow-sm mb-4 relative';

            item.innerHTML = `
                <button onclick="removeFavorite(${index})" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl">×</button>
                <div class="space-y-3 text-sm">
                    <div class="flex">
                        <span class="mr-2 flex-shrink-0">${entry.type === 'internal' ? '🧠' : '🌍'}</span>
                        <div>
                            <p>${entry.text}</p>
                            ${entry.source ? `<p class="text-xs mt-1 app-source italic">${entry.source}</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    function removeFavorite(index) {
        likes.splice(index, 1);
        localStorage.setItem('likes', JSON.stringify(likes));
        updateFavoritesUI();
        updateLikeButtons();
        updateRandomFavButtonVisibility();
    }

    function loadLikes() {
        const savedLikes = localStorage.getItem('likes');
        likes = savedLikes ? JSON.parse(savedLikes) : [];
    }

    function copyCurrentSapma() {
        const internal = internalDeviationEl.textContent;
        const external = externalDeviationEl.textContent;
        const source = externalSourceEl.textContent;

        const text = `🧠 ${internal}\n🌍 ${external}${source ? `\n📚 Kaynak: ${source}` : ''}\n\n#MikroSapma`;

            copyToClipboard(text);
            showClipboardAlert();
        
    }

    function copyToClipboard(text) {
        const dummy = document.createElement('textarea');
        dummy.value = text;
        document.body.appendChild(dummy);
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
    }

    function showClipboardAlert () {
        document.getElementById('copyAlert').classList.remove('hidden');

        setTimeout(function() {
        document.getElementById('copyAlert').classList.add('hidden');
        }, 2000); // 2000 milisaniye = 2 saniye
    }