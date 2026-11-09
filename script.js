
const STORAGE_KEY = "dartScorerData";

let appData = loadData();
let selectedGame = null;
let players = [];
let currentPlayer = 0;
let gameActive = false;
let doubleOut = false;

// DATEN LADEN

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const data = JSON.parse(saved);

            if (data && data.players && typeof data.players === "object") {
                return {
                    gamesPlayed: Number(data.gamesPlayed) || 0,
                    players: data.players
                };
            }
        }
    } catch (error) {
        console.error("Fehler beim Laden:", error);
    }

    return {
        gamesPlayed: 0,
        players: {}
    };
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function getProfile(name) {
    const key = name.toLowerCase();

    if (!appData.players[key]) {
        appData.players[key] = {
            name: name,
            games: 0,
            wins: 0,
            turns: 0,
            totalPoints: 0,
            highestVisit: 0,
            history: []
        };
    }

    return appData.players[key];
}

// NAVIGATION

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active-page");
    });

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active-page");
    }

    if (pageId === "dashboard") {
        updateDashboard();
    }

    if (pageId === "statistics") {
        updateStatistics();
    }
}

document.querySelectorAll("[data-page]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        showPage(link.dataset.page);
    });
});

// SIDEBAR

const toggleButton = document.getElementById("toggleButton");
const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("mainContent");

toggleButton.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    mainContent.classList.toggle("expanded");
});

// DASHBOARD

document.getElementById("newGameButton").addEventListener("click", () => {
    showPage("gameSetup");
});

function updateDashboard() {
    document.getElementById("dashboardGames").textContent =
        appData.gamesPlayed;

    document.getElementById("dashboardPlayers").textContent =
        Object.keys(appData.players).length;
}

// SPIELEINRICHTUNG

document.querySelectorAll(".mode-button").forEach(button => {
    button.addEventListener("click", () => {
        selectedGame = Number(button.dataset.game);

        document.querySelectorAll(".mode-button").forEach(btn => {
            btn.classList.remove("selected");
        });

        button.classList.add("selected");

        document.getElementById("selectedMode").textContent =
            selectedGame + " Punkte ausgewählt.";
    });
});

const playerCount = document.getElementById("playerCount");

playerCount.addEventListener("change", createPlayerInputs);

function createPlayerInputs() {
    const count = Number(playerCount.value);
    const container = document.getElementById("playerInputs");

    container.innerHTML = "";

    for (let i = 1; i <= count; i++) {
        const input = document.createElement("input");

        input.type = "text";
        input.placeholder = "Name von Spieler " + i;
        input.id = "playerName" + i;
        input.maxLength = 20;

        container.appendChild(input);
    }
}

createPlayerInputs();

// SPIEL STARTEN

document.getElementById("startGameButton").addEventListener("click", startGame);

function startGame() {
    if (!selectedGame) {
        alert("Bitte wähle zuerst 301 oder 501 aus.");
        return;
    }

    const count = Number(playerCount.value);
    const names = [];

    for (let i = 1; i <= count; i++) {
        const input = document.getElementById("playerName" + i);
        const name = input.value.trim();

        if (!name) {
            alert("Bitte gib allen Spielern einen Namen.");
            return;
        }

        if (names.some(existing => existing.toLowerCase() === name.toLowerCase())) {
            alert("Jeder Spieler braucht einen eigenen Namen.");
            return;
        }

        names.push(name);
    }

    doubleOut = document.getElementById("doubleOut").checked;

    players = names.map(name => ({
        name: name,
        score: selectedGame,
        history: [],
        turns: 0,
        totalPoints: 0,
        highestVisit: 0
    }));

    currentPlayer = 0;
    gameActive = true;

    document.getElementById("gameModeText").textContent =
        selectedGame + " Punkte";

    document.getElementById("message").textContent = "";
    document.getElementById("throwHistory").innerHTML = "";

    updateScoreboard();
    showPage("gameScreen");

    document.getElementById("scoreInput").value = "";
    document.getElementById("checkout").checked = false;
}

// SCOREBOARD

function updateScoreboard() {
    const scoreboard = document.getElementById("scoreboard");

    scoreboard.innerHTML = "";

    players.forEach((player, index) => {
        const card = document.createElement("div");

        card.className = "player-card";

        if (index === currentPlayer && gameActive) {
            card.classList.add("active");
        }

        const name = document.createElement("h3");
        name.textContent = player.name;

        const score = document.createElement("p");
        score.className = "player-score";
        score.textContent = player.score;

        const turns = document.createElement("p");
        turns.textContent = "Runden: " + player.turns;

        card.append(name, score, turns);
        scoreboard.appendChild(card);
    });

    if (players.length > 0 && gameActive) {
        document.getElementById("activePlayerText").textContent =
            "Aktiver Spieler: " + players[currentPlayer].name;
    }
}

// PUNKTE EINTRAGEN

document.getElementById("throwButton").addEventListener("click", registerThrow);

document.getElementById("scoreInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        registerThrow();
    }
});

