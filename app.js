const sourceData = window.WC26_DATA;
const STORAGE_KEY = "wc26-simulator-state-v2";

const state = {
  view: "general",
  query: "",
  group: "all",
  round: "all",
  knockoutRound: "all",
  stadium: "all",
  edits: loadEdits(),
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  search: document.querySelector("#search-input"),
  groupFilter: document.querySelector("#group-filter"),
  roundFilter: document.querySelector("#round-filter"),
  roundFilter2: document.querySelector("#round-filter-2"),
  stadiumFilter: document.querySelector("#stadium-filter"),
  knockoutStadiumFilter: document.querySelector("#knockout-stadium-filter"),
  resetData: document.querySelector("#reset-data"),
  generalTable: document.querySelector("#general-table"),
  groupsGrid: document.querySelector("#groups-grid"),
  matchesList: document.querySelector("#matches-list"),
  knockoutGrid: document.querySelector("#knockout-grid"),
  historyGrid: document.querySelector("#history-grid"),
  teamsCount: document.querySelector("#teams-count"),
  matchesCount: document.querySelector("#matches-count"),
  historyBtn: document.querySelector("#toggle-history-btn"),
  historySection: document.querySelector("#history-section"),
  bracketView: document.getElementById("bracket-view"),
  knockoutBtn: document.querySelector("#toggleThirds"),
  knockoutGrid: document.querySelector("#knockout-grid")
};

const roundClasses = {
  "16avos de final": "r16",
  "8vos de final": "r8",
  "4tos de final": "qf",
  "Semifinales": "sf",
  "Final": "f"
};

const baseTeams = Object.values(sourceData.groups).flat().map((team) => ({
  team: team.team, group: findTeamGroup(team.team),
}));
const baseTeamNames = new Set(baseTeams.map((team) => team.team));

const groupMatches = sourceData.matches.map((match) => ({
  ...match, stage: "group",
}));

const champions = [
  { year: 1930, team: "Uruguay" },
  { year: 1934, team: "Italia" },
  { year: 1938, team: "Italia" },
  { year: 1950, team: "Uruguay" },
  { year: 1954, team: "Alemania" },
  { year: 1958, team: "Brasil" },
  { year: 1962, team: "Brasil" },
  { year: 1966, team: "Inglaterra" },
  { year: 1970, team: "Brasil" },
  { year: 1974, team: "Alemania" },
  { year: 1978, team: "Argentina" },
  { year: 1982, team: "Italia" },
  { year: 1986, team: "Argentina" },
  { year: 1990, team: "Alemania" },
  { year: 1994, team: "Brasil" },
  { year: 1998, team: "Francia" },
  { year: 2002, team: "Brasil" },
  { year: 2006, team: "Italia" },
  { year: 2010, team: "España" },
  { year: 2014, team: "Alemania" },
  { year: 2018, team: "Francia" },
  { year: 2022, team: "Argentina" }
];

function findTeamGroup(teamName) {
  return Object.entries(sourceData.groups).find(
    ([, teams]) => teams.some((team) => team.team === teamName)
  )
  ?.[0] || "";
}

function loadEdits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveEdits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.edits));
}

function emptyStats(team, group = "") {
  return {
    team,
    group,
    pts: 0,
    pj: 0,
    pg: 0,
    pe: 0,
    pp: 0,
    gf: 0,
    gc: 0,
    dif: 0,
    ta: 0,
    tr: 0,
    faltas: 0,
  };
}

