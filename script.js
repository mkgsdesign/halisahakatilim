/* =========================================
   BİZİM EKİP | HALI SAHA - DÜZELTİLMİŞ SÜRÜM
========================================= */

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw1032xl6q66hrmTwbD5WYnehlFFNZGwtxq9wwjSWgpGuTitiaGjke9sRJXLR8UL4hPgw/exec";

const MAX_PLAYERS = 14;
const ADMIN_PASSWORD = "1234";

const players = [
    "Mehmet Ali", "Fatih Keskin", "İsmet", "Numan", "Yasin", "Özek",
    "Hidayet", "Recep", "İbrahim Kök", "Dali", "SFR", "Emre",
    "Balcı", "Sefer", "Aşık", "Cio", "Tahsin", "kemal gönen"
];

const positions = ["Kaleci", "Defans", "Orta Saha", "Forvet"];

/* STATE */
let playerStatuses = {};
let playerPayments = {};
let playerProfiles = {};
let selectedPlayer = "";
let historyData = [];
let clearingWeek = false;
let dataLoading = false;
let actionInProgress = false;

/* SES */
let mainAudio = null;
let katilimAudio = null;
let haftayaBeklerizAudio = null;
let audioStarted = false;

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
    initializeState();
    createPlayerSelect();
    createProfileSelect();
    setupButtons();
    setupAudio();
    startCountdown();
    loadProfiles();
    loadData();
    loadHistory();
}

function initializeState() {
    players.forEach(name => {
        playerStatuses[name] = "";
        playerPayments[name] = "";
    });
}

/* =========================================
   İSİM EŞLEŞTİRME (boşluk / büyük-küçük harf farkını tolere eder)
========================================= */

function normalizeName(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase("tr-TR");
}

function findPlayerName(name) {
    const key = normalizeName(name);
    return players.find(p => normalizeName(p) === key) || null;
}

/* =========================================
   SELECT'LER
========================================= */

function createPlayerSelect() {
    const select = document.getElementById("playerSelect");
    if (!select) return;

    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Oyuncunu seç...";
    select.appendChild(defaultOption);

    players.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });

    select.addEventListener("change", updateSelectedPlayer);
}

function createProfileSelect() {
    const select = document.getElementById("profileSelect");
    if (!select) return;

    select.innerHTML = '<option value="">Profil görmek için oyuncu seç...</option>';

    players.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });

    select.addEventListener("change", function () {
        renderPlayerProfile(this.value);
    });
}

function updateSelectedPlayer() {
    selectedPlayer = document.getElementById("playerSelect").value;
    showSelectedPlayer();
}

function showSelectedPlayer() {
    const panel = document.getElementById("selectedPlayerPanel");
    const nameElement = document.getElementById("selectedPlayerName");

    if (!selectedPlayer) {
        panel.classList.add("hidden");
        return;
    }

    panel.classList.remove("hidden");
    nameElement.textContent = selectedPlayer;
    updateButtonStates();
}

function updateButtonStates() {
    if (!selectedPlayer) return;

    const status = playerStatuses[selectedPlayer] || "";

    const comingButton = document.getElementById("comingButton");
    const notComingButton = document.getElementById("notComingButton");
    const paymentButton = document.getElementById("paymentButton");

    comingButton.classList.toggle("active", status === "Geliyorum");
    notComingButton.classList.toggle("active", status === "Gelemiyorum");

    const full = getComingPlayers().length >= MAX_PLAYERS;

    if (full && status !== "Geliyorum") {
        comingButton.disabled = true;
        paymentButton.disabled = true;
    } else {
        comingButton.disabled = false;
        paymentButton.disabled = false;
    }

    if (playerPayments[selectedPlayer] === "Ödendi") {
        paymentButton.disabled = true;
        paymentButton.innerHTML = "✅ Ödeme Alındı";
    } else {
        paymentButton.innerHTML = "💳 Ödemeyi Yaptım <small>150 TL</small>";
    }
}

/* =========================================
   YOKLAMA VERİSİ YÜKLE
========================================= */