function registerThrow() {
    if (!gameActive) {
        return;
    }

    const input = document.getElementById("scoreInput");
    const points = Number(input.value);
    const checkout = document.getElementById("checkout").checked;

    if (input.value.trim() === "" || !Number.isInteger(points) || points < 0 || points > 180) {
        document.getElementById("message").textContent =
            "Bitte gib einen gültigen Wert zwischen 0 und 180 ein.";
        return;
    }

    const player = players[currentPlayer];
    const remaining = player.score - points;

    // BUST

    if (
        remaining < 0 ||
        remaining === 1 ||
        (remaining === 0 && doubleOut && !checkout)
    ) {
        player.history.push({
            points: 0,
            result: "Bust"
        });

        player.turns++;

        addHistory(player.name, "Bust");

        document.getElementById("message").textContent =
            "Bust! Die Punkte zählen nicht.";

        nextPlayer();
        return;
    }

    // NORMALER WURF

    player.score = remaining;
    player.turns++;
    player.totalPoints += points;
    player.highestVisit = Math.max(player.highestVisit, points);

    player.history.push({
        points: points,
        result: "Normal"
    });

    addHistory(player.name, points);

    input.value = "";
    document.getElementById("checkout").checked = false;

    // GEWONNEN

    if (player.score === 0) {
        finishGame(player);
        return;
    }

    document.getElementById("message").textContent =
        points + " Punkte für " + player.name + ".";

    nextPlayer();
}

function addHistory(name, result) {
    const history = document.getElementById("throwHistory");

    const entry = document.createElement("div");
    entry.className = "history-entry";

    entry.textContent = name + ": " + result;

    history.prepend(entry);
}

function nextPlayer() {
    currentPlayer = (currentPlayer + 1) % players.length;

    document.getElementById("scoreInput").value = "";
    document.getElementById("checkout").checked = false;

    updateScoreboard();
}

// SPIEL BEENDET

function finishGame(winner) {
    gameActive = false;

    appData.gamesPlayed++;

    players.forEach(player => {
        const profile = getProfile(player.name);

        profile.games++;
        profile.turns += player.turns;
        profile.totalPoints += player.totalPoints;
        profile.highestVisit = Math.max(
            profile.highestVisit,
            player.highestVisit
        );

        profile.history.push({
            date: new Date().toLocaleString("de-DE"),
            game: selectedGame,
            points: player.totalPoints,
            result: player.name === winner.name ? "Sieg" : "Niederlage"
        });

        if (player.name === winner.name) {
            profile.wins++;
        }
    });

    saveData();

    document.getElementById("message").textContent =
        winner.name + " hat gewonnen! 🎯";

    document.getElementById("throwButton").disabled = true;

    updateScoreboard();
    updateDashboard();
}

function resetThrowButton() {
    document.getElementById("throwButton").disabled = false;
}

// SPIEL BEENDEN

document.getElementById("quitGameButton").addEventListener("click", () => {
    if (!gameActive) {
        showPage("dashboard");
        return;
    }

    const confirmed = confirm("Möchtest du das Spiel wirklich beenden?");

    if (confirmed) {
        gameActive = false;
        resetThrowButton();
        showPage("dashboard");
    }
});

// STATISTIKEN

function updateStatistics() {
    const profiles = Object.values(appData.players);

    document.getElementById("totalGames").textContent =
        appData.gamesPlayed;

    document.getElementById("totalPlayers").textContent =
        profiles.length;

    const ranking = [...profiles].sort((a, b) => {
        if (b.wins !== a.wins) {
            return b.wins - a.wins;
        }

        return b.totalPoints - a.totalPoints;
    });

    const table = document.getElementById("rankingTable");
    table.innerHTML = "";

    ranking.forEach((player, index) => {
        const average = player.turns > 0
            ? (player.totalPoints / player.turns).toFixed(1)
            : "0.0";

        const row = document.createElement("tr");

        [
            index + 1,
            player.name,
            player.games,
            player.wins,
            average
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        table.appendChild(row);
    });

    updateHistorySelector();
}

function updateHistorySelector() {
    const select = document.getElementById("historyPlayer");
    const previousValue = select.value;

    select.innerHTML = '<option value="">Spieler auswählen</option>';

    Object.entries(appData.players).forEach(([key, player]) => {
        const option = document.createElement("option");

        option.value = key;
        option.textContent = player.name;

        select.appendChild(option);
    });

    if (appData.players[previousValue]) {
        select.value = previousValue;
        showPlayerHistory();
    }
}

// SPIELERVERLAUF

document.getElementById("historyPlayer").addEventListener("change", showPlayerHistory);

function showPlayerHistory() {
    const key = document.getElementById("historyPlayer").value;
    const container = document.getElementById("playerHistory");

    container.innerHTML = "";

    if (!key || !appData.players[key]) {
        return;
    }

    const player = appData.players[key];

    if (player.history.length === 0) {
        container.textContent = "Noch keine abgeschlossenen Spiele.";
        return;
    }

    [...player.history].reverse().forEach(game => {
        const entry = document.createElement("div");
        entry.className = "history-entry";

        entry.textContent =
            game.date + " | " +
            game.game + " | " +
            game.points + " Punkte | " +
            game.result;

        container.appendChild(entry);
    });
}

// STATISTIKEN ZURÜCKSETZEN

document.getElementById("resetStatsButton").addEventListener("click", () => {
    const confirmed = confirm(
        "Möchtest du wirklich alle Statistiken löschen?"
    );

    if (!confirmed) {
        return;
    }

    appData = {
        gamesPlayed: 0,
        players: {}
    };

    saveData();
    updateStatistics();
    updateDashboard();

    document.getElementById("playerHistory").innerHTML = "";
});

// START

updateDashboard();
updateStatistics();



// SERVICE WORKER REGISTRIEREN

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(registration => {
                console.log("App-Modus aktiviert:", registration.scope);
            })
            .catch(error => {
                console.error("Service Worker Fehler:", error);
            });
    });
}
