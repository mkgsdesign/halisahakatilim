/* =========================================================
   BİZİM EKİP HALI SAHA - Google Sheets + Apps Script
========================================================= */

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw1032xl6q66hrmTwbD5WYnehlFFNZGwtxq9wwjSWgpGuTitiaGjke9sRJXLR8UL4hPgw/exec";

const MAX_PLAYERS = 14;
const ADMIN_PASSWORD = "Cacir03";
const MATCH_FEE = 150;

const DEFAULT_RATING = 70;
const POSITIONS = ["Oyuncu", "Kaleci", "Defans", "Orta Saha", "Forvet"];

const players = [
    "Mehmet Ali", "Fatih Keskin", "İsmet", "Numan", "Yasin", "Özek",
    "Hidayet", "Recep", "İbrahim Kök", "Dali", "SFR", "Emre", "Balcı",
    "Sefer", "Aşık", "Cio", "Tahsin", "kemal gönen",
    "ömer savsar", "akif Altundepe", "burak kocatepe", "raşit karaca", "ömer altunkaya"
];

/* ---------- DURUMLAR ---------- */

let playerStatuses = {};
let playerPayments = {};
let playerProfiles = {};
let ratingEditedAt = {};
let selectedPlayer = "";
let historyData = [];
let clearingWeek = false;
let dataLoading = false;
let actionInProgress = false;

let mainAudio = null;
let audioStarted = false;
let comingVideo = null;
let notComingVideo = null;

/* ---------- YARDIMCI ---------- */

function $(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function clampRating(value) {
    const n = Math.round(Number(value));
    if (isNaN(n)) return DEFAULT_RATING;
    return Math.max(1, Math.min(100, n));
}

function getRating(name) {
    return playerProfiles[name] ? playerProfiles[name].rating : DEFAULT_RATING;
}

/* ---------- BAŞLANGIÇ ---------- */

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
    initializeState();
    createPlayerSelect();
    createProfileSelect();
    setupButtons();
    setupAudio();
    setupVideos();
    startCountdown();
    loadProfiles();
    loadData();
    loadHistory();
    updateCounters();
    updateAttendanceLists();
    updatePaymentProgress();
    updateWeeklyStats();
    updateSelectedPlayer();
}

function initializeState() {
    players.forEach(name => {
        playerStatuses[name] = "";
        playerPayments[name] = "";
        playerProfiles[name] = { position: "Oyuncu", rating: DEFAULT_RATING, matches: 0 };
    });
}

/* ---------- SELECT'LER ---------- */

function fillSelect(id, placeholder) {
    const select = $(id);
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    players.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

function createPlayerSelect() {
    fillSelect("playerSelect", "Oyuncunu seç...");
}

function createProfileSelect() {
    fillSelect("profileSelect", "Oyuncu seç...");
}

/* ---------- BUTONLAR ---------- */

function on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
}

function setupButtons() {
    on("playerSelect", "change", showSelectedPlayer);
    on("comingButton", "click", () => setStatus("Geliyorum"));
    on("notComingButton", "click", () => setStatus("Gelemiyorum"));
    on("paymentButton", "click", setPayment);
    on("clearButton", "click", clearSelectedPlayer);
    on("copyIbanButton", "click", copyIban);
    on("profileSelect", "change", renderPlayerProfile);
    on("generateTeamsButton", "click", generateTeams);
    on("adminOpenButton", "click", openAdminPanel);
    on("adminCloseButton", "click", closeAdminPanel);
    on("adminGenerateTeams", "click", generateTeams);
    on("adminClearWeek", "click", clearWeek);
    on("deleteHistoryButton", "click", deleteHistory);

    // Admin: puan / mevki değişince kaydet
    on("adminPlayers", "change", handleAdminRatingChange);

    const adminPanel = $("adminPanel");
    if (adminPanel) {
        adminPanel.addEventListener("click", event => {
            if (event.target === adminPanel) closeAdminPanel();
        });
    }
}

/* ---------- VİDEO ---------- */