function loadData() {
    if (dataLoading) return;
    dataLoading = true;

    const callbackName = "sheetCallback_" + Date.now();

    window[callbackName] = function (data) {
        try {
            updatePlayers(data);
            updateCounters();
            updateAttendanceLists();
            updatePaymentProgress();
            updateWeeklyStats();
            updateAdminSummary();
            updateTeams();
            hideLoading();
            updateLastUpdate();
        } catch (error) {
            console.error(error);
            showConnectionError();
        } finally {
            dataLoading = false;
            delete window[callbackName];
        }
    };

    const script = document.createElement("script");
    script.src = SCRIPT_URL + "?callback=" + callbackName + "&_=" + Date.now();

    script.onerror = function () {
        dataLoading = false;
        showConnectionError();
    };

    document.body.appendChild(script);
}

/* Code.gs: { success:true, players:[{isim, durum, tarih, odeme}] } */
function updatePlayers(data) {
    const list = data && Array.isArray(data.players) ? data.players : null;

    if (!list) {
        console.error("Beklenmeyen veri:", data);
        return;
    }

    players.forEach(name => {
        playerStatuses[name] = "";
        playerPayments[name] = "";
    });

    list.forEach(item => {
        const name = findPlayerName(item.isim);

        if (!name) {
            console.warn("Eşleşmeyen isim:", item.isim);
            return;
        }

        playerStatuses[name] = String(item.durum || "").trim();
        playerPayments[name] = String(item.odeme || "").trim();
    });

    updateSelectedPlayerUI();
}

function updateSelectedPlayerUI() {
    if (!selectedPlayer) return;

    const select = document.getElementById("playerSelect");
    if (select.value !== selectedPlayer) select.value = selectedPlayer;

    updateButtonStates();
}

/* =========================================
   LİSTELER
========================================= */

function getComingPlayers() {
    return players.filter(n => playerStatuses[n] === "Geliyorum");
}

function getNotComingPlayers() {
    return players.filter(n => playerStatuses[n] === "Gelemiyorum");
}

function getWaitingPlayers() {
    return players.filter(n =>
        playerStatuses[n] !== "Geliyorum" && playerStatuses[n] !== "Gelemiyorum"
    );
}

function getPaidPlayers() {
    return players.filter(n => playerPayments[n] === "Ödendi");
}

function updateCounters() {
    const coming = getComingPlayers().length;

    document.getElementById("comingCount").textContent = `${coming}/${MAX_PLAYERS}`;
    document.getElementById("notComingCount").textContent = getNotComingPlayers().length;
    document.getElementById("waitingCount").textContent = getWaitingPlayers().length;

    const fullElement = document.getElementById("capacityFull");
    if (coming >= MAX_PLAYERS) fullElement.classList.remove("hidden");
    else fullElement.classList.add("hidden");

    updateButtonStates();
}

function renderPlayerList(elementId, names) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!names.length) {
        container.innerHTML =
            '<div class="player-list-item"><span class="player-dot"></span>Henüz kimse yok</div>';
        return;
    }

    container.innerHTML = names.map(name =>
        `<div class="player-list-item"><span class="player-dot"></span>${escapeHtml(name)}</div>`
    ).join("");
}

function updateAttendanceLists() {
    const coming = getComingPlayers();
    const notComing = getNotComingPlayers();
    const waiting = getWaitingPlayers();

    renderPlayerList("comingList", coming);
    renderPlayerList("notComingList", notComing);
    renderPlayerList("waitingList", waiting);

    document.getElementById("comingListCount").textContent = coming.length;
    document.getElementById("notComingListCount").textContent = notComing.length;
    document.getElementById("waitingListCount").textContent = waiting.length;
}