// En la función que prepara los datos para la tabla general
function getGeneralTableData() {
  const tableData = baseTeams.map(t => {
    // 1. Calculamos si el equipo perdió en alguna etapa eliminatoria
    const isEliminated = checkIfTeamIsEliminated(t.team);
    // 2. Retornamos el equipo con el flag 'eliminated' actualizado
    return {
      ...t, pts: calculatePoints(t.team),
      // ... otros cálculos (pj, pg, etc)
      eliminated: isEliminated // <--- AQUÍ ESTÁ LA CLAVE
    };
  });
  return tableData.sort((a, b) => b.pts - a.pts);
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesQuery(...values) {
  if (!state.query) return true;
  return normalize(values.join(" ")).includes(normalize(state.query));
}

function toInputNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function editFor(matchId) {
  return state.edits[matchId] || {};
}

function mergedMatch(match) {
  return { ...match, ...editFor(match.id) };
}

function hasScore(match) {
  return Number.isFinite(match.homeGoals) && Number.isFinite(match.awayGoals);
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function applyMatch(stats, match, includePoints = true) {
  if (!baseTeamNames.has(match.home) || !baseTeamNames.has(match.away)) return;
  const home = stats[match.home] || (stats[match.home] = emptyStats(match.home, findTeamGroup(match.home)));
  const away = stats[match.away] || (stats[match.away] = emptyStats(match.away, findTeamGroup(match.away)));
    home.ta += numberOrZero(match.homeYellow);
    away.ta += numberOrZero(match.awayYellow);
    home.tr += numberOrZero(match.homeRed);
    away.tr += numberOrZero(match.awayRed);
    home.faltas += numberOrZero(match.homeFouls);
    away.faltas += numberOrZero(match.awayFouls);
      if (!hasScore(match)) return;
        home.pj += 1;
        away.pj += 1;
        home.gf += match.homeGoals;
        home.gc += match.awayGoals;
        away.gf += match.awayGoals;
        away.gc += match.homeGoals;
          if (!includePoints) return;
          // Gana local
          if (match.homeGoals > match.awayGoals) {
            home.pg += 1;
            away.pp += 1;
            home.pts += 3;
              if (match.stage !== "group") {
                away.eliminated = true;
              }
          }
          // Gana visitante
          else if (match.homeGoals < match.awayGoals) {
            away.pg += 1;
            home.pp += 1;
            away.pts += 3;
              if (match.stage !== "group") {
                home.eliminated = true;
              }
          }
          // Empate
          else {
            const hasPens = Number.isFinite(match.homePens) && Number.isFinite(match.awayPens);
              if (hasPens) {
                // Gana local por penales
                if (match.homePens > match.awayPens) {
                  home.pg += 1;
                  away.pp += 1;
                  home.pts += 3;
                    if (match.stage !== "group") {
                      away.eliminated = true;
                    }
                } // Gana visitante por penales
                else if (match.awayPens > match.homePens) {
                  away.pg += 1;
                  home.pp += 1;
                  away.pts += 3;
                    if (match.stage !== "group") {
                      home.eliminated = true;
                    }
                }
              }
              else {
                home.pe += 1;
                away.pe += 1;
                home.pts += 1;
                away.pts += 1;
              }
          }
    }

function finalizeStats(stats) {
  Object.values(stats).forEach((team) => {
    team.dif = team.gf - team.gc;
  });
  return stats;
}

function compareTeams(a, b) {
  return (
    b.pts - a.pts ||
    b.dif - a.dif ||
    b.gf - a.gf ||
    a.ta - b.ta ||
    a.tr - b.tr ||
    a.faltas - b.faltas ||
    a.team.localeCompare(b.team, "es")
  );
}

function calculateGroupTables() {
  const tables = {};
  Object.entries(sourceData.groups).forEach(([group, teams]) => {
    tables[group] = {};
    teams.forEach((team) => {
      tables[group][team.team] = emptyStats(team.team, group);
    });
  });

  groupMatches.map(mergedMatch).forEach((match) => {
    applyMatch(tables[match.group], match, true);
  });

  return Object.fromEntries(
    Object.entries(tables).map(([group, stats]) => [
      group,
      Object.values(finalizeStats(stats)).sort(compareTeams).map((team, index) => ({
        ...team,
        position: index + 1,
      })),
    ])
  );
}

function thirdCandidates(groupTables) {
  return Object.entries(groupTables)
    .map(([group, teams]) => ({
      seed: `3${group.replace("Grupo ", "")}`,
      ...teams[2],
    }))
    .sort(compareTeams);
}

function seedMap(groupTables) {
  const seeds = {};
  Object.entries(groupTables).forEach(([group, teams]) => {
    const letter = group.replace("Grupo ", "");
    seeds[`1${letter}`] = { seed: `1${letter}`, ...teams[0] };
    seeds[`2${letter}`] = { seed: `2${letter}`, ...teams[1] };
    seeds[`3${letter}`] = { seed: `3${letter}`, ...teams[2] };
  });
  return seeds;
}

function loserOf(match) {
  const edited = mergedMatch(match);
  if (!hasScore(edited))
    return null;
  if (edited.homeGoals > edited.awayGoals)
    return edited.away;
  if (edited.awayGoals > edited.homeGoals)
    return edited.home;
  if (
    Number.isFinite(edited.homePens) &&
    Number.isFinite(edited.awayPens)
  ) {
    return edited.homePens > edited.awayPens
      ? edited.away
      : edited.home;
  }
  return null;
}

function resolveSeedRef(ref, seeds, availableThirds, usedThirdSeeds) {
  if (/^[12][A-L]$/.test(ref)) return seeds[ref] || null;
  if (/^3[A-L]$/.test(ref)) return seeds[ref] || null;

  const thirdPool = ref.match(/^3([A-L]+)$/);
  if (!thirdPool) return null;

  const allowed = new Set(thirdPool[1].split("").map((letter) => `3${letter}`));
  const selected = availableThirds.find((team) => allowed.has(team.seed) && !usedThirdSeeds.has(team.seed));
  if (selected) usedThirdSeeds.add(selected.seed);
  return selected || null;
}

function resolveMatchRef(ref, resolvedMatches, template) {
  if (!ref) return { team: "A Definir", seed: "" };
  if (baseTeamNames.has(ref)) return { team: ref, seed: "" };

  const explicitWinner = ref.match(/^G(P?\d+)$/);
  if (explicitWinner) {
    const matchId = explicitWinner[1].startsWith("P") ? explicitWinner[1] : `P${explicitWinner[1]}`;
    return { team: winnerOf(resolvedMatches[matchId]) || `Ganador ${matchId}`, seed: ref };
  }

  const matchRef = ref.match(/^P\d+$/);
  if (matchRef) {
    const priorMatch = resolvedMatches[ref];
    const resolver = template.stage === "3er puesto" ? loserOf : winnerOf;
    const fallback = template.stage === "3er puesto" ? `Perdedor ${ref}` : `Ganador ${ref}`;
    return { team: resolver(priorMatch) || fallback, seed: ref };
  }

  return { team: ref, seed: ref };
}

function calculateKnockoutMatches(groupTables) {
  const seeds = seedMap(groupTables);
  const availableThirds = thirdCandidates(groupTables).slice(0, 8);
  const usedThirdSeeds = new Set();
  const resolvedMatches = {};

  const pairings = sourceData.knockoutTemplates.map((template) => {
    const homeSeed = resolveSeedRef(template.homeRef, seeds, availableThirds, usedThirdSeeds);
    const awaySeed = resolveSeedRef(template.awayRef, seeds, availableThirds, usedThirdSeeds);
    const homeResolved = homeSeed || resolveMatchRef(template.homeRef, resolvedMatches, template);
    const awayResolved = awaySeed || resolveMatchRef(template.awayRef, resolvedMatches, template);

    const edited = mergedMatch(template);

const match = {
  id: template.id,
  stage: template.stage,
  round: template.stage,
  date: template.date,
  time: template.time,
  stadium: template.stadium,
  group: template.stage,
  label: template.label,
  homeSeed: homeResolved.seed || template.homeRef,
  awaySeed: awayResolved.seed || template.awayRef,
  home: homeResolved.team || "A Definir",
  away: awayResolved.team || "A Definir",
  homeGoals: edited.homeGoals,
  awayGoals: edited.awayGoals,
  homePens: edited.homePens,
  awayPens: edited.awayPens
};

    resolvedMatches[match.id] = match;
    return match;
  });

  return { bestThirds: availableThirds, pairings };
}

function calculateGeneralTable(groupTables, knockoutMatches) {

  const stats = {};

  baseTeams.forEach(({ team, group }) => {
    stats[team] = emptyStats(team, group);
  });

  Object.values(groupTables).flat().forEach((team) => {
    stats[team.team] = {
      ...stats[team.team],
      ...team
    };
  });

  knockoutMatches.map(mergedMatch).forEach((match) => {
    applyMatch(stats, match, true);
  });

  // MARCAR 4° DE CADA GRUPO COMO ELIMINADOS
  Object.values(groupTables).forEach(group => {

    group.forEach(team => {

      if(team.position === 4){
        stats[team.team].eliminated = true;
      }

    });

  });
  const fourthPlaceTeams = Object.values(groupTables)
  .map(group =>
    [...group]
      .sort(compareTeams)
      .find(team => team.position === 4)?.team
  )
  .filter(Boolean);
  const qualifiedThirdNames = [];

knockoutMatches.forEach(match => {

  if(match.stage !== "16avos de final") return;

  const homeSeed = match.homeSeed || "";
  const awaySeed = match.awaySeed || "";

  if(homeSeed.startsWith("3")) {
    qualifiedThirdNames.push(match.home);
  }

  if(awaySeed.startsWith("3")) {
    qualifiedThirdNames.push(match.away);
  }

});

Object.values(groupTables)
  .flat()
  .forEach(team => {

    if(
      team.position === 3 &&
      !qualifiedThirdNames.includes(team.team)
    ){
      stats[team.team].eliminated = true;
    }

  });

  return Object.values(finalizeStats(stats))
  .sort(compareTeams)
  .map((team, index) => ({
    ...team,
    position: index + 1
  }));
}

function teamCode(team) {
  return team
    .split(/\s+/)
    .filter((word) => !["de", "del", "y"].includes(normalize(word)))
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function teamFlag(team){

  if(
    !team ||
    team.startsWith("Ganador") ||
    team.startsWith("Perdedor") ||
    team === "A Definir"
  ){
    return "";
  }

  return `
    <img
      class="flag"
      src="img/flags/${team}.png"
      alt="${team}"
      onerror="this.src='img/flags/A Definir.png'"
    >
  `;
}

function rowClass(team, scope = "general") {
  // Campeón
  if (team.team === getChampion()) {
    return "team-champion";
  }
  // TABLA DE GRUPOS
  if (scope === "group") {
    if (team.position <= 2) {
      return "team-active";
    } if (team.position === 3) {
      return "team-third";
    }
    return "team-eliminated";
  }
  // TABLA GENERAL
  if (team.eliminated) {
    return "team-eliminated";
  }
  return "team-active";
}

function tableRow(team, scope = "general") {
  const className = rowClass(team, scope);
  return `
    <tr class="${className}">
      <td>${team.position}</td>
      <td class="team-cell">${teamFlag(team.team)}${team.team}</td>
      <td class="points">${team.pts}</td>
      <td>${team.pj}</td>
      <td>${team.pg}</td>
      <td>${team.pe}</td>
      <td>${team.pp}</td>
      <td>${team.gf}</td>
      <td>${team.gc}</td>
      <td>${team.dif}</td>
      <td>${team.ta}</td>
      <td>${team.tr}</td>
      <td>${team.faltas}</td>
    </tr>
  `;
}

function isStillAlive(teamName, groupTables, bestThirds) {
  const groupFinished =
    Object.values(groupTables)
      .every(group =>
        group.every(team => team.pj === 3)
      );
  if (!groupFinished) return true;
  // clasificados directos
  const qualified = new Set();
  Object.values(groupTables).forEach(group => {
    qualified.add(group[0].team);
    qualified.add(group[1].team);
  });
  bestThirds
    .slice(0,8)
    .forEach(team =>
      qualified.add(team.team)
    );
  return qualified.has(teamName);
}

function renderGeneralTable(generalTable) {
  const rows = generalTable
    .filter((team) => matchesQuery(team.team, team.group))
    .map((team) => {
      const { knockout } = calculateAll();
      const eliminatedInKnockout = checkIfTeamIsEliminated(team.team, knockout.pairings);
      const teamWithStatus = {
        ...team,
        eliminated: team.eliminated || eliminatedInKnockout
      };

      return tableRow(teamWithStatus, "general");
    })
    .join("");

  els.generalTable.innerHTML =
    rows || `<tr><td colspan="13">No hay selecciones...</td></tr>`;
}

function getChampion() {

  const final =
    sourceData.knockoutTemplates.find(
      m => m.id === "P104"
    );

  if (!final) return null;

  return winnerOf(final);
}

function checkIfTeamIsEliminated(teamName, knockoutMatches) {

  return knockoutMatches.some(match => {
    if (
      match.homeGoals === null ||
      match.awayGoals === null
    ) {
      return false;
    }
    if (
      match.home === teamName &&
      match.homeGoals < match.awayGoals
    ) {
      return true;
    }
    if (
      match.away === teamName &&
      match.awayGoals < match.homeGoals
    ) {
      return true;
    }
    if (
      match.homeGoals === match.awayGoals &&
      match.homePens !== null &&
      match.awayPens !== null
    ) {
      if (
        match.home === teamName &&
        match.homePens < match.awayPens
      ) {
        return true;
      }
      if (
        match.away === teamName &&
        match.awayPens < match.homePens
      ) {
        return true;
      }
    }
    return false;
  });
}

function renderGroups(groupTables) {
  const groups = Object.entries(groupTables)
    .filter(([group]) => state.group === "all" || group === state.group)
    .map(([group, teams]) => {
      const filteredTeams = teams.filter((team) => matchesQuery(group, team.team));
      if (!filteredTeams.length) return "";

      return `
        <article class="group-card">
          <h3>${group}</h3>
          <table>
            <thead>
              <tr>
                <th>POS</th>
                <th class="team-head">Selección</th>
                <th>PTS</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PE</th>
                <th>PP</th>
                <th>GF</th>
                <th>GC</th>
                <th>+/-</th>
                <th>TA</th>
                <th>TR</th>
                <th>FALTAS</th>
              </tr>
            </thead>
            <tbody>${filteredTeams.map((team) => tableRow(team, "group")).join("")}</tbody>
          </table>
        </article>
      `;
    })
    .join("");

  els.groupsGrid.innerHTML = groups || `<div class="empty-state">No hay grupos para esos filtros.</div>`;
}

function inputValue(match, field) {
  const value = match[field];
  return Number.isFinite(value) ? value : "";
}

function statInput(match, field, label, className = "") {
  return `
    <label class="stat-input ${className}">
      <span>${label}</span>
      <input type="number" min="0" inputmode="numeric" value="${inputValue(match, field)}" data-match-id="${match.id}" data-field="${field}">
    </label>
  `;
}

function renderBracket() {
  const matches =
    calculateAll().knockout.pairings;
  const rounds = {
    "16avos de final": [],
    "8vos de final": [],
    "4tos de final": [],
    "Semifinales": [],
    "Final": []
  };
  matches.forEach(match => {
    if(rounds[match.stage]){
      rounds[match.stage].push(match);
    }
  });
  els.bracketView.innerHTML = `
    <div class="bracket">
      ${Object.entries(rounds).map(([round,matches]) => `
          <div class="bracket-column ${roundClasses[round]}">
            <h3>${round}</h3>
              ${matches.map(match => `
                <div class="bracket-match">
                  <div class="bracket-team">
                    ${teamFlag(match.home)}
                    <span>${bracketName(match.home)}</span>
                  </div>
                  <div class="bracket-score">
                    ${match.homeGoals ?? "-"} - ${match.awayGoals ?? "-"}
                    ${match.homePens !== null && match.awayPens !== null ? `
                    <div class="bracket-pens">
                      Pen: ${match.homePens} - ${match.awayPens}
                    </div>
                        ` : ""
                      }
                    <div class="connector-right"></div>
                  </div>
                  <div class="bracket-team">
                    ${teamFlag(match.away)}
                    <span>${bracketName(match.away)}</span>
                  </div>
                  <div class="connector"></div>
                </div>
            `).join("")}
          </div>
      `).join("")}
    </div>
  `;
}

function bracketName(name){
  if(name.startsWith("Ganador")){
    return "A Definir";
  }
  return name;
}

function editableMatchCard(match, extraLabel = "") {
  const edited = mergedMatch(match);
  const showPens = match.stage !== "group";
  // IMPORTANTE: Usamos 'edited' para los cálculos, ya que tiene los valores que el usuario escribió
  const hG = parseInt(edited.homeGoals) || 0;
  const aG = parseInt(edited.awayGoals) || 0;
  const hP = parseInt(edited.homePens);
  const aP = parseInt(edited.awayPens);
  // Verificamos si realmente se ingresaron goles para evitar que se ponga rojo antes de empezar
  const isMatchPlayed = (edited.homeGoals !== undefined && edited.homeGoals !== "") && 
                       (edited.awayGoals !== undefined && edited.awayGoals !== "");
  // Lógica de eliminación usando 'edited'
  const homeEliminated = isMatchPlayed && 
                         ((hG < aG) || (hG === aG && !isNaN(hP) && !isNaN(aP) && hP < aP));
  const awayEliminated = isMatchPlayed && 
                         ((aG < hG) || (aG === hG && !isNaN(hP) && !isNaN(aP) && aP < hP));
  return `
    <article class="match-card">
      <div class="match-meta">
        <span>${edited.id}</span>
        <span>${edited.date}</span>
        <span>${edited.time}</span>
        <span>${edited.group}</span>
        ${extraLabel ? `<span>${extraLabel}</span>` : ""}
      </div>
      
      <div class="editable-teams">
        <strong class="${homeEliminated ? 'eliminated-red' : ''}">${teamFlag(edited.home)} ${edited.home}</strong>
        <strong class="${awayEliminated ? 'eliminated-red' : ''}">${teamFlag(edited.away)} ${edited.away}</strong>
      </div>
      
      <div class="edit-grid">
        ${statInput(edited, "homeGoals", "Goles")}
        ${statInput(edited, "awayGoals", "Goles")}
        
        ${showPens ? statInput(edited, "homePens", "Pen") : ""}
        ${showPens ? statInput(edited, "awayPens", "Pen") : ""}
        
        ${statInput(edited, "homeYellow", "TA", "yellow-input")}
        ${statInput(edited, "awayYellow", "TA", "yellow-input")}
        
        ${statInput(edited, "homeRed", "TR", "red-input")}
        ${statInput(edited, "awayRed", "TR", "red-input")}
        
        ${statInput(edited, "homeFouls", "Faltas")}
        ${statInput(edited, "awayFouls", "Faltas")}
      </div>

      <div class="match-meta">
        <span>${edited.stadium}</span>
      </div>
    </article>
  `;
}

function renderMatches() {
  const matches = groupMatches.filter((match) => {
    const roundOk = state.round === "all" || String(match.round) === state.round;
    const stadiumOk = state.stadium === "all" || match.stadium === state.stadium;
    return roundOk && stadiumOk && matchesQuery(match.home, match.away, match.group, match.stadium, match.date);
  });

  els.matchesList.innerHTML =
    matches.map((match) => editableMatchCard(match, `Ronda ${match.round}`)).join("") ||
    `<div class="empty-state">No hay partidos para esos filtros.</div>`;
}

function renderBestThirds(bestThirds) {
  return `
    <article class="thirds-card" id="thirds-card">
      <h3>Mejores terceros</h3>
      <p>Clasifican los mejores 8 terceros por PTS, DIF, GF, menos amarillas, menos rojas y menos faltas.</p>
      <table>
        <thead>
          <tr>
            <th>POS</th>
            <th class="team-head">Selección</th>
            <th>Grupo</th>
            <th>PTS</th>
            <th>DIF</th>
            <th>TA</th>
            <th>TR</th>
            <th>FALT</th>
          </tr>
        </thead>
        <tbody>
          ${bestThirds.map((team, index) => `
            <tr class="${index < 8 ? "team-active" : "team-eliminated"}">
              <td>${index + 1}</td>
              <td class="team-cell">${team.team}</td>
              <td>${team.group}</td>
              <td class="points">${team.pts}</td>
              <td>${team.dif}</td>
              <td>${team.ta}</td>
              <td>${team.tr}</td>
              <td>${team.faltas}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </article>
  `;
}

function renderKnockout(bestThirds, pairings) {

  const cards = pairings
    .filter((match) => {

      const roundOk =
  state.knockoutRound === "all" ||
  match.stage === state.knockoutRound;

      return (
        roundOk &&
        matchesQuery(
          match.home,
          match.away,
          match.stadium,
          match.date,
          match.group
        )
      );

    })
    .map((match) =>
      editableMatchCard(
        match,
        `${match.homeSeed} vs ${match.awaySeed}`
      )
    )
    .join("");

  els.knockoutGrid.innerHTML = `
    ${renderBestThirds(bestThirds)}
    <div class="knockout-list">
      ${cards || `<div class="empty-state">No hay cruces para ese filtro.</div>`
      }
    </div>
  `;
}

function winnerOf(match) {

  const edited = mergedMatch(match);

  if (!hasScore(edited)) return null;

  if (edited.homeGoals > edited.awayGoals)
    return edited.home;

  if (edited.awayGoals > edited.homeGoals)
    return edited.away;

  if (
    Number.isFinite(edited.homePens) &&
    Number.isFinite(edited.awayPens)
  ) {
    return edited.homePens > edited.awayPens
      ? edited.home
      : edited.away;
  }

  return null;
}

function renderHistory() {

  if (!els.historyGrid) return;

  els.historyGrid.innerHTML = window.WC26_HISTORY.map(cup => `
    <article class="history-card">
      <div class="history-year">${cup.year}</div>
      <img src="img/flags/${cup.flag}" alt="${cup.champion}" class="history-flag">
      <h3 class="history-champion">🏆 ${cup.champion}</h3>
      <div class="history-info">
        <p><strong>Final:</strong><br>${cup.champion} ${cup.score} ${cup.runnerUp}</p>
        <p><strong>Subcampeón:</strong><br>${cup.runnerUp}</p>
        <p><strong>Sede:</strong><br>${cup.host}</p>
      </div>

    </article>
  `).join("");

}

function hydrateFilters() {

  // Grupos
  Object.keys(sourceData.groups).forEach((group) => {
    els.groupFilter.insertAdjacentHTML(
      "beforeend",
      `<option value="${group}">${group}</option>`
    );
  });

  // Eliminatorias
  const knockoutRounds = [
    ...new Set(
      sourceData.knockoutTemplates.map(match => match.stage)
    )
  ];

  knockoutRounds.forEach(round => {
    els.roundFilter2.insertAdjacentHTML(
      "beforeend",
      `<option value="${round}">${round}</option>`
    );
  });

  // Estadios
  [...new Set(groupMatches.map(match => match.stadium))]
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach((stadium) => {
      els.stadiumFilter.insertAdjacentHTML(
        "beforeend",
        `<option value="${stadium}">${stadium}</option>`
      );
    });

}

function calculateAll() {
  const groupTables = calculateGroupTables();
  const knockout = calculateKnockoutMatches(groupTables);
  const generalTable = calculateGeneralTable(groupTables, knockout.pairings);
  return { groupTables, knockout, generalTable };
}

function renderAll() {

  const {
    groupTables,
    knockout,
    generalTable
  } = calculateAll();

  renderGeneralTable(generalTable);
  renderGroups(groupTables);
  renderMatches();
  renderKnockout(
    knockout.bestThirds,
    knockout.pairings
  );

  renderBracket();

  renderHistory();
}

function handleMatchInput(event) {
  const input = event.target.closest("[data-match-id][data-field]");
  if (!input) return;

  const matchId = input.dataset.matchId;
  const field = input.dataset.field;
  const value = toInputNumber(input.value);
  state.edits[matchId] = state.edits[matchId] || {};

  if (value === null) {
    delete state.edits[matchId][field];
  } else {
    state.edits[matchId][field] = value;
  }

  if (!Object.keys(state.edits[matchId]).length) {
    delete state.edits[matchId];
  }

  saveEdits();
  renderAll();
}

function isTeamEliminated(match) {
  // Solo evaluamos si el partido ya se jugó (hay goles cargados)
  if (match.homeGoals === null || match.awayGoals === null) return false;

  // Si hay penales (o sea, empate en goles), el ganador es quien ganó en penales
  if(
  match.homeGoals === match.awayGoals && match.homePens !== null && match.awayPens !== null
  ){
  homeWinner = match.homePens > match.awayPens;
  awayWinner = match.awayPens > match.homePens;
  }

  // Si no hay penales, el que hizo menos goles está eliminado
  return match.homeGoals !== match.awayGoals;
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.view = tab.dataset.view;
    els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
    els.views.forEach((view) => view.classList.toggle("active", view.id === state.view));
  });
});

els.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderAll();
});

els.groupFilter.addEventListener("change", (event) => {
  state.group = event.target.value;
  renderAll();
});

els.roundFilter.addEventListener("change", (event) => {
  state.round = event.target.value;
  renderAll();
});

els.roundFilter2.addEventListener("change", (event) => {
  state.knockoutRound = event.target.value;
  renderAll();
});

els.stadiumFilter.addEventListener("change", (event) => {
  state.stadium = event.target.value;
  renderAll();
});

els.resetData.addEventListener("click", () => {
  const shouldReset = window.confirm("¿Querés limpiar todos los goles, tarjetas y faltas cargados?");
  if (!shouldReset) return;
  state.edits = {};
  saveEdits();
  renderAll();
});

els.historyBtn.addEventListener("click", () => {
  const isHidden = els.historySection.style.display === "none";
  els.historySection.style.display = isHidden ? "block" : "none";
  els.historyBtn.textContent = isHidden ? "Ocultar Historia" : "Campeones del Mundo";
});

els.knockoutBtn.addEventListener("click", () => {
  const thirdsCard = document.querySelector("#thirds-card");
  if(!thirdsCard) return;
  const isHidden = thirdsCard.style.display === "none";
  thirdsCard.style.display = isHidden ? "block" : "none";
  els.knockoutBtn.textContent = isHidden ? "Ocultar Mejores Terceros" : "Mostrar Mejores Terceros";
});

document.addEventListener("change", handleMatchInput);

els.teamsCount.textContent = baseTeams.length;
els.matchesCount.textContent = groupMatches.length + sourceData.knockoutTemplates.length;

hydrateFilters();
renderHistory();
renderAll();