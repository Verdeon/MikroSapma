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
const supportButton = document.getElementById('supportButton')
const backFromHistory = document.getElementById('backFromHistory');
const backFromFavorites = document.getElementById('backFromFavorites');
const backFromSettings = document.getElementById('backFromSettings');
const supportView = document.getElementById('supportView');
const backFromSupport = document.getElementById('backFromSupport');
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
const resetConfirmationModal = document.getElementById('resetConfirmationModal');
const confirmResetBtn = document.getElementById('confirmResetBtn');
const cancelResetBtn = document.getElementById('cancelResetBtn');
const resetProgressButton = document.getElementById('resetProgressButton');
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

    // Sadece kilitli olmayan kartı güncelle
    if (!internalCardLocked) {
        internalDeviationEl.textContent = internalDeviations[randomInternalIndex].text;
        updatedInternal = true;
    }
    if (!externalCardLocked) {
        externalDeviationEl.textContent = externalDeviations[randomExternalIndex].text;
        externalSourceEl.textContent = externalDeviations[randomExternalIndex].source || '';
        updatedExternal = true;
    }

    // Update history only if either card was updated
    if (updatedInternal || updatedExternal) {
        updateHistory(); // Update history immediately after showing new deviations
    }

    updateExternalLockButtonText();
    updateInternalLockButtonText();
    updateRefreshButtonText();
    
    // emptyFavoritesState.classList.remove('hidden'); // Bu satıra burada gerek yok, updateFavoritesUI yönetiyor
    updateLikeButtons();
    updateProgressUI();

    // Son gösterilen sapmaları sakla
    localStorage.setItem('lastDeviation', JSON.stringify({
        internal: internalDeviationEl.textContent,
        external: externalDeviationEl.textContent,
        source: externalSourceEl.textContent
    }));
}

if (resetProgressButton) {
    resetProgressButton.addEventListener('click', () => {
        resetConfirmationModal.classList.remove('hidden'); // Show the modal
    });
}

// Add event listeners for the modal buttons
if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', () => {
        resetProgress(); // Call the actual reset function
        resetConfirmationModal.classList.add('hidden'); // Hide the modal
    });
}

if (cancelResetBtn) {
    cancelResetBtn.addEventListener('click', () => {
        resetConfirmationModal.classList.add('hidden'); // Hide the modal
    });
}


function showLockedPrompt() {
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

    if (internalCardLocked) {
        toggleLock('internal');
    }
    if (externalCardLocked) {
        toggleLock('external');
    }

    updateHistory();
    updateLikeButtons();
}