function updatePaymentProgress() {
    const paid = getPaidPlayers();
    const percentage = Math.min(100, (paid.length / MAX_PLAYERS) * 100);

    document.getElementById("paymentCount").textContent = `${paid.length}/${MAX_PLAYERS}`;
    document.getElementById("paymentProgress").style.width = percentage + "%";

    const paymentNames = document.getElementById("paymentNames");

    if (!paid.length) {
        paymentNames.textContent = "Henüz ödeme yapan yok.";
    } else {
        paymentNames.innerHTML = "Ödeyenler: " +
            paid.map(n => `<strong>${escapeHtml(n)}</strong>`).join(" • ");
    }
}

/* =========================================
   DURUM / ÖDEME
========================================= */

function setStatus(status) {
    if (!selectedPlayer) {
        alert("Önce oyuncunu seç.");
        return;
    }

    if (actionInProgress) return;

    const coming = getComingPlayers().length;
    const oldStatus = playerStatuses[selectedPlayer] || "";

    if (status === "Geliyorum" && oldStatus !== "Geliyorum" && coming >= MAX_PLAYERS) {
        alert("14 kişilik kontenjan dolu.");
        return;
    }

    actionInProgress = true;

    playerStatuses[selectedPlayer] = status;

    if (status === "Gelemiyorum") playerPayments[selectedPlayer] = "";

    updateCounters();
    updateAttendanceLists();
    updatePaymentProgress();
    updateWeeklyStats();

    if (status === "Geliyorum") playKatilimSound();
    else if (status === "Gelemiyorum") playHaftayaBeklerizSound();

    sendPost({ isim: selectedPlayer, durum: status }, function () {
        setTimeout(loadData, 400);
        actionInProgress = false;
    });
}

function setPayment() {
    if (!selectedPlayer) {
        alert("Önce oyuncunu seç.");
        return;
    }

    if (actionInProgress) return;

    const coming = getComingPlayers().length;
    const oldStatus = playerStatuses[selectedPlayer] || "";

    if (oldStatus !== "Geliyorum" && coming >= MAX_PLAYERS) {
        alert("14 kişilik kontenjan dolu.");
        return;
    }

    if (playerPayments[selectedPlayer] === "Ödendi") {
        alert("Bu oyuncunun ödemesi zaten kayıtlı.");
        return;
    }

    actionInProgress = true;

    playerStatuses[selectedPlayer] = "Geliyorum";
    playerPayments[selectedPlayer] = "Ödendi";

    updateCounters();
    updateAttendanceLists();
    updatePaymentProgress();
    updateWeeklyStats();

    playKatilimSound();

    sendPost({ action: "payment", isim: selectedPlayer }, function () {
        setTimeout(loadData, 400);
        actionInProgress = false;
    });
}

function sendPost(payload, callback) {
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
        .then(() => { if (callback) callback(); })
        .catch(error => {
            console.error("POST Hatası:", error);
            if (callback) callback();
        });
}

/* =========================================
   YENİ HAFTA
========================================= */

