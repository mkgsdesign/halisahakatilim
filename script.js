const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw1032xl6q66hrmTwbD5WYnehlFFNZGwtxq9wwjSWgpGuTitiaGjke9sRJXLR8UL4hPgw/exec";


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
    "Cio" ,
    "Tahsin",
    "kemal gönen",

];


let playerStatuses = {};

let playerPayments = {};

let clearingWeek = false;

let selectedPlayer = "";

let dataLoading = false;

let actionInProgress = false;


players.forEach(function (name) {

    playerStatuses[name] = "";

    playerPayments[name] = "";

});


/* =========================================
   OYUNCU SEÇİMİ
========================================= */

function createPlayerSelect() {

    const select =
        document.getElementById(
            "playerSelect"
        );


    players.forEach(function (name) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            name;

        option.textContent =
            name;

        select.appendChild(
            option
        );

    });


    select.addEventListener(
        "change",
        function () {

            selectedPlayer =
                this.value;

            showSelectedPlayer();

        }
    );

}


/* =========================================
   SEÇİLEN OYUNCU
========================================= */

function showSelectedPlayer() {

    const panel =
        document.getElementById(
            "playerPanel"
        );


    const message =
        document.getElementById(
            "selectMessage"
        );


    const nameElement =
        document.getElementById(
            "selectedPlayerName"
        );


    if (!selectedPlayer) {

        panel.classList.add(
            "hidden"
        );

        message.classList.remove(
            "hidden"
        );

        return;

    }


    panel.classList.remove(
        "hidden"
    );

    message.classList.add(
        "hidden"
    );


    nameElement.textContent =
        selectedPlayer;


    updateSelectedPlayer();

}


/* =========================================
   SEÇİLEN OYUNCU BİLGİSİ
========================================= */

function updateSelectedPlayer() {

    if (!selectedPlayer) {
        return;
    }


    const status =
        playerStatuses[
            selectedPlayer
        ] || "";


    const payment =
        playerPayments[
            selectedPlayer
        ] || "";


    const statusElement =
        document.getElementById(
            "selectedPlayerStatus"
        );


    const paymentStatus =
        document.getElementById(
            "selectedPaymentStatus"
        );


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


    comingButton.classList.remove(
        "selected"
    );

    notComingButton.classList.remove(
        "selected"
    );


    if (
        status === "Geliyorum"
    ) {

        statusElement.textContent =
            "🟢 Geliyorum";

        statusElement.className =
            "status-coming";

        comingButton.classList.add(
            "selected"
        );

    }

    else if (
        status === "Gelemiyorum"
    ) {

        statusElement.textContent =
            "🔴 Gelemiyorum";

        statusElement.className =
            "status-not-coming";

        notComingButton.classList.add(
            "selected"
        );

    }

    else {

        statusElement.textContent =
            "⚪ Cevap vermedi";

        statusElement.className =
            "status-waiting";

    }


    paymentButton.classList.remove(
        "paid"
    );


    if (
        payment === "Ödendi"
    ) {

        paymentStatus.textContent =
            "🟢 Ödeme yapıldı.";

        paymentStatus.className =
            "payment-done";


        paymentButton.textContent =
            "🟢 Ödeme Yapıldı";


        paymentButton.classList.add(
            "paid"
        );


        paymentButton.disabled =
            true;

    }

    else {

        paymentStatus.textContent =
            "Henüz ödeme bildirilmedi.";

        paymentStatus.className =
            "";


        paymentButton.textContent =
            "💳 Ödemeyi Yaptım";


        paymentButton.disabled =
            false;

    }

}


/* =========================================
   GOOGLE SHEETS VERİSİNİ AL
========================================= */

