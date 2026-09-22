/* =========================================
   BİZİM EKİP | HALI SAHA
   GOOGLE SHEETS + APPS SCRIPT
========================================= */


/* =========================================
   AYARLAR
========================================= */

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw1032xl6q66hrmTwbD5WYnehlFFNZGwtxq9wwjSWgpGuTitiaGjke9sRJXLR8UL4hPgw/exec";


const MAX_PLAYERS = 14;

const ADMIN_PASSWORD = "1234";


const players = [

    "Mehmet Ali",
    "Fatih Keskin",
    "İsmet",
    "Numan",
    "Yasin",
    "Özek",
    "Hidayet",
    "Recep",
    "İbrahim Kök",
    "Dali",
    "SFR",
    "Emre",
    "Balcı",
    "Sefer",
    "Aşık",
    "Cio",
    "Tahsin",
    "kemal gönen"

];


/* =========================================
   POZİSYONLAR
========================================= */

const positions = [

    "Kaleci",
    "Defans",
    "Orta Saha",
    "Forvet"

];


/* =========================================
   DURUM
========================================= */

let playerStatuses = {};

let playerPayments = {};

let playerProfiles = {};

let selectedPlayer = "";

let clearingWeek = false;

let dataLoading = false;

let actionInProgress = false;


/* =========================================
   SESLER
========================================= */

let mainAudio = null;

let katilimAudio = null;

let haftayaBeklerizAudio = null;

let audioStarted = false;


/* =========================================
   SAYFA BAŞLANGICI
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);


/* =========================================
   INIT
========================================= */

function initializeApp() {

    initializeState();

    createPlayerSelect();

    setupButtons();

    setupAudio();

    loadProfiles();

    loadData();

}


/* =========================================
   STATE
========================================= */

function initializeState() {

    players.forEach(name => {

        playerStatuses[name] =
            "";

        playerPayments[name] =
            "";

    });

}


/* =========================================
   OYUNCU SELECT
========================================= */

function createPlayerSelect() {

    const select =
        document.getElementById(
            "playerSelect"
        );

    if (!select) {
        return;
    }


    select.innerHTML = "";

    const defaultOption =
        document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent =
        "Oyuncunu seç...";

    select.appendChild(
        defaultOption
    );


    players.forEach(name => {

        const option =
            document.createElement("option");

        option.value = name;

        option.textContent = name;

        select.appendChild(option);

    });


    select.addEventListener(
        "change",
        updateSelectedPlayer
    );

}


/* =========================================
   SEÇİLEN OYUNCU
========================================= */

function updateSelectedPlayer() {

    const select =
        document.getElementById(
            "playerSelect"
        );

    selectedPlayer =
        select.value;


    showSelectedPlayer();

}


/* =========================================
   OYUNCU PANELİ
========================================= */

function showSelectedPlayer() {

    const panel =
        document.getElementById(
            "selectedPlayerPanel"
        );

    const nameElement =
        document.getElementById(
            "selectedPlayerName"
        );


    if (!selectedPlayer) {

        panel.classList.add(
            "hidden"
        );

        return;

    }


    panel.classList.remove(
        "hidden"
    );


    nameElement.textContent =
        selectedPlayer;


    updateButtonStates();

}


/* =========================================
   BUTON DURUMLARI
========================================= */

function updateButtonStates() {

    if (!selectedPlayer) {
        return;
    }


    const status =
        playerStatuses[
            selectedPlayer
        ] || "";


    const comingButton =
        document.getElementById(
            "comingButton"
        );

    const notComingButton =
        document.getElementById(
            "notComingButton"
        );

    const paymentButton =
        document.getElementById(
            "paymentButton"
        );


    comingButton.classList.toggle(
        "active",
        status === "Geliyorum"
    );


    notComingButton.classList.toggle(
        "active",
        status === "Gelemiyorum"
    );


    const comingCount =
        Object.values(
            playerStatuses
        )
        .filter(
            value =>
                value === "Geliyorum"
        )
        .length;


    /*
       14 kişi dolduysa:
       zaten gelen kişi kendisini
       görebilmeye devam eder.
    */

    const full =
        comingCount >= MAX_PLAYERS;


    if (
        full &&
        status !== "Geliyorum"
    ) {

        comingButton.disabled =
            true;

        paymentButton.disabled =
            true;

    }

    else {

        comingButton.disabled =
            false;

        paymentButton.disabled =
            false;

    }


    /*
       Ödenmişse tekrar ödeme yapmasın.
    */

    if (
        playerPayments[selectedPlayer] ===
        "Ödendi"
    ) {

        paymentButton.disabled =
            true;

        paymentButton.innerHTML =
            "✅ Ödeme Alındı";

    }

    else {

        paymentButton.innerHTML =
            "💳 Ödemeyi Yaptım <small>150 TL</small>";

    }

}