function clearWeek() {
    if (clearingWeek) return;

    const password = prompt("Yönetici şifresini gir:");
    if (password === null) return;

    if (password !== ADMIN_PASSWORD) {
        alert("Hatalı şifre!");
        return;
    }

    const confirmClear = confirm(
        "Yeni haftayı başlatmak istediğine emin misin?\n\nBu haftanın verileri geçmiş maçlara arşivlenecek ve mevcut katılım/ödeme bilgileri temizlenecek."
    );

    if (!confirmClear) return;

    clearingWeek = true;

    const button = document.getElementById("clearButton");
    button.disabled = true;
    button.textContent = "⏳ Hafta arşivleniyor...";

    const coming = getComingPlayers();
    const notComing = getNotComingPlayers();
    const waiting = getWaitingPlayers();
    const paid = getPaidPlayers();

    let teams = null;
    if (coming.length === MAX_PLAYERS) teams = createBalancedTeams(coming);

    /* Code.gs saveArchive Türkçe anahtarlar bekliyor */
    const archive = {
        tarih: new Date().toISOString(),
        katilanlar: coming,
        gelmeyenler: notComing,
        bekleyenler: waiting,
        odeyenler: paid,
        takimA: teams ? teams.teamA : [],
        takimB: teams ? teams.teamB : [],
        takimAPuan: teams ? getTeamRating(teams.teamA) : 0,
        takimBPuan: teams ? getTeamRating(teams.teamB) : 0
    };

    sendPost({ action: "clear", password: password, archive: archive }, function () {
        players.forEach(name => {
            playerStatuses[name] = "";
            playerPayments[name] = "";
        });

        selectedPlayer = "";
        document.getElementById("playerSelect").value = "";

        showSelectedPlayer();
        updateCounters();
        updateAttendanceLists();
        updatePaymentProgress();
        updateWeeklyStats();
        updateTeams();

        button.disabled = false;
        button.textContent = "🔄 Yeni Haftayı Başlat";
        clearingWeek = false;

        setTimeout(loadData, 600);
        setTimeout(loadHistory, 700);

        alert("Yeni hafta başlatıldı.\n\nBu haftanın bilgileri geçmiş maçlara kaydedildi.");
    });
}
function deleteHistory() {

    const password = prompt("Yönetici şifresini gir:");
    if (password === null) return;

    if (password !== ADMIN_PASSWORD) {
        alert("Hatalı şifre!");
        return;
    }

    const confirmDelete = confirm(
        "TÜM geçmiş maç arşivi kalıcı olarak silinecek.\n\nBu işlem geri alınamaz. Emin misin?"
    );

    if (!confirmDelete) return;

    const button = document.getElementById("deleteHistoryButton");
    button.disabled = true;
    button.textContent = "⏳ Arşiv siliniyor...";

    sendPost({ action: "deleteHistory", password: password }, function () {

        historyData = [];
        renderHistory();
        updateProfileIfSelected();

        button.disabled = false;
        button.textContent = "🗑️ Tüm Arşivi Sil";

        setTimeout(loadHistory, 800);

        alert("Tüm geçmiş arşiv silindi.");

    });
}


/* =========================================
   PROFİLLER
========================================= */

/* Code.gs: { success:true, profiles:{ isim:{isim,mevki,puan} } } */
function loadProfiles() {
    const callbackName = "profileCallback_" + Date.now();

    window[callbackName] = function (data) {
        try {
            if (data && data.profiles) {
                playerProfiles = {};

                Object.keys(data.profiles).forEach(key => {
                    const profile = data.profiles[key];
                    const name = findPlayerName(key) || key;

                    playerProfiles[name] = {
                        mevki: profile.mevki || "Orta Saha",
                        puan: Number(profile.puan) || 5
                    };
                });

                renderAdminPlayers();
                updateTeams();
            }
        } catch (error) {
            console.error(error);
        } finally {
            delete window[callbackName];
        }
    };

    const script = document.createElement("script");
    script.src = SCRIPT_URL + "?action=profiles&callback=" + callbackName + "&_=" + Date.now();
    document.body.appendChild(script);
}

function renderPlayerProfile(name) {
    const card = document.getElementById("profileCard");

    if (!name) {
        card.classList.add("hidden");
        return;
    }

    const profile = playerProfiles[name] || { mevki: "Orta Saha", puan: 5 };

    const attended = historyData.filter(week =>
        Array.isArray(week.coming) && week.coming.includes(name)
    ).length;

    const paid = historyData.filter(week =>
        Array.isArray(week.paid) && week.paid.includes(name)
    ).length;

    const currentAttendance = playerStatuses[name] === "Geliyorum";

    card.classList.remove("hidden");

    card.innerHTML = `
        <div class="profile-top">
            <div class="profile-avatar">⚽</div>
            <div>
                <div class="profile-name">${escapeHtml(name)}</div>
                <div class="profile-position">${escapeHtml(profile.mevki)}</div>
            </div>
            <div class="profile-rating">
                <strong>${profile.puan}</strong>
                <span>PUAN</span>
            </div>
        </div>
        <div class="profile-stat-grid">
            <div class="profile-stat"><strong>${attended}</strong><span>Geçmiş Katılım</span></div>
            <div class="profile-stat"><strong>${paid}</strong><span>Ödeme</span></div>
            <div class="profile-stat"><strong>${currentAttendance ? "✓" : "—"}</strong><span>Bu Hafta</span></div>
        </div>
    `;
}