function setupDailyReminder() {
    const enabled = localStorage.getItem('reminders_enabled') === 'true';
    if (!enabled || Notification.permission !== 'granted') return;

    setInterval(() => {
        const now = new Date();
        // Sadece günün belirli bir saati ve dakikasında bildirim gönder
        // Örn: her gün 12:00'de
        if (now.getHours() === 12 && now.getMinutes() === 0 && now.getSeconds() < 10) { // Saniyeyi de kontrol ederek birden fazla bildirimden kaçın
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

function updateRefreshButtonText() {
    const refreshButton = document.getElementById('refreshButton');
    if (!refreshButton) return; // Buton yoksa işlem yapma

    if (internalCardLocked && externalCardLocked) {
        refreshButton.innerHTML = `🔒 İkisi de Kilitli`;
        refreshButton.disabled = true; // İkisi de kilitliyse buton devre dışı
    } else if (internalCardLocked) { // Sadece içsel kilitliyse
        refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>İçsel Kilitli`;
        refreshButton.disabled = false;
    } else if (externalCardLocked) { // Sadece dışsal kilitliyse
        refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>Dışsal Kilitli`;
        refreshButton.disabled = false;
    } else { // Hiçbiri kilitli değilse
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
    if (btn) { // completeButton'ın var olduğundan emin olun
        btn.disabled = completed;
        btn.textContent = completed ? '✅ Tamamlandı' : '✅ Tamamladım';
    }


    document.getElementById('progressInfo').textContent =
        `🎯 Puan: ${progress.points} | 🔥 Seri: ${progress.streak}`;

    const badgeEl = document.getElementById('badge');
    if (badgeEl) { // Check if badge element exists before trying to set textContent
        badgeEl.textContent =
            progress.streak >= 30 ? '🥇 Altın Seri!' :
            progress.streak >= 7  ? '🥈 Gümüş Seri!' :
            progress.streak >= 3  ? '🥉 Bronz Seri!' :
            '';
    }
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

    // Add to history (unshift adds to the beginning, so newest is first)
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

    // Türkçe ay isimlerini İngilizce karşılıklarına çeviren bir harita
    const turkishMonths = {
        'Ocak': 'January', 'Şubat': 'February', 'Mart': 'March', 'Nisan': 'April',
        'Mayıs': 'May', 'Haziran': 'June', 'Temmuz': 'July', 'Ağustos': 'August',
        'Eylül': 'September', 'Ekim': 'October', 'Kasım': 'November', 'Aralık': 'December'
    };

    const filteredHistory = history.filter(entry => {
        if (filter === 'all') return true;

        // Türkçe tarih stringini JavaScript'in anlayacağı formata çevir
        const entryDateParts = entry.date.split(' '); // Örn: ["17", "Mayıs", "2025"]
        // Eğer entryDateParts[1] Türkçe bir ay ismiyse çevir, değilse olduğu gibi bırak
        let englishMonth = turkishMonths[entryDateParts[1]] || entryDateParts[1];
        let englishDateString = entryDateParts[0] + ' ' + englishMonth + ' ' + entryDateParts[2];
        
        const entryDate = new Date(englishDateString);
        
        // Saat ve dakika bilgisi ekleyerek daha doğru karşılaştırma
        const [hour, minute] = entry.time.split(':').map(Number);
        entryDate.setHours(hour, minute, 0, 0);


        if (isNaN(entryDate.getTime())) { // Geçersiz tarih kontrolü
            console.warn("Geçersiz tarih formatı geçmiş girdisinde:", entry.date, "Çevrilmiş:", englishDateString);
            return false; // Geçersiz girdileri atla
        }

        // Günün başlangıcını almak için saat ve dakika bilgilerini sıfırla
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const entryDateStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());

        const diffTime = todayStart.getTime() - entryDateStart.getTime(); // Günlük bazda fark
        const diffDays = diffTime / (1000 * 60 * 60 * 24); // Gün olarak tam farkı al

        if (filter === '24hours') {
            // Son 24 saat, tam zamanı kontrol et
            return (now.getTime() - entryDate.getTime()) <= (1000 * 60 * 60 * 24);
        }
        if (filter === '7days') return diffDays < 7; // Son 7 gün (bugünü saymadan önceki 7 gün)
        if (filter === '15days') return diffDays < 15; // Son 15 gün
        if (filter === 'thisMonth') {
            return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
        }

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
        // Sadece günün belirli bir saati ve dakikasında bildirim gönder
        // Örn: her gün 15:00'te
        if (now.getHours() === 15 && now.getMinutes() === 0 && now.getSeconds() < 10) { // Saniyeyi de kontrol ederek birden fazla bildirimden kaçın
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

    const popupSourceEl = document.getElementById('popupSource');
    const sourceText = randomExternal.source || randomInternal.source || '';
    popupSourceEl.textContent = sourceText ? `📚 ${sourceText}` : '';
    popupSourceEl.style.display = sourceText ? 'block' : 'none'; // Hide if no source

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
    supportView.classList.add('hidden');
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

// Yeni bir event handler fonksiyonu tanımlayın
function handleBackFromFavorites() {
    showView(mainView);
}

// Event listeners
historyButton.addEventListener('click', () => {
    showView(historyView);
    displayHistory(); // Ensure history is updated when viewing it
});

settingsButton.addEventListener('click', () => {
    showView(settingsView);
});

favoritessButton.addEventListener('click', () => {
    showView(favoritesView);
    updateFavoritesUI();
});

backFromHistory.addEventListener('click', () => {
    showView(mainView);
});

backFromSettings.addEventListener('click', () => {
    showView(mainView);
});

supportButton.addEventListener('click', () => {
    showView(supportView);
});

backFromSupport.addEventListener('click', () => {
    showView(mainView);
});

// FIX: Add event listener for refreshButton
refreshButton.addEventListener('click', showRandomDeviations);

internalLockButton.addEventListener('click', () => toggleLock('internal'));
externalLockButton.addEventListener('click', () => toggleLock('external'));

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
                    setupDailyReminder(); // İzin verilince hatırlatıcıyı başlat
                    setupFavoriteNotification(); // İzin verilince favori hatırlatıcıyı başlat
                } else {
                    alert("Bildirim izni verilmedi, hatırlatma gönderilemez.");
                    reminderToggle.checked = false;
                    localStorage.setItem('reminders_enabled', false);
                }
            });
        } else if (Notification.permission === "granted") {
            setupDailyReminder(); // Zaten izinliyse başlat
            setupFavoriteNotification(); // Zaten izinliyse favori hatırlatıcıyı başlat
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
    // Load saved theme if any
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Uygulama yüklendiğinde hatırlatıcıları ve favori bildirimlerini başlat
    setupDailyReminder();
    setupFavoriteNotification();

    // Load saved reminder setting
    const remindersEnabled = localStorage.getItem('reminders_enabled') === 'true';
    reminderToggle.checked = remindersEnabled;

    // History ve Likes verilerini yükle
    loadHistory();
    loadLikes();
    loadCompletedHistory();
    loadProgress(); // Progress verilerini yükle

    // Kilitleme butonlarının ilk açılışta doğru metni/emojiyi göstermesi için
    updateInternalLockButtonText();
    updateExternalLockButtonText();
    updateRefreshButtonText(); // Yenileme butonunun metnini başlangıçta ayarla

    // Deviasyonları yükle ve ardından UI'ı güncelle
    loadDeviations().then(() => {
        const last = JSON.parse(localStorage.getItem('lastDeviation'));
        if (last) {
            // Kayıtlı son sapma varsa onları göster
            internalDeviationEl.textContent = last.internal;
            externalDeviationEl.textContent = last.external;
            externalSourceEl.textContent = last.source || '';
        } else {
            // Yoksa rastgele yeni bir sapma göster
            showRandomDeviations();
        }
        // Deviasyonlar yüklendikten ve gösterildikten sonra like butonlarını güncelle
        updateLikeButtons();
    });

    // Favorite UI ve Rastgele Favori Butonunun görünürlüğünü güncelle
    updateFavoritesUI();
    updateRandomFavButtonVisibility();
    
    // UI'daki butonlara event listener'ları ekle
    document.getElementById('completeButton').addEventListener('click', completeToday);
    document.getElementById('randomFavButton').addEventListener('click', showRandomFavorite);

    // Geçmiş filtresi değiştiğinde geçmişi yeniden görüntüle
    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', () => {
            displayHistory(); // filtre değişince liste yenilenir
        });
    }

    // Kilitleme butonlarının event listener'larını ekle
    internalLockButton.addEventListener('click', () => toggleLock('internal'));
    externalLockButton.addEventListener('click', () => toggleLock('external'));

    // Diğer navigasyon ve ayar butonlarının event listener'ları (eğer yukarıda başka yerde tanımlanmadıysa)
    historyButton.addEventListener('click', () => {
        showView(historyView);
        displayHistory(); // Geçmiş görünümüne geçince geçmişi güncelle
    });
    favoritessButton.addEventListener('click', () => {
        showView(favoritesView);
        updateFavoritesUI(); // Favoriler görünümüne geçince favorileri güncelle
    });
    settingsButton.addEventListener('click', () => {
        showView(settingsView);
    });
    supportButton.addEventListener('click', () => { // Yeni eklenen destek butonu
        showView(supportView);
    });

    // Geri butonları için listener'lar
    backFromHistory.addEventListener('click', () => { showView(mainView); });
    backFromSettings.addEventListener('click', () => { showView(mainView); });
    backFromSupport.addEventListener('click', () => { showView(mainView); }); // Yeni destek ekranı geri butonu
    
    // Favoriler geri butonu updateFavoritesUI içinde dinamik olarak yönetiliyor, burada tekrar eklemeyin.

    // Geçmişi temizle ve onay dialogu
    clearHistoryBtn.addEventListener('click', showConfirmDialog);
    cancelClearHistory.addEventListener('click', hideConfirmDialog);
    confirmClearHistory.addEventListener('click', clearHistory);

    // Dialog dışına tıklayınca kapatma
    confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog) {
            hideConfirmDialog();
        }
    });

    // Initial display of history (filtrelemenin ilk kez uygulanması için)
    displayHistory();
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
    if (internalBtn) { // Butonun varlığını kontrol et
        internalBtn.classList.toggle('text-red-500', internalLiked);
        internalBtn.innerHTML = internalLiked ? '❤️' : '🤍';
    }

    // Dışsal
    if (externalBtn) { // Butonun varlığını kontrol et
        externalBtn.classList.toggle('text-red-500', externalLiked);
        externalBtn.innerHTML = externalLiked ? '❤️' : '🤍';
    }
}