/* =========================================
   DATA YÜKLE
========================================= */

function loadData() {

    if (dataLoading) {
        return;
    }


    dataLoading = true;


    const callbackName =
        "sheetCallback_" +
        Date.now();


    window[callbackName] =
        function(data) {

            try {

                updatePlayers(data);

                updateCounters();

                updateTeams();

                hideLoading();

                updateLastUpdate();

            }

            catch (error) {

                console.error(
                    error
                );

                showConnectionError();

            }

            finally {

                dataLoading =
                    false;

                delete window[
                    callbackName
                ];

            }

        };


    const script =
        document.createElement(
            "script"
        );


    script.src =
        SCRIPT_URL +
        "?callback=" +
        callbackName +
        "&_=" +
        Date.now();


    script.onerror =
        function() {

            dataLoading =
                false;

            showConnectionError();

        };


    document.body.appendChild(
        script
    );

}


/* =========================================
   DATA İŞLE
========================================= */

function updatePlayers(data) {

    if (!Array.isArray(data)) {
        return;
    }


    for (
        let i = 1;
        i < data.length;
        i++
    ) {

        const row =
            data[i];


        if (!row || !row[0]) {
            continue;
        }


        const name =
            String(row[0]).trim();


        if (
            !players.includes(name)
        ) {
            continue;
        }


        playerStatuses[name] =
            String(
                row[1] || ""
            ).trim();


        playerPayments[name] =
            String(
                row[3] || ""
            ).trim();

    }


    updateSelectedPlayerUI();

}


/* =========================================
   SEÇİLEN OYUNCUYU GÜNCELLE
========================================= */

function updateSelectedPlayerUI() {

    if (!selectedPlayer) {
        return;
    }


    const select =
        document.getElementById(
            "playerSelect"
        );


    if (
        select.value !==
        selectedPlayer
    ) {

        select.value =
            selectedPlayer;

    }


    updateButtonStates();

}


/* =========================================
   SAYILAR
========================================= */

function updateCounters() {

    const statuses =
        Object.values(
            playerStatuses
        );


    const coming =
        statuses.filter(
            status =>
                status === "Geliyorum"
        ).length;


    const notComing =
        statuses.filter(
            status =>
                status === "Gelemiyorum"
        ).length;


    const waiting =
        players.length -
        coming -
        notComing;


    document.getElementById(
        "comingCount"
    ).textContent =
        `${coming}/${MAX_PLAYERS}`;


    document.getElementById(
        "notComingCount"
    ).textContent =
        notComing;


    document.getElementById(
        "waitingCount"
    ).textContent =
        waiting;


    const fullElement =
        document.getElementById(
            "capacityFull"
        );


    if (
        coming >= MAX_PLAYERS
    ) {

        fullElement.classList.remove(
            "hidden"
        );

    }

    else {

        fullElement.classList.add(
            "hidden"
        );

    }


    updateButtonStates();

}


/* =========================================
   DURUM DEĞİŞTİR
========================================= */

function setStatus(status) {

    if (!selectedPlayer) {

        alert(
            "Önce oyuncunu seç."
        );

        return;

    }


    if (actionInProgress) {
        return;
    }


    /*
       Ön kontrol
    */

    const coming =
        Object.values(
            playerStatuses
        )
        .filter(
            value =>
                value === "Geliyorum"
        )
        .length;


    const oldStatus =
        playerStatuses[
            selectedPlayer
        ] || "";


    if (
        status === "Geliyorum" &&
        oldStatus !== "Geliyorum" &&
        coming >= MAX_PLAYERS
    ) {

        alert(
            "14 kişilik kontenjan dolu."
        );

        return;

    }


    actionInProgress = true;


    /*
       UI'ı anında güncelle
    */

    playerStatuses[
        selectedPlayer
    ] = status;


    updateCounters();


    /*
       Ses
    */

    if (
        status === "Geliyorum"
    ) {

        playKatilimSound();

    }

    else if (
        status === "Gelemiyorum"
    ) {

        playHaftayaBeklerizSound();

    }


    const payload = {

        isim:
            selectedPlayer,

        durum:
            status

    };


    sendPost(
        payload,
        function() {

            setTimeout(
                loadData,
                400
            );

            actionInProgress =
                false;

        }
    );

}