function loadData() {

    /*
       Eğer zaten veri çekiliyorsa
       ikinci isteği gönderme.
    */

    if (
        clearingWeek ||
        dataLoading
    ) {
        return;
    }


    dataLoading = true;


    const callbackName =
        "sheetCallback_" +
        Date.now();


    let finished = false;


    function finishLoading() {

        if (finished) {
            return;
        }

        finished = true;

        dataLoading = false;

        delete window[
            callbackName
        ];

    }


    window[callbackName] =
        function (data) {

            if (clearingWeek) {

                finishLoading();

                return;

            }


            try {

                updatePlayers(data);

            }

            catch (error) {

                console.error(
                    "Veri işleme hatası:",
                    error
                );

            }


            finishLoading();


            const oldScript =
                document.getElementById(
                    callbackName
                );


            if (oldScript) {

                oldScript.remove();

            }

        };


    const script =
        document.createElement(
            "script"
        );


    script.id =
        callbackName;


    script.src =
        SCRIPT_URL +
        "?callback=" +
        callbackName +
        "&t=" +
        Date.now();


    script.onerror =
        function () {

            console.error(
                "Google Sheets bağlantısı kurulamadı."
            );


            finishLoading();

            script.remove();

            showConnectionError();

        };


    document.body.appendChild(
        script
    );


    /*
       Bağlantı çok uzun sürerse
       sistemi kilitleme.
    */

    setTimeout(
        function () {

            if (!finished) {

                finishLoading();

                if (script) {
                    script.remove();
                }

            }

        },
        5000
    );

}


/* =========================================
   VERİLERİ GÜNCELLE
========================================= */

function updatePlayers(data) {

    if (clearingWeek) {
        return;
    }


    for (
        let i = 1;
        i < data.length;
        i++
    ) {

        const name =
            String(
                data[i][0] || ""
            ).trim();


        const status =
            String(
                data[i][1] || ""
            ).trim();


        const payment =
            String(
                data[i][3] || ""
            ).trim();


        if (
            !players.includes(name)
        ) {
            continue;
        }


        playerStatuses[name] =
            status;


        playerPayments[name] =
            payment;

    }


    updateCounters();


    updateSelectedPlayer();


    const loading =
        document.getElementById(
            "loading"
        );


    loading.style.display =
        "none";


    const now =
        new Date();


    document.getElementById(
        "lastUpdate"
    ).textContent =
        "Son kontrol: " +
        now.toLocaleTimeString(
            "tr-TR"
        );

}


/* =========================================
   GELİYORUM / GELMİYORUM
========================================= */

function setStatus(
    name,
    status
) {

    if (
        clearingWeek ||
        !name ||
        actionInProgress
    ) {
        return;
    }


    actionInProgress = true;
    if (status === "Geliyorum") {

        const audio =
            new Audio("katilim.mp3");

        audio.play()
            .catch(function (error) {

                console.error(
                    "Ses çalınamadı:",
                    error
                );

            });

    }

    else if (status === "Gelemiyorum") {

        const audio =
            new Audio("haftaya-bekleriz.mp3");

        audio.play()
            .catch(function (error) {

                console.error(
                    "Ses çalınamadı:",
                    error
                );

            });

    }

    /*
       Önce ekranda hemen göster.
    */

    playerStatuses[name] =
        status;


    updateSelectedPlayer();

    updateCounters();


    const comingButton =
        document.getElementById(
            "comingButton"
        );


    const notComingButton =
        document.getElementById(
            "notComingButton"
        );


    comingButton.disabled =
        true;

    notComingButton.disabled =
        true;


    fetch(
        SCRIPT_URL,
        {

            method: "POST",

            mode: "no-cors",

            headers: {

                "Content-Type":
                    "text/plain;charset=utf-8"

            },

            body:
                JSON.stringify({

                    isim:
                        name,

                    durum:
                        status

                })

        }
    )
    .then(function () {

        /*
           Google Sheets'e kayıt sonrası
           bir kez kontrol et.
        */

        setTimeout(
            function () {

                if (
                    !clearingWeek
                ) {

                    loadData();

                }

            },
            700
        );

    })
    .catch(function (error) {

        console.error(
            "Katılım kayıt hatası:",
            error
        );

    })
    .finally(function () {

        setTimeout(
            function () {

                actionInProgress =
                    false;


                comingButton.disabled =
                    false;


                notComingButton.disabled =
                    false;

            },
            900
        );

    });

}