function setupVideos() {
    comingVideo = $("comingVideo");
    notComingVideo = $("notComingVideo");

    [comingVideo, notComingVideo].forEach(v => {
        if (v) {
            v.pause();
            v.currentTime = 0;
        }
    });

    if (comingVideo) comingVideo.addEventListener("ended", () => hideVideo("coming"));
    if (notComingVideo) notComingVideo.addEventListener("ended", () => hideVideo("notComing"));
}

function playActionVideo(type) {
    const isComing = type === "coming";
    const video = isComing ? comingVideo : notComingVideo;
    const box = $(isComing ? "leftVideoBox" : "rightVideoBox");
    const otherVideo = isComing ? notComingVideo : comingVideo;
    const otherBox = $(isComing ? "rightVideoBox" : "leftVideoBox");

    if (!video || !box) return;

    if (otherVideo) {
        otherVideo.pause();
        otherVideo.currentTime = 0;
    }
    if (otherBox) otherBox.classList.remove("video-active");

    video.pause();
    video.currentTime = 0;

    box.classList.remove("video-active");
    void box.offsetWidth;
    box.classList.add("video-active");

    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => console.log("Video oynatılamadı:", error));
    }
}

function hideVideo(type) {
    const isComing = type === "coming";
    const box = $(isComing ? "leftVideoBox" : "rightVideoBox");
    const video = isComing ? comingVideo : notComingVideo;

    if (box) box.classList.remove("video-active");
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
}

/* ---------- SES ---------- */

function setupAudio() {
    mainAudio = new Audio("arka.mp3");
    mainAudio.loop = true;
    mainAudio.volume = 0.18;
    audioStarted = false;
    updateAudioButton(false);
    on("audioButton", "click", toggleMainAudio);
}

function toggleMainAudio() {
    if (!mainAudio) return;

    if (audioStarted) {
        mainAudio.pause();
        audioStarted = false;
        updateAudioButton(false);
        return;
    }

    mainAudio.play()
        .then(() => {
            audioStarted = true;
            updateAudioButton(true);
        })
        .catch(error => console.log("Arka plan sesi oynatılamadı:", error));
}

function updateAudioButton(active) {
    const button = $("audioButton");
    if (button) button.textContent = active ? "🔊" : "🔇";
}

/* ---------- VERİ YÜKLE ---------- */

function loadData() {
    if (dataLoading) return;
    dataLoading = true;

    const callbackName = "attendanceCallback_" + Date.now();
    const script = document.createElement("script");

    window[callbackName] = function (data) {
        try {
            if (!clearingWeek) updatePlayers(data);
            hideLoading();
            hideConnectionError();
        } catch (error) {
            console.error(error);
            showConnectionError();
        } finally {
            dataLoading = false;
            delete window[callbackName];
            if (script.parentNode) script.remove();
        }
    };

    script.src = SCRIPT_URL + "?callback=" + callbackName + "&t=" + Date.now();

    script.onerror = function () {
        dataLoading = false;
        showConnectionError();
        hideLoading();
        if (script.parentNode) script.remove();
    };

    document.body.appendChild(script);
}

function updatePlayers(data) {
    if (!data || !Array.isArray(data.players)) return;

    players.forEach(name => {
        playerStatuses[name] = "";
        playerPayments[name] = "";
    });

    data.players.forEach(row => {
        const name = String(row.isim || "").trim();
        if (!players.includes(name)) return;

        playerStatuses[name] = String(row.durum || "").trim();
        playerPayments[name] = String(row.odeme || "").trim();

        // Puan / mevki: az önce admin düzenlediyse sunucudaki eski değerle ezme
        const recentlyEdited =
            ratingEditedAt[name] && Date.now() - ratingEditedAt[name] < 10000;

        if (!recentlyEdited) {
            if (row.puan !== undefined && row.puan !== "" && row.puan !== null) {
                playerProfiles[name].rating = clampRating(row.puan);
            }
            if (row.mevki) {
                playerProfiles[name].position = String(row.mevki).trim();
            }
        }
    });

    saveLocalProfiles();

    updateCounters();
    updateAttendanceLists();
    updatePaymentProgress();
    updateWeeklyStats();
    updateSelectedPlayer();
    renderAdminPlayers();
    updateAdminSummary();
    updateProfileIfSelected();

    const lastUpdate = $("lastUpdate");
    if (lastUpdate) {
        lastUpdate.textContent =
            "Son kontrol: " +
            new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }
}