/* =========================================
   ÖDEME
========================================= */

function setPayment() {

    if (!selectedPlayer) {

        alert(
            "Önce oyuncunu seç."
        );

        return;

    }


    if (actionInProgress) {
        return;
    }


    const coming =
        Object.values(
            playerStatuses
        )
        .filter(
            value =>
                value === "Geliyorum"
        ).length;


    const oldStatus =
        playerStatuses[
            selectedPlayer
        ] || "";


    if (
        oldStatus !== "Geliyorum" &&
        coming >= MAX_PLAYERS
    ) {

        alert(
            "14 kişilik kontenjan dolu."
        );

        return;

    }


    actionInProgress = true;


    /*
       Ödeme otomatik olarak
       Geliyorum yapıyor.
    */

    playerStatuses[
        selectedPlayer
    ] = "Geliyorum";


    playerPayments[
        selectedPlayer
    ] = "Ödendi";


    updateCounters();


    /*
       Katılım sesi
    */

    playKatilimSound();


    sendPost(

        {
            action:
                "payment",

            isim:
                selectedPlayer

        },

        function() {

            setTimeout(
                loadData,
                400
            );

            actionInProgress =
                false;

        }

    );

}


/* =========================================
   POST GÖNDER
========================================= */

function sendPost(
    payload,
    callback
) {

    fetch(
        SCRIPT_URL,
        {

            method:
                "POST",

            mode:
                "no-cors",

            headers:
                {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

            body:
                JSON.stringify(
                    payload
                )

        }
    )
    .then(
        () => {

            if (callback) {
                callback();
            }

        }
    )
    .catch(
        error => {

            console.error(
                "POST Hatası:",
                error
            );

            if (callback) {
                callback();
            }

        }
    );

}


/* =========================================
   YENİ HAFTA
========================================= */

function clearWeek() {

    if (clearingWeek) {
        return;
    }


    const password =
        prompt(
            "Yönetici şifresini gir:"
        );


    if (password === null) {
        return;
    }


    if (
        password !==
        ADMIN_PASSWORD
    ) {

        alert(
            "Hatalı şifre!"
        );

        return;

    }


    const confirmClear =
        confirm(
            "Yeni haftayı başlatmak istediğine emin misin?\n\nKatılım ve ödeme bilgileri temizlenecek."
        );


    if (!confirmClear) {
        return;
    }


    clearingWeek = true;


    const button =
        document.getElementById(
            "clearButton"
        );


    button.disabled =
        true;

    button.textContent =
        "⏳ Hafta temizleniyor...";


    sendPost(

        {
            action:
                "clear",

            password:
                password

        },

        function() {

            players.forEach(
                name => {

                    playerStatuses[name] =
                        "";

                    playerPayments[name] =
                        "";

                }
            );


            selectedPlayer =
                "";


            document.getElementById(
                "playerSelect"
            ).value =
                "";


            showSelectedPlayer();

            updateCounters();

            updateTeams();


            button.disabled =
                false;

            button.textContent =
                "🔄 Yeni Haftayı Başlat";


            clearingWeek =
                false;


            setTimeout(
                loadData,
                500
            );

            alert(
                "Yeni hafta başlatıldı."
            );

        }

    );

}


/* =========================================
   PROFİLLERİ YÜKLE
========================================= */

function loadProfiles() {

    const callbackName =
        "profileCallback_" +
        Date.now();


    window[callbackName] =
        function(data) {

            try {

                if (
                    Array.isArray(data)
                ) {

                    playerProfiles =
                        {};

                    data.forEach(
                        profile => {

                            playerProfiles[
                                profile.isim
                            ] = {

                                mevki:
                                    profile.mevki ||
                                    "Orta Saha",

                                puan:
                                    Number(
                                        profile.puan
                                    ) || 5

                            };

                        }
                    );


                    renderAdminPlayers();

                    updateTeams();

                }

            }

            catch (error) {

                console.error(
                    error
                );

            }

            finally {

                delete window[
                    callbackName
                ];

            }

        };


    const script =
        document.createElement(
            "script"
        );


    script.src =
        SCRIPT_URL +
        "?action=profiles" +
        "&callback=" +
        callbackName +
        "&_=" +
        Date.now();


    document.body.appendChild(
        script
    );

}


/* =========================================
   ADMIN PANEL
========================================= */

function openAdminPanel() {

    const password =
        prompt(
            "Yönetici şifresini gir:"
        );


    if (password === null) {
        return;
    }


    if (
        password !==
        ADMIN_PASSWORD
    ) {

        alert(
            "Hatalı şifre!"
        );

        return;

    }


    document.getElementById(
        "adminPanel"
    )
    .classList.remove(
        "hidden"
    );


    renderAdminPlayers();

}


function closeAdminPanel() {

    document.getElementById(
        "adminPanel"
    )
    .classList.add(
        "hidden"
    );

}


/* =========================================
   ADMIN OYUNCULAR
========================================= */

function renderAdminPlayers() {

    const container =
        document.getElementById(
            "adminPlayers"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    players.forEach(
        name => {

            const profile =
                playerProfiles[name] ||
                {

                    mevki:
                        "Orta Saha",

                    puan:
                        5

                };


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "admin-player-row";


            const nameElement =
                document.createElement(
                    "div"
                );


            nameElement.className =
                "admin-player-name";


            nameElement.textContent =
                name;


            row.appendChild(
                nameElement
            );


            const select =
                document.createElement(
                    "select"
                );


            positions.forEach(
                position => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        position;

                    option.textContent =
                        position;

                    if (
                        position ===
                        profile.mevki
                    ) {

                        option.selected =
                            true;

                    }

                    select.appendChild(
                        option
                    );

                }
            );


            row.appendChild(
                select
            );


            const input =
                document.createElement(
                    "input"
                );


            input.type =
                "number";

            input.min =
                "1";

            input.max =
                "10";

            input.value =
                profile.puan;


            row.appendChild(
                input
            );


            const saveButton =
                document.createElement(
                    "button"
                );


            saveButton.className =
                "save-player-button";


            saveButton.textContent =
                "Kaydet";


            saveButton.addEventListener(
                "click",
                function() {

                    savePlayerProfile(
                        name,
                        select.value,
                        input.value,
                        saveButton
                    );

                }
            );


            row.appendChild(
                saveButton
            );


            container.appendChild(
                row
            );

        }
    );

}


/* =========================================
   PROFİL KAYDET
========================================= */

function savePlayerProfile(
    name,
    mevki,
    puan,
    button
) {

    const password =
        prompt(
            "Yönetici şifresini gir:"
        );


    if (password === null) {
        return;
    }


    if (
        password !==
        ADMIN_PASSWORD
    ) {

        alert(
            "Hatalı şifre!"
        );

        return;

    }


    puan =
        Number(puan);


    if (
        isNaN(puan) ||
        puan < 1 ||
        puan > 10
    ) {

        alert(
            "Puan 1 ile 10 arasında olmalı."
        );

        return;

    }


    button.disabled =
        true;

    button.textContent =
        "...";


    sendPost(

        {

            action:
                "savePlayer",

            password:
                password,

            isim:
                name,

            mevki:
                mevki,

            puan:
                puan

        },

        function() {

            playerProfiles[name] = {

                mevki:
                    mevki,

                puan:
                    puan

            };


            button.disabled =
                false;

            button.textContent =
                "Kaydedildi ✓";


            updateTeams();


            setTimeout(
                () => {

                    button.textContent =
                        "Kaydet";

                },
                1200
            );

        }

    );

}


/* =========================================
   TAKIMLARI GÜNCELLE
========================================= */

function updateTeams() {

    const comingPlayers =
        players.filter(
            name =>
                playerStatuses[name] ===
                "Geliyorum"
        );


    const section =
        document.getElementById(
            "teamsSection"
        );


    const grid =
        document.getElementById(
            "teamsGrid"
        );


    if (
        comingPlayers.length !==
        MAX_PLAYERS
    ) {

        grid.innerHTML = `

            <div class="team-card">

                <div class="team-header">

                    <div class="team-name">
                        ⚽ Takımlar bekleniyor
                    </div>

                </div>

                <p style="
                    color:#647067;
                    font-size:13px;
                    line-height:1.6;
                ">

                    Takımların otomatik oluşturulması
                    için 14 kişinin de
                    <strong>Geliyorum</strong>
                    demesi gerekiyor.

                    <br><br>

                    Şu anda:
                    <strong>
                        ${comingPlayers.length}/14
                    </strong>

                </p>

            </div>

        `;

        return;

    }


    const teams =
        createBalancedTeams(
            comingPlayers
        );


    renderTeams(
        teams
    );

}


/* =========================================
   DENGELİ TAKIM OLUŞTUR
========================================= */

function createBalancedTeams(
    playerNames
) {

    const allPlayers =
        playerNames.map(
            name => {

                const profile =
                    playerProfiles[name] ||
                    {

                        mevki:
                            "Orta Saha",

                        puan:
                            5

                    };


                return {

                    isim:
                        name,

                    mevki:
                        profile.mevki,

                    puan:
                        Number(
                            profile.puan
                        ) || 5

                };

            }
        );


    const combinations =
        getCombinations(
            allPlayers,
            7
        );


    let bestTeams =
        null;

    let bestScore =
        Infinity;


    combinations.forEach(
        teamA => {

            const teamANames =
                new Set(
                    teamA.map(
                        player =>
                            player.isim
                    )
                );


            const teamB =
                allPlayers.filter(
                    player =>
                        !teamANames.has(
                            player.isim
                        )
                );


            const score =
                calculateTeamScore(
                    teamA,
                    teamB
                );


            if (
                score <
                bestScore
            ) {

                bestScore =
                    score;

                bestTeams = {

                    teamA:
                        teamA,

                    teamB:
                        teamB

                };

            }

        }
    );


    return bestTeams;

}


/* =========================================
   COMBINATIONS
========================================= */

function getCombinations(
    array,
    size
) {

    const result = [];


    function combine(
        start,
        current
    ) {

        if (
            current.length ===
            size
        ) {

            result.push(
                [...current]
            );

            return;

        }


        for (
            let i = start;
            i < array.length;
            i++
        ) {

            current.push(
                array[i]
            );


            combine(
                i + 1,
                current
            );


            current.pop();

        }

    }


    combine(
        0,
        []
    );


    return result;

}


/* =========================================
   TAKIM PUANLAMA
========================================= */

function calculateTeamScore(
    teamA,
    teamB
) {

    const ratingA =
        teamA.reduce(
            (sum, player) =>
                sum + player.puan,
            0
        );


    const ratingB =
        teamB.reduce(
            (sum, player) =>
                sum + player.puan,
            0
        );


    let score =
        Math.abs(
            ratingA -
            ratingB
        ) * 100;


    positions.forEach(
        position => {

            const countA =
                teamA.filter(
                    player =>
                        player.mevki ===
                        position
                ).length;


            const countB =
                teamB.filter(
                    player =>
                        player.mevki ===
                        position
                ).length;


            score +=
                Math.abs(
                    countA -
                    countB
                ) * 25;

        }
    );


    /*
       Kaleci dengesi
    */

    const goalkeeperA =
        teamA.filter(
            player =>
                player.mevki ===
                "Kaleci"
        ).length;


    const goalkeeperB =
        teamB.filter(
            player =>
                player.mevki ===
                "Kaleci"
        ).length;


    score +=
        Math.abs(
            goalkeeperA -
            goalkeeperB
        ) * 80;


    return score;

}


/* =========================================
   POZİSYONA GÖRE SIRALA
========================================= */

function sortPlayersByPosition(
    playersArray
) {

    const order = {

        "Kaleci": 1,
        "Defans": 2,
        "Orta Saha": 3,
        "Forvet": 4

    };


    return [
        ...playersArray
    ].sort(
        (a, b) =>
            order[a.mevki] -
            order[b.mevki]
    );

}


/* =========================================
   TAKIMLARI RENDER
========================================= */

function renderTeams(
    teams
) {

    const grid =
        document.getElementById(
            "teamsGrid"
        );


    const teamA =
        sortPlayersByPosition(
            teams.teamA
        );


    const teamB =
        sortPlayersByPosition(
            teams.teamB
        );


    const ratingA =
        teamA.reduce(
            (sum, player) =>
                sum + player.puan,
            0
        );


    const ratingB =
        teamB.reduce(
            (sum, player) =>
                sum + player.puan,
            0
        );


    grid.innerHTML = `

        <div class="team-card team-a">

            <div class="team-header">

                <div class="team-name">
                    🟢 Takım A
                </div>

                <div class="team-total">
                    ${ratingA} puan
                </div>

            </div>

            <div class="team-players">

                ${createTeamPlayersHTML(
                    teamA
                )}

            </div>

        </div>


        <div class="team-card team-b">

            <div class="team-header">

                <div class="team-name">
                    🟡 Takım B
                </div>

                <div class="team-total">
                    ${ratingB} puan
                </div>

            </div>

            <div class="team-players">

                ${createTeamPlayersHTML(
                    teamB
                )}

            </div>

        </div>

    `;

}


/* =========================================
   TAKIM OYUNCULARI
========================================= */

function createTeamPlayersHTML(
    team
) {

    return team.map(
        (player, index) => `

            <div class="team-player">

                <div class="team-player-left">

                    <div class="team-player-number">
                        ${index + 1}
                    </div>

                    <div>

                        <div class="team-player-name">
                            ${escapeHtml(
                                player.isim
                            )}
                        </div>

                        <div class="team-player-position">
                            ${escapeHtml(
                                player.mevki
                            )}
                        </div>

                    </div>

                </div>

            </div>

        `
    ).join("");

}


/* =========================================
   TAKIMLARI MANUEL OLUŞTUR
========================================= */

function generateTeams() {

    const coming =
        players.filter(
            name =>
                playerStatuses[name] ===
                "Geliyorum"
        );


    if (
        coming.length !==
        MAX_PLAYERS
    ) {

        alert(
            "Takım oluşturmak için tam 14 kişi Geliyorum olmalı."
        );

        return;

    }


    updateTeams();

    document.getElementById(
        "teamsSection"
    ).scrollIntoView({
        behavior:
            "smooth"
    });

}


/* =========================================
   IBAN KOPYALA
========================================= */

function copyIban() {

    const iban =
        document.getElementById(
            "ibanText"
        )
        .textContent
        .trim();


    navigator.clipboard
        .writeText(iban)
        .then(
            () => {

                const button =
                    document.getElementById(
                        "copyIbanButton"
                    );


                const oldText =
                    button.textContent;


                button.textContent =
                    "✅ Kopyalandı";


                setTimeout(
                    () => {

                        button.textContent =
                            oldText;

                    },
                    1500
                );

            }
        )
        .catch(
            () => {

                alert(
                    "IBAN: " + iban
                );

            }
        );

}


/* =========================================
   SES SİSTEMİ
========================================= */

function setupAudio() {

    /*
       Ses dosyalarını oluştur
    */

    mainAudio =
        new Audio("arka.mp3");

    katilimAudio =
        new Audio("katilim.mp3");

    haftayaBeklerizAudio =
        new Audio(
            "haftaya-bekleriz.mp3"
        );


    /*
       Arka plan müziği
    */

    mainAudio.loop =
        true;

    mainAudio.volume =
        0.20;


    /*
       Katılım sesi
    */

    katilimAudio.volume =
        0.75;


    /*
       Gelemez sesi
    */

    haftayaBeklerizAudio.volume =
        0.75;


    /*
       Ses butonu
    */

    const audioButton =
        document.getElementById(
            "audioButton"
        );


    audioButton.addEventListener(
        "click",
        toggleMainAudio
    );


    /*
       Tarayıcı autoplay engeli
       nedeniyle ilk kullanıcı
       etkileşiminde müziği aç.
    */

    const startAudioOnce =
        () => {

            if (audioStarted) {
                return;
            }


            mainAudio
                .play()
                .then(
                    () => {

                        audioStarted =
                            true;

                        updateAudioButton(
                            true
                        );

                    }
                )
                .catch(
                    () => {}
                );

        };


    document.addEventListener(
        "click",
        startAudioOnce,
        {
            once: true
        }
    );


    document.addEventListener(
        "touchstart",
        startAudioOnce,
        {
            once: true
        }
    );

}


/* =========================================
   ARKA PLAN SESİ
========================================= */

function toggleMainAudio() {

    if (!mainAudio) {
        return;
    }


    if (
        mainAudio.paused
    ) {

        mainAudio
            .play()
            .then(
                () => {

                    audioStarted =
                        true;

                    updateAudioButton(
                        true
                    );

                }
            )
            .catch(
                error => {

                    console.log(
                        "Ses başlatılamadı:",
                        error
                    );

                }
            );

    }

    else {

        mainAudio.pause();

        updateAudioButton(
            false
        );

    }

}


/* =========================================
   SES BUTONU
========================================= */

function updateAudioButton(
    isPlaying
) {

    const button =
        document.getElementById(
            "audioButton"
        );


    if (!button) {
        return;
    }


    if (isPlaying) {

        button.innerHTML =
            "🔊";

        button.title =
            "Sesi Kapat";

        button.classList.add(
            "audio-playing"
        );

    }

    else {

        button.innerHTML =
            "🔇";

        button.title =
            "Sesi Aç";

        button.classList.remove(
            "audio-playing"
        );

    }

}


/* =========================================
   KATILIM SESİ
========================================= */

function playKatilimSound() {

    if (!katilimAudio) {
        return;
    }


    katilimAudio.currentTime =
        0;


    katilimAudio
        .play()
        .catch(
            error => {

                console.log(
                    "Katılım sesi oynatılamadı:",
                    error
                );

            }
        );

}


/* =========================================
   HAFTAYA BEKLERİZ SESİ
========================================= */

function playHaftayaBeklerizSound() {

    if (!haftayaBeklerizAudio) {
        return;
    }


    haftayaBeklerizAudio.currentTime =
        0;


    haftayaBeklerizAudio
        .play()
        .catch(
            error => {

                console.log(
                    "Ses oynatılamadı:",
                    error
                );

            }
        );

}


/* =========================================
   DURUM SESİ
========================================= */

function playStatusSound(
    status
) {

    if (
        status ===
        "Geliyorum"
    ) {

        playKatilimSound();

    }

    else if (
        status ===
        "Gelemiyorum"
    ) {

        playHaftayaBeklerizSound();

    }

}


/* =========================================
   BUTONLAR
========================================= */

function setupButtons() {

    document.getElementById(
        "comingButton"
    )
    .addEventListener(
        "click",
        () => {

            setStatus(
                "Geliyorum"
            );

        }
    );


    document.getElementById(
        "notComingButton"
    )
    .addEventListener(
        "click",
        () => {

            setStatus(
                "Gelemiyorum"
            );

        }
    );


    document.getElementById(
        "paymentButton"
    )
    .addEventListener(
        "click",
        setPayment
    );


    document.getElementById(
        "clearButton"
    )
    .addEventListener(
        "click",
        clearWeek
    );


    document.getElementById(
        "adminOpenButton"
    )
    .addEventListener(
        "click",
        openAdminPanel
    );


    document.getElementById(
        "adminCloseButton"
    )
    .addEventListener(
        "click",
        closeAdminPanel
    );


    document.getElementById(
        "generateTeamsButton"
    )
    .addEventListener(
        "click",
        generateTeams
    );


    document.getElementById(
        "copyIbanButton"
    )
    .addEventListener(
        "click",
        copyIban
    );

}


/* =========================================
   LOADING
========================================= */

function hideLoading() {

    const loading =
        document.getElementById(
            "loading"
        );


    loading.classList.add(
        "hidden"
    );


    document.getElementById(
        "connectionError"
    )
    .classList.add(
        "hidden"
    );

}


/* =========================================
   CONNECTION ERROR
========================================= */

function showConnectionError() {

    document.getElementById(
        "loading"
    )
    .classList.add(
        "hidden"
    );


    document.getElementById(
        "connectionError"
    )
    .classList.remove(
        "hidden"
    );

}


/* =========================================
   SON GÜNCELLEME
========================================= */

function updateLastUpdate() {

    const element =
        document.getElementById(
            "lastUpdate"
        );


    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            "tr-TR",
            {

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit"

            }
        );


    element.textContent =
        "Son güncelleme: " +
        time;

}


/* =========================================
   HTML GÜVENLİĞİ
========================================= */

function escapeHtml(
    text
) {

    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}