/* =========================================
   ADMIN
========================================= */

function openAdminPanel() {
    const password = prompt("Yönetici şifresini gir:");
    if (password === null) return;

    if (password !== ADMIN_PASSWORD) {
        alert("Hatalı şifre!");
        return;
    }

    document.getElementById("adminPanel").classList.remove("hidden");
    renderAdminPlayers();
    updateAdminSummary();
}

function closeAdminPanel() {
    document.getElementById("adminPanel").classList.add("hidden");
}

function renderAdminPlayers() {
    const container = document.getElementById("adminPlayers");
    if (!container) return;

    container.innerHTML = "";

    players.forEach(name => {
        const profile = playerProfiles[name] || { mevki: "Orta Saha", puan: 5 };

        const row = document.createElement("div");
        row.className = "admin-player-row";

        const nameElement = document.createElement("div");
        nameElement.className = "admin-player-name";
        nameElement.textContent = name;
        row.appendChild(nameElement);

        const select = document.createElement("select");
        positions.forEach(position => {
            const option = document.createElement("option");
            option.value = position;
            option.textContent = position;
            if (position === profile.mevki) option.selected = true;
            select.appendChild(option);
        });
        row.appendChild(select);

        const input = document.createElement("input");
        input.type = "number";
        input.min = "1";
        input.max = "10";
        input.value = profile.puan;
        row.appendChild(input);

        const saveButton = document.createElement("button");
        saveButton.className = "save-player-button";
        saveButton.textContent = "Kaydet";
        saveButton.addEventListener("click", function () {
            savePlayerProfile(name, select.value, input.value, saveButton);
        });
        row.appendChild(saveButton);

        container.appendChild(row);
    });
}

function savePlayerProfile(name, mevki, puan, button) {
    const password = prompt("Yönetici şifresini gir:");
    if (password === null) return;

    if (password !== ADMIN_PASSWORD) {
        alert("Hatalı şifre!");
        return;
    }

    puan = Number(puan);

    if (isNaN(puan) || puan < 1 || puan > 10) {
        alert("Puan 1 ile 10 arasında olmalı.");
        return;
    }

    button.disabled = true;
    button.textContent = "...";

    sendPost(
        { action: "savePlayer", password: password, isim: name, mevki: mevki, puan: puan },
        function () {
            playerProfiles[name] = { mevki: mevki, puan: puan };

            button.disabled = false;
            button.textContent = "Kaydedildi ✓";

            updateTeams();
            renderPlayerProfile(document.getElementById("profileSelect").value);

            setTimeout(() => { button.textContent = "Kaydet"; }, 1200);
        }
    );
}

function updateAdminSummary() {
    const coming = getComingPlayers().length;
    const paid = getPaidPlayers().length;

    const comingElement = document.getElementById("adminComingCount");
    const paidElement = document.getElementById("adminPaidCount");

    if (comingElement) comingElement.textContent = `${coming} / ${MAX_PLAYERS}`;
    if (paidElement) paidElement.textContent = `${paid} / ${MAX_PLAYERS}`;
}

/* =========================================
   TAKIMLAR
========================================= */

function updateTeams() {
    const comingPlayers = getComingPlayers();
    const grid = document.getElementById("teamsGrid");
    if (!grid) return;

    if (comingPlayers.length !== MAX_PLAYERS) {
        grid.innerHTML = `
            <div class="empty-team-card">
                <div class="empty-team-icon">⚽</div>
                <h3>Takımlar bekleniyor</h3>
                <p>Otomatik 7v7 takım oluşturmak için 14 kişinin de <strong>Geliyorum</strong> demesi gerekiyor.</p>
                <div class="team-wait-count">${comingPlayers.length}/14</div>
            </div>
        `;
        return;
    }

    renderTeams(createBalancedTeams(comingPlayers));
}