/* ---------- LİSTELER ---------- */

function getComingPlayers() {
    return players.filter(name => playerStatuses[name] === "Geliyorum");
}

function getNotComingPlayers() {
    return players.filter(name => playerStatuses[name] === "Gelemiyorum");
}

function getWaitingPlayers() {
    return players.filter(name => !playerStatuses[name]);
}

function getPaidPlayers() {
    return players.filter(
        name => playerPayments[name] && playerPayments[name].toLowerCase().includes("öd")
    );
}

/* ---------- SAYAÇLAR ---------- */

function updateCounters() {
    const coming = getComingPlayers();
    setText("comingCount", coming.length);
    setText("notComingCount", getNotComingPlayers().length);
    setText("waitingCount", getWaitingPlayers().length);
    setText("capacityFull", `${coming.length} / ${MAX_PLAYERS}`);
}

function renderTags(id, list, emptyText) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = list.length
        ? list.map(name => `<span class="player-tag">${escapeHtml(name)}</span>`).join("")
        : emptyText;
}

function updateAttendanceLists() {
    renderTags("comingList", getComingPlayers(), "Henüz kimse katılım bildirmedi.");
    renderTags("notComingList", getNotComingPlayers(), "Henüz cevap veren yok.");
    renderTags("waitingList", getWaitingPlayers(), "Herkes cevap verdi.");
}

/* ---------- ÖDEME DURUMU ---------- */

function updatePaymentProgress() {
    const paid = getPaidPlayers();

    setText("paymentCount", `${paid.length} / ${MAX_PLAYERS}`);

    const bar = $("paymentProgress");
    if (bar) {
        bar.style.width = Math.min((paid.length / MAX_PLAYERS) * 100, 100) + "%";
    }

    setText("paymentNames", paid.length ? paid.join(" • ") : "Henüz ödeme bildiren yok.");
}

/* ---------- HAFTALIK İSTATİSTİK ---------- */

function updateWeeklyStats() {
    const coming = getComingPlayers();

    setText("statTotalPlayers", players.length);
    setText("statComing", coming.length);
    setText("statPaid", getPaidPlayers().length);
    setText("statWaiting", getWaitingPlayers().length);

    const highlight = $("weeklyHighlight");
    if (highlight) {
        highlight.textContent =
            coming.length >= MAX_PLAYERS
                ? "🏆 Kadro doldu! Bu haftanın maçı için 14 kişilik kontenjan tamamlandı."
                : `⚽ Şu anda ${coming.length} kişi maça katılıyor. ` +
                  `${Math.max(MAX_PLAYERS - coming.length, 0)} kişilik yer kaldı.`;
    }
}

/* ---------- SEÇİLİ OYUNCU ---------- */

function showSelectedPlayer() {
    const select = $("playerSelect");
    if (!select) return;

    selectedPlayer = select.value;

    const panel = $("selectedPlayerPanel");

    if (!selectedPlayer) {
        if (panel) panel.classList.add("hidden");
        return;
    }

    if (panel) panel.classList.remove("hidden");
    updateSelectedPlayer();
}