/* =========================================
   ÖDEME
========================================= */

function setPayment(name) {

    if (
        clearingWeek ||
        !name ||
        actionInProgress
    ) {
        return;
    }


    const paymentButton =
        document.getElementById(
            "paymentButton"
        );


    const confirmed =
        confirm(
            "💳 150 TL ödeme yaptığınızı onaylıyor musunuz?\n\n" +
            "Ödeme bildirildiğinde otomatik olarak 'Geliyorum' seçilecektir."
        );


    if (!confirmed) {
        return;
    }


    actionInProgress =
        true;


    paymentButton.disabled =
        true;


    paymentButton.textContent =
        "⏳ Kaydediliyor...";


    /*
       Ödeme yapıldığında backend
       hem Ödendi hem Geliyorum
       olarak kaydedecek.
    */

    fetch(
        SCRIPT_URL,
        {

            method: "POST",

            mode: "no-cors",

            headers: {

                "Content-Type":
                    "text/plain;charset=utf-8"

            },

            body:
                JSON.stringify({

                    action:
                        "payment",

                    isim:
                        name

                })

        }
    )
    .then(function () {

        /*
           Ekranda hemen güncelle.
        */

        playerPayments[name] =
            "Ödendi";


        playerStatuses[name] =
            "Geliyorum";


        updateCounters();

        updateSelectedPlayer();


        /*
           Google Sheets'ten bir kez
           tekrar kontrol et.
        */

        setTimeout(
            function () {

                if (
                    !clearingWeek
                ) {

                    loadData();

                }

            },
            700
        );

    })
    .catch(function (error) {

        console.error(
            "Ödeme kayıt hatası:",
            error
        );


        paymentButton.disabled =
            false;


        paymentButton.textContent =
            "💳 Ödemeyi Yaptım";

    })
    .finally(function () {

        setTimeout(
            function () {

                actionInProgress =
                    false;

            },
            900
        );

    });

}



/* =========================================
   SAYAÇLAR
========================================= */

function updateCounters() {

    let coming = 0;

    let notComing = 0;

    let waiting = 0;


    players.forEach(
        function (name) {

            const status =
                playerStatuses[name];


            if (
                status === "Geliyorum"
            ) {

                coming++;

            }

            else if (
                status === "Gelemiyorum"
            ) {

                notComing++;

            }

            else {

                waiting++;

            }

        }
    );


    document.getElementById(
        "comingCount"
    ).textContent =
        coming;


    document.getElementById(
        "notComingCount"
    ).textContent =
        notComing;


    document.getElementById(
        "waitingCount"
    ).textContent =
        waiting;

}


/* =========================================
   YENİ HAFTA
========================================= */

function clearWeek() {

    const confirmed =
        confirm(
            "⚠️ DİKKAT!\n\n" +
            "Tüm katılım ve ödeme bilgileri " +
            "silinecek.\n\n" +
            "İsimler silinmeyecek.\n\n" +
            "Devam etmek istiyor musunuz?"
        );


    if (!confirmed) {
        return;
    }


    clearingWeek =
        true;


    actionInProgress =
        true;


    const clearButton =
        document.getElementById(
            "clearButton"
        );


    clearButton.disabled =
        true;


    clearButton.textContent =
        "⏳ Yeni hafta hazırlanıyor...";


    players.forEach(
        function (name) {

            playerStatuses[name] =
                "";

            playerPayments[name] =
                "";

        }
    );


    updateCounters();

    updateSelectedPlayer();


    fetch(
        SCRIPT_URL,
        {

            method: "POST",

            mode: "no-cors",

            headers: {

                "Content-Type":
                    "text/plain;charset=utf-8"

            },

            body:
                JSON.stringify({

                    action:
                        "clear"

                })

        }
    )
    .then(function () {

        setTimeout(
            function () {

                clearingWeek =
                    false;

                actionInProgress =
                    false;


                clearButton.disabled =
                    false;


                clearButton.textContent =
                    "🗑️ Yeni Haftayı Başlat";


                loadData();

            },
            800
        );


        alert(
            "✅ Yeni hafta başlatıldı!"
        );

    })
    .catch(function (error) {

        console.error(
            "Temizleme hatası:",
            error
        );


        clearingWeek =
            false;

        actionInProgress =
            false;


        clearButton.disabled =
            false;


        clearButton.textContent =
            "🗑️ Yeni Haftayı Başlat";


        alert(
            "❌ Liste temizlenirken hata oluştu."
        );

    });

}