function createBalancedTeams(playerNames) {
    const allPlayers = playerNames.map(name => {
        const profile = playerProfiles[name] || { mevki: "Orta Saha", puan: 5 };
        return {
            isim: name,
            mevki: profile.mevki,
            puan: Number(profile.puan) || 5
        };
    });

    const combinations = getCombinations(allPlayers, 7);

    let bestTeams = null;
    let bestScore = Infinity;

    combinations.forEach(teamA => {
        const teamANames = new Set(teamA.map(p => p.isim));
        const teamB = allPlayers.filter(p => !teamANames.has(p.isim));
        const score = calculateTeamScore(teamA, teamB);

        if (score < bestScore) {
            bestScore = score;
            bestTeams = { teamA: teamA, teamB: teamB };
        }
    });

    return bestTeams;
}

function getCombinations(array, size) {
    const result = [];

    function combine(start, current) {
        if (current.length === size) {
            result.push([...current]);
            return;
        }

        for (let i = start; i < array.length; i++) {
            current.push(array[i]);
            combine(i + 1, current);
            current.pop();
        }
    }

    combine(0, []);
    return result;
}

function calculateTeamScore(teamA, teamB) {
    let score = Math.abs(getTeamRating(teamA) - getTeamRating(teamB)) * 100;

    positions.forEach(position => {
        const countA = teamA.filter(p => p.mevki === position).length;
        const countB = teamB.filter(p => p.mevki === position).length;
        score += Math.abs(countA - countB) * 25;
    });

    const gkA = teamA.filter(p => p.mevki === "Kaleci").length;
    const gkB = teamB.filter(p => p.mevki === "Kaleci").length;
    score += Math.abs(gkA - gkB) * 80;

    return score;
}

function getTeamRating(team) {
    return team.reduce((sum, p) => sum + Number(p.puan || 0), 0);
}

function sortPlayersByPosition(playersArray) {
    const order = { "Kaleci": 1, "Defans": 2, "Orta Saha": 3, "Forvet": 4 };
    return [...playersArray].sort((a, b) => order[a.mevki] - order[b.mevki]);
}

function renderTeams(teams) {
    const grid = document.getElementById("teamsGrid");

    const teamA = sortPlayersByPosition(teams.teamA);
    const teamB = sortPlayersByPosition(teams.teamB);

    grid.innerHTML = `
        <div class="team-card team-a">
            <div class="team-header">
                <div class="team-name">🟢 TAKIM A</div>
                <div class="team-total">${getTeamRating(teamA)} puan</div>
            </div>
            <div class="team-players">${createTeamPlayersHTML(teamA)}</div>
        </div>
        <div class="team-card team-b">
            <div class="team-header">
                <div class="team-name">🟡 TAKIM B</div>
                <div class="team-total">${getTeamRating(teamB)} puan</div>
            </div>
            <div class="team-players">${createTeamPlayersHTML(teamB)}</div>
        </div>
    `;
}

function createTeamPlayersHTML(team) {
    return team.map((player, index) => `
        <div class="team-player">
            <div class="team-player-left">
                <div class="team-player-number">${index + 1}</div>
                <div>
                    <div class="team-player-name">${escapeHtml(player.isim)}</div>
                    <div class="team-player-position">${escapeHtml(player.mevki)}</div>
                </div>
            </div>
        </div>
    `).join("");
}

function generateTeams() {
    if (getComingPlayers().length !== MAX_PLAYERS) {
        alert("Takım oluşturmak için tam 14 kişi Geliyorum olmalı.");
        return;
    }

    updateTeams();
    document.getElementById("teamsSection").scrollIntoView({ behavior: "smooth" });
}

/* =========================================
   GEÇMİŞ
========================================= */