function updateSelectedPlayer() {
    if (!selectedPlayer) return;

    setText("selectedPlayerName", selectedPlayer);

    const status = playerStatuses[selectedPlayer];
    const paid = !!playerPayments[selectedPlayer];

    const statusElement = $("selectedPlayerStatus");
    const paymentElement = $("selectedPaymentStatus");
    const comingButton = $("comingButton");
    const notComingButton = $("notComingButton");
    const paymentButton = $("paymentButton");

    /* ----- Katılım durumu ----- */

    const isComing = status === "Geliyorum";
    const isNotComing = status === "Gelemiyorum";

    if (statusElement) {
        statusElement.textContent =
            isComing ? "🟢 Geliyorum" :
            isNotComing ? "🔴 Gelemiyorum" :
            "⚪ Cevap vermedi";

        statusElement.className =
            isComing ? "status-coming" :
            isNotComing ? "status-not-coming" :
            "status-waiting";

        // Durum kutusunun kendisi de yeşil / kırmızı olur
        const box = statusElement.closest(".status-info");
        if (box) {
            box.classList.toggle("is-coming", isComing);
            box.classList.toggle("is-not-coming", isNotComing);
        }
    }

    // Butonlar: seçili olan renkli, diğeri soluk
    if (comingButton) {
        comingButton.classList.toggle("selected", isComing);
        comingButton.classList.toggle("dimmed", isNotComing);
    }

    if (notComingButton) {
        notComingButton.classList.toggle("selected", isNotComing);
        notComingButton.classList.toggle("dimmed", isComing);
    }

    /* ----- Ödeme durumu ----- */

    if (paymentElement) {
        paymentElement.textContent = paid
            ? "🟢 Ödeme yapıldı."
            : "Henüz ödeme bildirilmedi.";

        paymentElement.className = paid ? "payment-done" : "";

        const payBox = paymentElement.closest(".status-info");
        if (payBox) payBox.classList.toggle("is-paid", paid);
    }

    if (paymentButton) {
        paymentButton.classList.toggle("paid", paid);
        paymentButton.disabled = paid;
        paymentButton.textContent = paid ? "🟢 Ödeme Yapıldı" : "💳 Ödemeyi Yaptım";
    }
}

/* ---------- DURUM GÖNDER ---------- */

function setStatus(status) {
    if (!selectedPlayer) {
        alert("Önce oyuncunu seç.");
        return;
    }

    if (actionInProgress) return;
    actionInProgress = true;

    if (status === "Geliyorum") playActionVideo("coming");
    else if (status === "Gelemiyorum") playActionVideo("notComing");

    playerStatuses[selectedPlayer] = status;

    updateCounters();
    updateAttendanceLists();
    updateWeeklyStats();
    updateSelectedPlayer();
    renderAdminPlayers();
    updateAdminSummary();

    sendPost({ isim: selectedPlayer, durum: status }, () => {});

    setTimeout(() => {
        actionInProgress = false;
        loadData();
    }, 900);
}

/* ---------- ÖDEME ---------- */

function setPayment() {
    if (!selectedPlayer) {
        alert("Önce oyuncunu seç.");
        return;
    }

    if (actionInProgress) return;

    if (!confirm(`💳 ${MATCH_FEE} TL ödeme yaptığınızı onaylıyor musunuz?`)) return;

    actionInProgress = true;

    const name = selectedPlayer;

    // Ödeme bildirildiğinde oyuncu otomatik "Geliyorum" olur
    playerStatuses[name] = "Geliyorum";
    playerPayments[name] = "Ödendi";

    updateCounters();
    updateAttendanceLists();
    updatePaymentProgress();
    updateWeeklyStats();
    updateSelectedPlayer();
    renderAdminPlayers();
    updateAdminSummary();

    sendPost(
        {
            action: "payment",
            isim: name,
            durum: "Geliyorum",
            odeme: "Ödendi"
        },
        error => {
            if (error) {
                playerPayments[name] = "";
                updatePaymentProgress();
                updateWeeklyStats();
                updateSelectedPlayer();
                alert("❌ Ödeme kaydedilemedi, tekrar dene.");
            }
        }
    );

    setTimeout(() => {
        actionInProgress = false;
        loadData();
    }, 1500);
}

/* ---------- SEÇİLİ OYUNCU TEMİZLE ---------- */

function clearSelectedPlayer() {
    if (!selectedPlayer) return;

    if (!confirm(`${selectedPlayer} için durumu temizlemek istediğine emin misin?`)) return;

    playerStatuses[selectedPlayer] = "";
    playerPayments[selectedPlayer] = "";

    updateCounters();
    updateAttendanceLists();
    updatePaymentProgress();
    updateWeeklyStats();
    updateSelectedPlayer();

    sendPost({ isim: selectedPlayer, durum: "", odeme: "" }, () => {});

    setTimeout(loadData, 900);
}

/* ---------- POST ---------- */

function sendPost(payload, callback) {
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
        .then(() => {
            if (callback) callback();
        })
        .catch(error => {
            console.error("POST hatası:", error);
            if (callback) callback(error);
        });
}