function updateFavoritesUI() {
    const container = document.getElementById('favoritesView');
    // Clear existing content except the header, or recreate the entire view
    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold">Favori Sapmalar</h2>
            <button id="backFromFavorites" class="opacity-70 hover:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        <div id="favoritesListContainer"></div> `;

    const favoritesListContainer = document.getElementById('favoritesListContainer'); 

    if (likes.length === 0) {
        favoritesListContainer.innerHTML = `
            <div id="emptyFavoritesState" class="text-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto opacity-30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.03L12 21.35Z"/>
                </svg>
                <p class="text-sm opacity-70">Henüz favori yok</p>
            </div>`;
    } else {
        favoritesListContainer.innerHTML = ''; // Temizle
        likes.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'app-card border rounded-xl p-4 shadow-sm mb-4 relative';

            item.innerHTML = `
                <button class="remove-favorite-btn absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl" data-index="${index}">×</button>
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
            favoritesListContainer.appendChild(item); // Yeni kapsayıcıya ekle
        });
    }

    // Favoriler ekranından geri dönme butonu için event listener'ı yeniden ekle
    // Bu kısım, updateFavoritesUI her çağrıldığında çalışmalı.
    const backFromFavoritesBtn = document.getElementById('backFromFavorites');
    if (backFromFavoritesBtn) {
        backFromFavoritesBtn.removeEventListener('click', handleBackFromFavorites); // Önceki dinleyiciyi kaldır
        backFromFavoritesBtn.addEventListener('click', handleBackFromFavorites); // Yeni dinleyiciyi ekle
    }

    // Attach event listeners to the dynamically created remove buttons
    favoritesListContainer.querySelectorAll('.remove-favorite-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const indexToRemove = parseInt(event.target.dataset.index);
            removeFavorite(indexToRemove);
        });
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