/* Code.gs: { success:true, history:[{tarih,katilanlar,odeyenler,takimA,takimB,...}] } */
function loadHistory() {
    const callbackName = "historyCallback_" + Date.now();

    window[callbackName] = function (data) {
        try {
            if (data && Array.isArray(data.history)) {
                historyData = data.history.map(h => ({
                    date: h.tarih,
                    coming: h.katilanlar,
                    paid: h.odeyenler,
                    teamA: h.takimA,
                    teamB: h.takimB,
                    teamARating: h.takimAPuan,
                    teamBRating: h.takimBPuan,
                    notComing: h.gelmeyenler,
                    waiting: h.bekleyenler
                }));

                renderHistory();
                updateProfileIfSelected();
            }
        } catch (error) {
            console.error(error);
        } finally {
            delete window[callbackName];
        }
    };

    const script = document.createElement("script");
    script.src = SCRIPT_URL + "?action=history&callback=" + callbackName + "&_=" + Date.now();
    document.body.appendChild(script);
}

function historyTeamText(team) {
    if (!team.length) return "Takım bilgisi yok";

    return team.map(p =>
        escapeHtml(typeof p === "string" ? p : p.isim)
    ).join(" • ");
}

function renderHistory() {
    const container = document.getElementById("historyList");
    if (!container) return;

    if (!historyData.length) {
        container.innerHTML = `
            <div class="history-empty">
                📅 Henüz geçmiş maç bulunmuyor.<br>
                İlk hafta tamamlandığında burada görünecek.
            </div>
        `;
        return;
    }

    container.innerHTML = historyData.slice().reverse().map(week => {
        const teamA = Array.isArray(week.teamA) ? week.teamA : [];
        const teamB = Array.isArray(week.teamB) ? week.teamB : [];
        const coming = Array.isArray(week.coming) ? week.coming : [];

        return `
            <div class="history-card">
                <div class="history-card-top">
                    <div class="history-date">📅 ${formatHistoryDate(week.date)}</div>
                    <div class="history-count">${coming.length} katılımcı</div>
                </div>
                <div class="history-teams">
                    <div class="history-team">
                        <strong>🟢 Takım A ${Number(week.teamARating) || 0} puan</strong>
                        ${historyTeamText(teamA)}
                    </div>
                    <div class="history-team">
                        <strong>🟡 Takım B ${Number(week.teamBRating) || 0} puan</strong>
                        ${historyTeamText(teamB)}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function formatHistoryDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function updateProfileIfSelected() {
    const select = document.getElementById("profileSelect");
    if (select && select.value) renderPlayerProfile(select.value);
}

/* =========================================
   HAFTALIK İSTATİSTİK
========================================= */

function updateWeeklyStats() {
    const coming = getComingPlayers().length;

    document.getElementById("statTotalPlayers").textContent = players.length;
    document.getElementById("statComing").textContent = coming;
    document.getElementById("statPaid").textContent = getPaidPlayers().length;
    document.getElementById("statWaiting").textContent = getWaitingPlayers().length;

    const highlight = document.getElementById("weeklyHighlight");

    if (coming === MAX_PLAYERS) {
        highlight.innerHTML = "🔥 <strong>Maç kadrosu tamamlandı!</strong> 14 kişilik kadro hazır.";
    } else if (coming > 0) {
        highlight.innerHTML = `⚽ Kadro için <strong>${MAX_PLAYERS - coming} kişi</strong> daha gerekiyor.`;
    } else {
        highlight.innerHTML = "👥 Henüz katılım bildirimi yapılmadı.";
    }
}

/* =========================================
   IBAN
========================================= */

function copyIban() {
    const iban = document.getElementById("ibanText").textContent.trim();

    navigator.clipboard.writeText(iban)
        .then(() => {
            const button = document.getElementById("copyIbanButton");
            const oldText = button.textContent;
            button.textContent = "✅ Kopyalandı";
            setTimeout(() => { button.textContent = oldText; }, 1500);
        })
        .catch(() => { alert("IBAN: " + iban); });
}

/* =========================================
   GERİ SAYIM
========================================= */

function getNextMatchDate() {
    const now = new Date();
    const target = new Date(now);
    const day = now.getDay();

    let daysUntilTuesday = (2 - day + 7) % 7;

    if (
        daysUntilTuesday === 0 &&
        (now.getHours() > 22 ||
            (now.getHours() === 22 && (now.getMinutes() > 0 || now.getSeconds() > 0)))
    ) {
        daysUntilTuesday = 7;
    }

    target.setDate(now.getDate() + daysUntilTuesday);
    target.setHours(22, 0, 0, 0);

    return target;
}

function startCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    let difference = getNextMatchDate().getTime() - new Date().getTime();
    if (difference < 0) difference = 0;

    const totalSeconds = Math.floor(difference / 1000);

    document.getElementById("countDays").textContent = pad(Math.floor(totalSeconds / 86400));
    document.getElementById("countHours").textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
    document.getElementById("countMinutes").textContent = pad(Math.floor((totalSeconds % 3600) / 60));
    document.getElementById("countSeconds").textContent = pad(totalSeconds % 60);
    document.getElementById("countdownText").textContent = "Sonraki maç: Salı 22:00";
}

function pad(number) {
    return String(number).padStart(2, "0");
}

/* =========================================
   SES
========================================= */

function setupAudio() {
    mainAudio = new Audio("arka.mp3");
    katilimAudio = new Audio("katilim.mp3");
    haftayaBeklerizAudio = new Audio("haftaya-bekleriz.mp3");

    mainAudio.loop = true;
    mainAudio.volume = 0.20;
    katilimAudio.volume = 0.75;
    haftayaBeklerizAudio.volume = 0.75;

    const audioButton = document.getElementById("audioButton");
    if (audioButton) audioButton.addEventListener("click", toggleMainAudio);

    audioStarted = false;
    updateAudioButton(false);
}

function toggleMainAudio() {
    if (!mainAudio) return;

    if (mainAudio.paused) {
        mainAudio.play()
            .then(() => {
                audioStarted = true;
                updateAudioButton(true);
            })
            .catch(error => console.log("Ses başlatılamadı:", error));
    } else {
        mainAudio.pause();
        audioStarted = false;
        updateAudioButton(false);
    }
}

function updateAudioButton(isPlaying) {
    const button = document.getElementById("audioButton");
    if (!button) return;

    if (isPlaying) {
        button.innerHTML = "🔊";
        button.title = "Sesi Kapat";
        button.classList.add("audio-playing");
    } else {
        button.innerHTML = "🔇";
        button.title = "Sesi Aç";
        button.classList.remove("audio-playing");
    }
}

function playKatilimSound() {
    if (!katilimAudio) return;
    katilimAudio.currentTime = 0;
    katilimAudio.play().catch(e => console.log("Katılım sesi oynatılamadı:", e));
}

function playHaftayaBeklerizSound() {
    if (!haftayaBeklerizAudio) return;
    haftayaBeklerizAudio.currentTime = 0;
    haftayaBeklerizAudio.play().catch(e => console.log("Ses oynatılamadı:", e));
}

/* =========================================
   BUTONLAR
========================================= */

function setupButtons() {
    document.getElementById("comingButton").addEventListener("click", () => setStatus("Geliyorum"));
    document.getElementById("notComingButton").addEventListener("click", () => setStatus("Gelemiyorum"));
    document.getElementById("paymentButton").addEventListener("click", setPayment);
    document.getElementById("clearButton").addEventListener("click", clearWeek);
    document.getElementById("deleteHistoryButton").addEventListener("click", deleteHistory);
    document.getElementById("adminOpenButton").addEventListener("click", openAdminPanel);
    document.getElementById("adminCloseButton").addEventListener("click", closeAdminPanel);
    document.getElementById("generateTeamsButton").addEventListener("click", generateTeams);
    document.getElementById("adminGenerateTeams").addEventListener("click", generateTeams);
    document.getElementById("copyIbanButton").addEventListener("click", copyIban);
}

/* =========================================
   LOADING / HATA
========================================= */

function hideLoading() {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("connectionError").classList.add("hidden");
}

function showConnectionError() {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("connectionError").classList.remove("hidden");
}

function updateLastUpdate() {
    const time = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    document.getElementById("lastUpdate").textContent = "Son güncelleme: " + time;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