/* ---------- IBAN KOPYALA ---------- */

function copyIban() {
    const ibanText = $("ibanText");
    if (!ibanText) return;

    const iban = ibanText.dataset.iban || ibanText.textContent.trim();
    if (!iban) return;

    navigator.clipboard
        .writeText(iban)
        .then(() => {
            const button = $("copyIbanButton");
            if (!button) return;

            const oldText = button.textContent;
            button.textContent = "✓ Kopyalandı";
            button.classList.add("copied");
            setTimeout(() => {
                button.textContent = oldText;
                button.classList.remove("copied");
            }, 1600);
        })
        .catch(error => console.error(error));
}

/* ---------- GERİ SAYIM ---------- */

function getNextMatchDate() {
    const now = new Date();
    const next = new Date(now);

    // Salı = 2
    let daysUntil = (2 - now.getDay() + 7) % 7;

    if (daysUntil === 0 && now.getHours() >= 22) {
        daysUntil = 7;
    }

    next.setDate(now.getDate() + daysUntil);
    next.setHours(22, 0, 0, 0);

    return next;
}

function startCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const diff = Math.max(getNextMatchDate().getTime() - Date.now(), 0);
    const totalSeconds = Math.floor(diff / 1000);

    const pad = n => String(n).padStart(2, "0");

    setText("countDays", pad(Math.floor(totalSeconds / 86400)));
    setText("countHours", pad(Math.floor((totalSeconds % 86400) / 3600)));
    setText("countMinutes", pad(Math.floor((totalSeconds % 3600) / 60)));
    setText("countSeconds", pad(totalSeconds % 60));
    setText("countdownText", "Salı 22:00 maçına kalan süre");
}

/* ---------- PROFİLLER (PUAN) ---------- */

function saveLocalProfiles() {
    try {
        localStorage.setItem("halisaha_profiles", JSON.stringify(playerProfiles));
    } catch (error) {
        /* localStorage kapalıysa sorun değil */
    }
}

function loadLocalProfiles() {
    try {
        const raw = localStorage.getItem("halisaha_profiles");
        if (!raw) return;

        const saved = JSON.parse(raw);

        players.forEach(name => {
            if (!saved[name]) return;
            playerProfiles[name].rating = clampRating(saved[name].rating);
            if (saved[name].position) playerProfiles[name].position = saved[name].position;
        });
    } catch (error) {
        /* bozuk kayıt varsa yok say */
    }
}

function loadProfiles() {
    // Sheets'ten gelene kadar bu cihazdaki son kaydı göster
    loadLocalProfiles();
}

function renderPlayerProfile() {
    const select = $("profileSelect");
    const card = $("profileCard");
    if (!select || !card) return;

    const name = select.value;

    if (!name) {
        card.innerHTML = `
            <div class="profile-placeholder">
                Oyuncu seçerek profilini görüntüleyebilirsin.
            </div>`;
        return;
    }

    const profile = playerProfiles[name];

    card.innerHTML = `
        <div class="profile-content">
            <div class="profile-avatar">⚽</div>
            <div>
                <h3>${escapeHtml(name)}</h3>
                <div class="profile-meta">
                    <span>${escapeHtml(profile.position)}</span>
                    <span>⭐ ${profile.rating}</span>
                    <span>⚽ ${profile.matches} maç</span>
                </div>
            </div>
        </div>`;
}

function updateProfileIfSelected() {
    const select = $("profileSelect");
    if (select && select.value) renderPlayerProfile();
}

/* ---------- ADMIN ---------- */

function askAdminPassword(message) {
    const password = prompt(message);

    if (password === null) return false;

    if (password !== ADMIN_PASSWORD) {
        alert("Hatalı şifre.");
        return false;
    }

    return true;
}

function openAdminPanel() {
    if (!askAdminPassword("Admin şifresini gir:")) return;

    const panel = $("adminPanel");
    if (panel) panel.classList.remove("hidden");

    renderAdminPlayers(true);
    updateAdminSummary();
}

function closeAdminPanel() {
    const panel = $("adminPanel");
    if (panel) panel.classList.add("hidden");
}