/* =========================================
   BAĞLANTI HATASI
========================================= */

function showConnectionError() {

    const loading =
        document.getElementById(
            "loading"
        );


    loading.innerHTML = `
        <div class="error-message">
            ⚠️ Google Sheets bağlantısı kurulamadı.
        </div>
    `;

}


/* =========================================
   IBAN KOPYALAMA
========================================= */

function copyIban() {

    const iban =
        document
            .getElementById(
                "ibanNumber"
            )
            .dataset
            .iban
            .trim();


    const button =
        document.getElementById(
            "copyIbanButton"
        );


    navigator.clipboard
        .writeText(iban)
        .then(function () {

            button.textContent =
                "✅ Kopyalandı";

            button.classList.add(
                "copied"
            );


            setTimeout(
                function () {

                    button.textContent =
                        "📋 Kopyala";

                    button.classList.remove(
                        "copied"
                    );

                },
                1800
            );

        })
        .catch(function () {

            alert(
                "IBAN kopyalanamadı."
            );

        });

}


/* =========================================
   BUTONLAR
========================================= */

document
    .getElementById(
        "comingButton"
    )
    .addEventListener(
        "click",
        function () {

            if (selectedPlayer) {

                setStatus(
                    selectedPlayer,
                    "Geliyorum"
                );

            }

        }
    );


document
    .getElementById(
        "notComingButton"
    )
    .addEventListener(
        "click",
        function () {

            if (selectedPlayer) {

                setStatus(
                    selectedPlayer,
                    "Gelemiyorum"
                );

            }

        }
    );


document
    .getElementById(
        "paymentButton"
    )
    .addEventListener(
        "click",
        function () {

            if (selectedPlayer) {

                setPayment(
                    selectedPlayer
                );

            }

        }
    );


document
    .getElementById(
        "clearButton"
    )
    .addEventListener(
        "click",
        clearWeek
    );


document
    .getElementById(
        "copyIbanButton"
    )
    .addEventListener(
        "click",
        copyIban
    );

let mainAudio = null;


document
    .getElementById(
        "playSoundButton"
    )
    .addEventListener(
        "click",
        function () {

            const button = this;


            /*
               Ses hiç oluşturulmadıysa
               ilk kez oluştur.
            */

            if (!mainAudio) {

                mainAudio =
                    new Audio("arka.mp3");


                mainAudio.addEventListener(
                    "ended",
                    function () {

                        button.textContent =
                            "▶️";

                    }
                );

            }


            /*
               Çalıyorsa durdur,
               durmuşsa çal.
            */

            if (
                mainAudio.paused
            ) {

                mainAudio.play()
                    .catch(function (error) {

                        console.error(
                            "Ses çalınamadı:",
                            error
                        );

                    });


                button.textContent =
                    "⏸️";

            }

            else {

                mainAudio.pause();

                mainAudio.currentTime =
                    0;


                button.textContent =
                    "▶️";

            }

        }
    );
/* =========================================
   BAŞLAT
========================================= */

createPlayerSelect();

updateCounters();

loadData();


/* =========================================
   OTOMATİK KONTROL
========================================= */

setInterval(
    function () {

        if (
            !clearingWeek &&
            !actionInProgress &&
            !dataLoading
        ) {

            loadData();

        }

    },
    3000
);