function renderAdminPlayers(force) {
    const container = $("adminPlayers");
    if (!container) return;

    // Admin bir kutuya yazarken otomatik yenileme odağı bozmasın
    const active = document.activeElement;
    if (
        !force &&
        active &&
        container.contains(active) &&
        (active.tagName === "INPUT" || active.tagName === "SELECT")
    ) {
        return;
    }

    container.innerHTML = players
        .map(name => {
            const status = playerStatuses[name];
            const profile = playerProfiles[name];

            let statusText = "⚪ Bekliyor";
            let statusClass = "";

            if (status === "Geliyorum") {
                statusText = "🟢 Geliyor";
                statusClass = "coming";
            }

            if (status === "Gelemiyorum") {
                statusText = "🔴 Gelmiyor";
                statusClass = "not-coming";
            }

            const options = POSITIONS.map(
                p => `<option value="${p}" ${p === profile.position ? "selected" : ""}>${p}</option>`
            ).join("");

            return `
                <div class="admin-player-row">
                    <span class="admin-player-name">${escapeHtml(name)}</span>
                    <div class="admin-rating-controls">
                        <select class="admin-position-select" data-name="${escapeHtml(name)}" aria-label="Mevki">
                            ${options}
                        </select>
                        <input
                            class="admin-rating-input"
                            type="number"
                            min="1"
                            max="100"
                            inputmode="numeric"
                            value="${profile.rating}"
                            data-name="${escapeHtml(name)}"
                            aria-label="Puan"
                        >
                        <span class="admin-player-status ${statusClass}">${statusText}</span>
                    </div>
                </div>`;
        })
        .join("");
}

function handleAdminRatingChange(event) {
    const target = event.target;
    const name = target.dataset ? target.dataset.name : "";

    if (!name || !players.includes(name)) return;

    const row = target.closest(".admin-player-row");
    if (!row) return;

    const ratingInput = row.querySelector(".admin-rating-input");
    const positionSelect = row.querySelector(".admin-position-select");

    const rating = clampRating(ratingInput.value);
    const position = positionSelect.value;

    ratingInput.value = rating;

    playerProfiles[name].rating = rating;
    playerProfiles[name].position = position;
    ratingEditedAt[name] = Date.now();

    saveLocalProfiles();
    updateProfileIfSelected();

    sendPost(
        { action: "rating", isim: name, puan: rating, mevki: position },
        error => {
            if (error) {
                alert("❌ Puan kaydedilemedi, tekrar dene.");
                return;
            }
            row.classList.add("saved");
            setTimeout(() => row.classList.remove("saved"), 1200);
        }
    );
}

function updateAdminSummary() {
    setText("adminComingCount", getComingPlayers().length);
    setText("adminPaidCount", getPaidPlayers().length);
}

/* ---------- TAKIM OLUŞTUR ---------- */

function generateTeams() {
    const coming = getComingPlayers();

    if (coming.length < 2) {
        alert("Takım oluşturmak için en az 2 kişi gelmeli.");
        return;
    }

    const loading = $("teamsLoading");
    if (loading) loading.classList.remove("hidden");

    setTimeout(() => {
        createBalancedTeams(coming);

        if (loading) loading.classList.add("hidden");

        const teamsSection = $("teamsSection");
        if (teamsSection) {
            teamsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, 350);
}

/*
   Puana göre dengeli dağıtım:
   - Oyuncular puana göre büyükten küçüğe sıralanır
     (küçük rastgelelik eklenir, her basışta farklı takım çıkar)
   - Her oyuncu, toplam puanı düşük olan takıma gider
   - Takım büyüklüğü farkı en fazla 1 kişidir
*/
function createBalancedTeams(names) {
    const sorted = names
        .map(name => ({
            name,
            rating: getRating(name),
            position: playerProfiles[name].position,
            sortKey: getRating(name) + Math.random() * 4
        }))
        .sort((a, b) => b.sortKey - a.sortKey);

    const maxSize = Math.ceil(names.length / 2);

    const teamA = [];
    const teamB = [];
    let sumA = 0;
    let sumB = 0;

    sorted.forEach(player => {
        let toA;

        if (teamA.length >= maxSize) toA = false;
        else if (teamB.length >= maxSize) toA = true;
        else if (sumA !== sumB) toA = sumA < sumB;
        else toA = Math.random() < 0.5;

        if (toA) {
            teamA.push(player);
            sumA += player.rating;
        } else {
            teamB.push(player);
            sumB += player.rating;
        }
    });

    renderTeams(teamA, teamB);
}

function renderTeamCard(title, team) {
    const total = team.reduce((sum, p) => sum + p.rating, 0);
    const average = team.length ? Math.round(total / team.length) : 0;

    return `
        <div class="team-card">
            <h3>${title}</h3>
            <div class="team-total">Toplam ${total} · Ortalama ${average}</div>
            ${team
                .map(
                    (player, index) => `
                        <div class="team-player">
                            <span>${index + 1}. ${escapeHtml(player.name)}</span>
                            <span>${escapeHtml(player.position)} · ⭐ ${player.rating}</span>
                        </div>`
                )
                .join("")}
        </div>`;
}

function renderTeams(teamA, teamB) {
    const grid = $("teamsGrid");
    if (!grid) return;

    grid.innerHTML =
        renderTeamCard("🟢 TAKIM YEŞİL", teamA) +
        renderTeamCard("⚪ TAKIM BEYAZ", teamB);
}

/* ---------- GEÇMİŞ ---------- */

function loadHistory() {
    renderHistory();
}

function renderHistory() {
    const container = $("historyList");
    if (!container) return;

    if (!historyData.length) {
        container.innerHTML = `
            <div class="history-item">
                <div class="history-date">BU HAFTA</div>
                <p>Bu haftanın maç geçmişi henüz oluşturulmadı.</p>
            </div>`;
        return;
    }

    container.innerHTML = historyData
        .map(
            item => `
                <div class="history-item">
                    <div class="history-date">${escapeHtml(item.date || "")}</div>
                    <p>${escapeHtml(item.text || "")}</p>
                </div>`
        )
        .join("");
}

function deleteHistory() {
    if (!askAdminPassword("Admin şifresini gir:")) return;

    if (!confirm("Maç geçmişini temizlemek istediğine emin misin?")) return;

    historyData = [];
    renderHistory();
}

/* ---------- YENİ HAFTA ---------- */

function clearWeek() {
    if (clearingWeek) return;

    if (!askAdminPassword("Yeni haftayı başlatmak için admin şifresini gir:")) return;

    if (!confirm("Bu haftanın tüm katılım ve ödeme durumlarını temizlemek istediğine emin misin?\n\n(Oyuncu puanları silinmez.)")) return;

    clearingWeek = true;

    players.forEach(name => {
        playerStatuses[name] = "";
        playerPayments[name] = "";
    });

    updateCounters();
    updateAttendanceLists();
    updatePaymentProgress();
    updateWeeklyStats();
    updateSelectedPlayer();
    renderAdminPlayers();
    updateAdminSummary();

    // Tek istekle her şeyi temizle (durum, ödeme, zaman, renkler). Puanlara dokunmaz.
    sendPost({ action: "clear" }, error => {
        if (error) {
            alert("❌ Yeni hafta başlatılamadı, tekrar dene.");
        }
    });

    // Sheets'in temizlemeyi bitirmesi için bekle, sonra veriyi tazele
    setTimeout(() => {
        clearingWeek = false;
        loadData();
        alert("Yeni hafta başlatıldı.");
    }, 2000);
}

/* ---------- LOADING / HATA ---------- */

function hideLoading() {
    const loading = $("loading");
    if (!loading) return;

    loading.classList.add("loaded");

    setTimeout(() => {
        loading.style.display = "none";
    }, 400);
}

function showConnectionError() {
    const error = $("connectionError");
    if (error) error.classList.remove("hidden");
}

function hideConnectionError() {
    const error = $("connectionError");
    if (error) error.classList.add("hidden");
}

/* ---------- OTOMATİK YENİLEME ---------- */

setInterval(() => {
    if (!clearingWeek && !actionInProgress && !dataLoading) {
        loadData();
    }
}, 5000);
