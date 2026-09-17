(function(){
  "use strict";

  var YEARS = ["2010", "2013", "2016", "2019", "2022", "2025"];

  var RACE_META = {
    local: {
      label: "Local (Mayor, Councilor)",
      legendTitle: "Landslide share",
      legendNote: "How often that province's local races (mayor, vice mayor, councilor) end in a landslide rather than a close contest, 2010&ndash;2025.",
      tipUnit: "landslide",
      headlineNoun: "mayoral",
      topLabel: "winner",
      resultsLabel: "Local results",
      nationalDesc: "The share of local races nationwide that ended in a landslide rather than a close contest, across every mapped province and election.",
      intro: "<p><b>29% of local elections in the Philippines have ended in a landslide since 2010, and that share is rising almost everywhere.</b> A clustering model looked at each town's vote margins and sorted every election into landslide or competitive on its own. It only measures how lopsided a result was, not who won or why.</p>",
      howNote: "\"ENC\" = effective number of candidates (1 &divide; Herfindahl&ndash;Hirschman index). A higher number means a more fragmented race. Landslide and competitive labels come from a k-means clustering model; \"unusual\" flags come from a separate isolation-forest anomaly-detection model. Both describe vote-share patterns only, not claims about irregularities or fraud.",
      hasAnomalyStability: true,
      clusterHint: ["One candidate won by a wide margin.", "No candidate won by a wide margin."]
    },
    provincial: {
      label: "Provincial (Governor)",
      legendTitle: "Landslide share",
      legendNote: "How often each city's own vote in its province's Governor race is a landslide rather than a close contest, 2010&ndash;2025.",
      tipUnit: "landslide",
      headlineNoun: "gubernatorial",
      topLabel: "winner",
      posLabel: "Governor",
      resultsLabel: "Race results",
      nationalDesc: "The share of gubernatorial races nationwide that ended in a landslide rather than a close contest, across every mapped province and election.",
      intro: "<p><b>Same method, aimed at the Governor's race instead of city hall.</b> Governor is decided province-wide, but each city still casts its own split of the vote. This clusters that split the same way as the local model: landslide or competitive, nothing about who actually wins the province.</p>",
      howNote: "\"ENC\" = effective number of candidates (1 &divide; Herfindahl&ndash;Hirschman index). A higher number means a more fragmented race. Landslide and competitive labels come from a k-means clustering model run on the Governor, Vice Governor, and Provincial Board Member races together. No anomaly-detection model has been run for this race yet.",
      hasAnomalyStability: false,
      clusterHint: ["The Governor candidate here won by a wide margin.", "The Governor race here was more evenly split."]
    },
    congressional: {
      label: "Congressional (House)",
      legendTitle: "Landslide share",
      legendNote: "How often each city's own vote in its district's House of Representatives race is a landslide rather than a close contest, 2010&ndash;2025.",
      tipUnit: "landslide",
      headlineNoun: "congressional",
      topLabel: "winner",
      posLabel: "House",
      resultsLabel: "Race results",
      nationalDesc: "The share of congressional races nationwide that ended in a landslide rather than a close contest, across every mapped province and election.",
      intro: "<p><b>Same method, aimed at the House of Representatives race.</b> A House seat is decided across a whole district, but each city still casts its own split of the vote. This clusters that split the same way as the local model: landslide or competitive.</p>",
      howNote: "\"ENC\" = effective number of candidates (1 &divide; Herfindahl&ndash;Hirschman index). A higher number means a more fragmented race. Landslide and competitive labels come from a k-means clustering model run on the House race alone. No anomaly-detection model has been run for this race yet.",
      hasAnomalyStability: false,
      clusterHint: ["The House candidate here won by a wide margin.", "The House race here was more evenly split."]
    },
    presidential: {
      label: "Presidential",
      legendTitle: "Landslide share",
      legendNote: "How often each city's own vote for President is a landslide rather than a close contest. Only 2010, 2016, and 2022 had a presidential race, so this covers half the years the local model does.",
      tipUnit: "landslide",
      headlineNoun: "presidential",
      topLabel: "winner",
      posLabel: "President",
      resultsLabel: "Race results",
      nationalDesc: "The share of presidential races nationwide that ended in a landslide rather than a close contest, across every mapped province and the three elections with a presidential race.",
      intro: "<p><b>Same method, applied to how each city voted for President.</b> President and Vice President are decided nationally, but each city still casts its own split of the vote. Only three of the six elections in this data had a presidential race at all, so this view has half the coverage of the local model.</p>",
      howNote: "\"ENC\" = effective number of candidates (1 &divide; Herfindahl&ndash;Hirschman index). A higher number means a more fragmented race. Landslide and competitive labels come from a k-means clustering model run on the President and Vice President races together. No anomaly-detection model has been run for this race yet.",
      hasAnomalyStability: false,
      clusterHint: ["The presidential candidate here won by a wide margin.", "The presidential race here was more evenly split."]
    },
    senate: {
      label: "Senate",
      legendTitle: "Low-fragmentation share",
      legendNote: "The Senate elects 12 members at once from a field that often runs into the dozens of candidates, so no single candidate's share works as a \"landslide\" signal the way it does in a single-winner race. This shows which cities' Senate vote was comparatively less split up, not a dominant winner.",
      tipUnit: "less fragmented",
      headlineNoun: "Senate",
      topLabel: "top candidate",
      posLabel: "Senate",
      resultsLabel: "Race results",
      nationalDesc: "The share of Senate races nationwide where the vote was comparatively less fragmented, across every mapped province and election. Not a landslide winner, since 12 seats are filled at once.",
      intro: "<p><b>The Senate doesn't have a landslide winner the usual way.</b> Twelve seats are filled at once from a field that often runs into the dozens of candidates, so the vote splits thin everywhere. This clusters cities by how much less fragmented their Senate vote was, not by any one candidate dominating.</p>",
      howNote: "\"ENC\" = effective number of candidates (1 &divide; Herfindahl&ndash;Hirschman index), and it runs high here: an average in the high teens to mid-20s, since 12 seats draw dozens of candidates. The \"low-fragmentation\" cluster is the comparatively less-split vote, not a dominant winner. No anomaly-detection model has been run for this race yet.",
      hasAnomalyStability: false,
      clusterLabels: ["Low-fragmentation", "Fragmented"],
      clusterHint: ["This city's Senate vote was comparatively less split up than most, though still shared across many candidates.", "This city's Senate vote was split thin across a large candidate field, like most cities."]
    },
    partylist: {
      label: "Party List",
      legendTitle: "Landslide share",
      legendNote: "How often one party-list group takes a lopsided share of that city's party-list vote, 2010&ndash;2025.",
      tipUnit: "landslide",
      headlineNoun: "party-list",
      topLabel: "leading group",
      posLabel: "Party List",
      resultsLabel: "Race results",
      nationalDesc: "The share of party-list races nationwide where one group took a lopsided share of the vote, across every mapped province and election.",
      intro: "<p><b>Same method, applied to the party-list vote.</b> Party-list seats are awarded proportionally, not winner-take-all, but each city's split still clusters the same way: one group taking a lopsided share versus a more even split across parties.</p>",
      howNote: "\"ENC\" = effective number of candidates (1 &divide; Herfindahl&ndash;Hirschman index). A higher number means a more even split across party-list groups. Landslide and competitive labels come from a k-means clustering model run on the party-list vote alone. No anomaly-detection model has been run for this race yet.",
      hasAnomalyStability: false,
      clusterHint: ["One party-list group took a lopsided share of this city's vote.", "The party-list vote here was split more evenly across groups."]
    }
  };
  var RACE_ORDER = ["local", "provincial", "congressional", "presidential", "senate", "partylist"];

  Promise.all([
    fetchJson("data/province_clusters.json"),
    fetchJson("data/localities.json").catch(function(err){
      // Locality drill-down degrades gracefully -- the province map and its stats
      // don't depend on this file loading.
      console.error("Vote-Shape Map: failed to load locality data -", err);
      return null;
    }),
    fetchJson("data/province_stats_by_race.json").catch(function(err){
      console.error("Vote-Shape Map: failed to load other-race province stats -", err);
      return null;
    }),
    fetchJson("data/locality_races.json").catch(function(err){
      console.error("Vote-Shape Map: failed to load other-race locality data -", err);
      return null;
    })
  ])
    .then(function(results){ boot(results[0], results[1], results[2], results[3]); })
    .catch(function(err){
      console.error("Vote-Shape Map: failed to load province data -", err);
      var mapEl = document.getElementById("map");
      mapEl.innerHTML = mapFailureHtml(
        "Couldn't load the province data (data/province_clusters.json). " +
        "If you opened this file directly from disk, most browsers block that fetch " +
        "for local files. Serve this folder instead (e.g. `python3 -m http.server`)."
      );
    });

  function fetchJson(path){
    return fetch(path).then(function(r){
      if (!r.ok) { throw new Error("HTTP " + r.status + " for " + path); }
      return r.json();
    });
  }

  function mapFailureHtml(message){
    return '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
      'padding:32px;text-align:center;color:var(--text-secondary);font-size:13px;font-weight:500;line-height:1.6;">' +
      message + '</div>';
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  function boot(raw, localLocalityData, provinceStatsByRace, localityRacesByRace){
    var features = raw.features;

    // ---- per-group province stats: "local" comes from the geometry file itself (it already
    // carries {p, n, l} per feature); every other group comes from the small, geometry-free
    // province_stats_by_race.json so switching races re-styles the same polygons instead of
    // re-fetching them. ----
    var localProvinceStats = {};
    features.forEach(function(f){
      localProvinceStats[f.properties.p] = { n: f.properties.n, l: f.properties.l };
    });

    function statsFor(group){
      if (group === "local") { return localProvinceStats; }
      return (provinceStatsByRace && provinceStatsByRace[group]) || {};
    }

    function localityDataFor(group){
      if (group === "local") { return localLocalityData; }
      return (localityRacesByRace && localityRacesByRace[group]) || null;
    }

    // attach province display name to each locality entry once, for the locality header
    RACE_ORDER.forEach(function(group){
      var ld = localityDataFor(group);
      if (!ld) { return; }
      Object.keys(ld).forEach(function(provinceName){
        ld[provinceName].forEach(function(loc){ loc.p_display = provinceName; });
      });
    });

    function oceanColor(){
      return getComputedStyle(document.documentElement).getPropertyValue("--surface-page").trim() || "#f4f4f4";
    }
    function inkColor(){
      return getComputedStyle(document.documentElement).getPropertyValue("--text-primary").trim() || "#161616";
    }
    function accentColor(){
      return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6e6e6e";
    }

    var raceSelect = document.getElementById("race-select");
    var legendTitleEl = document.getElementById("legend-title");
    var legendNoteEl = document.getElementById("legend-note");
    var rankTopTitle = document.getElementById("rank-top-title");
    var rankBottomTitle = document.getElementById("rank-bottom-title");
    var statNLabel = document.getElementById("stat-n-label");

    var detailName = document.getElementById("detail-name");
    var detailFigure = document.getElementById("detail-figure");
    var detailSub = document.getElementById("detail-sub");
    var detailHint = document.getElementById("detail-hint");
    var resetBtn = document.getElementById("detail-reset");

    var storyIntro = document.getElementById("story-intro");
    var rankListsWrap = document.getElementById("rank-lists-wrap");
    var localityListSection = document.getElementById("locality-list-section");
    var localityListTitle = document.getElementById("locality-list-title");
    var localitySearch = document.getElementById("locality-search");
    var localityListEl = document.getElementById("locality-list");
    var localityDetailSection = document.getElementById("locality-detail-section");
    var localityBackProvince = document.getElementById("locality-back-province");
    var localityCityName = document.getElementById("locality-city-name");
    var localityRegion = document.getElementById("locality-region");
    var localityHeadline = document.getElementById("locality-headline");
    var localityTimeline = document.getElementById("locality-timeline");
    var localityAnomaly = document.getElementById("locality-anomaly");
    var localityStability = document.getElementById("locality-stability");
    var localityHowHead = document.getElementById("locality-how-table-head");
    var localityHowBody = document.getElementById("locality-how-table-body");
    var localityHowNote = document.getElementById("locality-how-note");

    var currentGroup = "local";
    var domainMin, domainMax, totalN, nationalAvg;
    var byProvince = {};       // populated once the map initializes
    var lockedProvince = null; // province name string, or null = following hover
    var currentLocalities = []; // localities of the currently-listed province

    function recomputeDomain(group){
      var stats = statsFor(group);
      var names = Object.keys(stats);
      var shares = names.map(function(p){ return stats[p].l; });
      domainMin = Math.min.apply(null, shares);
      domainMax = Math.max.apply(null, shares);
      totalN = names.reduce(function(s,p){ return s + stats[p].n; }, 0);
      nationalAvg = names.reduce(function(s,p){ return s + stats[p].l * stats[p].n; }, 0) / totalN;
    }

    // ---------------------------------------------------------------- view state
    function showView(v){
      storyIntro.hidden = (v !== "national");
      rankListsWrap.hidden = (v !== "national");
      localityListSection.hidden = (v !== "province");
      localityDetailSection.hidden = (v !== "locality");
    }

    // ---------------------------------------------------------------- plain-language helpers
    function clusterLabel(k){
      var meta = RACE_META[currentGroup] || {};
      var labels = meta.clusterLabels || ["Landslide", "Competitive"];
      return k === 0 ? labels[0] : labels[1];
    }

    // ---------------------------------------------------------------- chip hover/focus tooltip
    // One shared floating element, appended to <body> rather than inside the sidebar, so it is
    // never clipped by the sidebar's own overflow-x:hidden scroll container.
    var chipTip = document.createElement("div");
    chipTip.className = "chip-tooltip";
    chipTip.setAttribute("role", "tooltip");
    chipTip.hidden = true;
    document.body.appendChild(chipTip);

    function showChipTooltip(el, text){
      chipTip.textContent = text;
      chipTip.hidden = false;
      var r = el.getBoundingClientRect();
      var tipRect = chipTip.getBoundingClientRect();
      var left = r.left + r.width / 2 - tipRect.width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
      var top = r.top - tipRect.height - 8;
      var flipped = false;
      if (top < 8){ top = r.bottom + 8; flipped = true; }
      chipTip.style.left = left + "px";
      chipTip.style.top = top + "px";
      chipTip.classList.toggle("chip-tooltip-below", flipped);
    }
    function hideChipTooltip(){ chipTip.hidden = true; }
    document.addEventListener("scroll", hideChipTooltip, true);
    window.addEventListener("resize", hideChipTooltip);

    function chipHint(yd){
      if (!yd){ return "No data this year. This city's numbers weren't complete enough that year to include it in the model."; }
      var meta = RACE_META[currentGroup] || {};
      var hints = meta.clusterHint || ["", ""];
      var text = clusterLabel(yd.k) + ". " + (yd.k === 0 ? hints[0] : hints[1]);
      if (yd.o){ text += " Also flagged as a statistically unusual pattern for this city."; }
      return text;
    }
    function wireChipTooltip(chip, year, yd){
      var text = year + ": " + chipHint(yd);
      chip.tabIndex = 0;
      chip.setAttribute("aria-label", text);
      chip.addEventListener("mouseenter", function(){ showChipTooltip(chip, text); });
      chip.addEventListener("mouseleave", hideChipTooltip);
      chip.addEventListener("focus", function(){ showChipTooltip(chip, text); });
      chip.addEventListener("blur", hideChipTooltip);
      chip.addEventListener("click", function(e){
        e.stopPropagation();
        if (chipTip.hidden || chipTip.textContent !== text){ showChipTooltip(chip, text); }
        else { hideChipTooltip(); }
      });
    }
    document.addEventListener("click", hideChipTooltip);

    function latestYearKey(loc){
      for (var i = YEARS.length - 1; i >= 0; i--){
        if (loc.y[YEARS[i]]) { return YEARS[i]; }
      }
      return null;
    }

    function localityHeadlineHtml(loc, year){
      var meta = RACE_META[currentGroup];
      var yd = loc.y[year];
      if (!yd){
        return "No complete-case data for " + year + " for this city " +
          "(excluded from the model that year, see the project's per-year coverage notes).";
      }
      var shareKey = currentGroup === "local" ? "ms" : "s";
      var marginKey = currentGroup === "local" ? "mm" : "m";
      var pct = (yd[shareKey] * 100).toFixed(1);
      var marginPts = (yd[marginKey] * 100).toFixed(1);
      return year + " " + meta.headlineNoun + " race: <b>" + clusterLabel(yd.k) + "</b>. The " +
        meta.topLabel + " took " + pct + "% of the vote, " + marginPts + " points ahead of the runner-up.";
    }

    function anomalyNarrative(yd){
      if (!yd || !yd.o){ return null; }
      if (yd.sh === "sweep"){
        return { title: "Unusual: uncontested sweep", text:
          "Both the Mayor and Vice Mayor races were completely uncontested this year, " +
          "an unusual combination in this dataset." };
      }
      if (yd.sh === "fragmented"){
        return { title: "Unusual: close top, split down-ballot", text:
          "The Mayor's race was extremely close, while the Councilor race had the vote spread thin " +
          "across roughly " + yd.ce + " candidates, an unusual pairing." };
      }
      return { title: "Unusual pattern", text:
        "This election's overall vote-shape didn't match either common \"unusual\" pattern in " +
        "this dataset, but it still stood out statistically (anomaly score " + yd.os.toFixed(2) + ")." };
    }

    function stabilitySentence(s){
      if (!s){ return "No cross-election history available for this city."; }
      var out = "Across the " + s.ny + " election" + (s.ny === 1 ? "" : "s") + " on record here, ";
      if (s.nt === 0){
        out += "there's only one election on record, so there's no pattern change to compare.";
      } else if (s.nc === 0){
        out += "the voting pattern held steady across all " + s.nt + " consecutive election" + (s.nt === 1 ? "" : "s") + ".";
      } else {
        out += "the voting pattern changed in " + s.nc + " of " + s.nt + " consecutive elections (" +
          Math.round(s.cr * 100) + "%).";
      }
      if (s.ef){
        out += " It stood out as statistically unusual in " + s.nf + " of " + s.ny + " election" + (s.ny === 1 ? "" : "s") + ".";
      }
      return out;
    }

    // ---------------------------------------------------------------- province-level
    function paint(provinceName){
      var stats = statsFor(currentGroup)[provinceName];
      if (!stats) { return; }
      detailName.textContent = provinceName;
      detailFigure.innerHTML = (stats.l*100).toFixed(1) + "<sup>%</sup>";
      var deltaPts = (stats.l - nationalAvg) * 100;
      var deltaText = (deltaPts >= 0 ? "+" : "") + deltaPts.toFixed(1) + " points";
      detailSub.innerHTML = stats.n.toLocaleString() + " locality-years observed &middot; <b>" + deltaText +
        "</b> vs. the national average (" + (nationalAvg*100).toFixed(1) + "%).";
      document.querySelectorAll(".rank-row").forEach(function(el){
        el.classList.toggle("active", el.dataset.province === provinceName);
      });
    }

    function paintNational(){
      detailName.textContent = "Philippines (national)";
      detailFigure.innerHTML = (nationalAvg*100).toFixed(1) + "<sup>%</sup>";
      detailSub.textContent = RACE_META[currentGroup].nationalDesc;
      document.querySelectorAll(".rank-row").forEach(function(el){ el.classList.remove("active"); });
    }

    function setLockUi(isLocked){
      resetBtn.hidden = !isLocked;
      if (!isLocked){
        detailHint.textContent = "Hover or tap a province on the map, or a row below. Click one to lock it.";
      } else if (localityDataFor(currentGroup)){
        detailHint.textContent = "Click a city below to see its history, click another province to change, or reset above.";
      } else {
        detailHint.textContent = "Click another province to change, or reset above.";
      }
    }

    function styleDefault(lyr){ lyr.setStyle({ weight: 1.1, color: oceanColor() }); }
    function styleHover(lyr){ lyr.setStyle({ weight: 2.2, color: inkColor() }); lyr.bringToFront(); }
    function styleLocked(lyr){ lyr.setStyle({ weight: 2.8, color: accentColor() }); lyr.bringToFront(); }

    var lockedLayer = null;

    function lockTo(provinceName, lyr, flyTo){
      if (lockedLayer && lockedLayer !== lyr){ styleDefault(lockedLayer); }
      lockedProvince = provinceName;
      lockedLayer = lyr || null;
      if (lockedLayer){ styleLocked(lockedLayer); }
      paint(provinceName);
      setLockUi(true);
      if (localityDataFor(currentGroup)){
        renderLocalityList(provinceName);
        showView("province");
      } else {
        // No drill-down data available for this race -- fall back to the simpler locked view
        // where the rank lists stay visible.
        storyIntro.hidden = false;
        rankListsWrap.hidden = false;
        localityListSection.hidden = true;
        localityDetailSection.hidden = true;
      }
      if (flyTo && lyr && lyr.getBounds && window.__voteShapeMap){
        window.__voteShapeMap.flyToBounds(lyr.getBounds(), { padding: [40,40], duration: 0.6 });
      }
    }

    function unlock(){
      if (lockedLayer){ styleDefault(lockedLayer); }
      lockedProvince = null;
      lockedLayer = null;
      paintNational();
      setLockUi(false);
      showView("national");
    }

    resetBtn.addEventListener("click", unlock);

    function buildRankList(el, sortedNames, stats){
      el.innerHTML = "";
      sortedNames.forEach(function(provinceName){
        var stat = stats[provinceName];
        var li = document.createElement("li");
        li.className = "rank-row";
        li.dataset.province = provinceName;
        li.innerHTML = '<span class="rank-name">' + provinceName + '</span><span class="rank-value mono">' + (stat.l*100).toFixed(0) + '%</span>';
        li.addEventListener("click", function(){ lockTo(provinceName, byProvince[provinceName], true); });
        li.addEventListener("mouseenter", function(){
          var lyr = byProvince[provinceName];
          if (lyr && provinceName !== lockedProvince){ styleHover(lyr); }
        });
        li.addEventListener("mouseleave", function(){
          var lyr = byProvince[provinceName];
          if (lyr && provinceName !== lockedProvince){ styleDefault(lyr); }
        });
        el.appendChild(li);
      });
    }

    function refreshRankLists(){
      var stats = statsFor(currentGroup);
      var names = Object.keys(stats).sort(function(a,b){ return stats[b].l - stats[a].l; });
      buildRankList(document.getElementById("rank-top"), names.slice(0, 5), stats);
      buildRankList(document.getElementById("rank-bottom"), names.slice(-5).reverse(), stats);
    }

    // ---------------------------------------------------------------- locality drill-down
    function renderLocalityList(provinceName){
      var ld = localityDataFor(currentGroup);
      currentLocalities = (ld && ld[provinceName]) || [];
      localityListTitle.textContent = "Cities in " + provinceName + " (" + currentLocalities.length + ")";
      localitySearch.value = "";
      drawLocalityList(currentLocalities);
    }

    function drawLocalityList(list){
      localityListEl.innerHTML = "";
      if (!list.length){
        var empty = document.createElement("li");
        empty.className = "locality-empty";
        empty.textContent = "No city-level data available for this province.";
        localityListEl.appendChild(empty);
        return;
      }
      list.forEach(function(loc){
        var yr = latestYearKey(loc);
        var yd = yr ? loc.y[yr] : null;
        var li = document.createElement("li");
        li.className = "locality-row";
        var dotClass = "locality-dot" + (yd && yd.k === 1 ? " competitive" : "") +
          (loc.s && loc.s.ef ? " flagged" : "");
        li.innerHTML = '<span class="' + dotClass + '"></span><span class="locality-name">' +
          escapeHtml(loc.c) + '</span>';
        li.addEventListener("click", function(){ selectLocality(loc); });
        localityListEl.appendChild(li);
      });
    }

    localitySearch.addEventListener("input", function(){
      var q = localitySearch.value.trim().toUpperCase();
      if (!q){ drawLocalityList(currentLocalities); return; }
      drawLocalityList(currentLocalities.filter(function(loc){
        return loc.c.indexOf(q) !== -1;
      }));
    });

    function renderHowTable(){
      var meta = RACE_META[currentGroup];
      if (currentGroup === "local"){
        localityHowHead.innerHTML = "<tr><th>Year</th><th>Pattern</th><th>Mayor share</th>" +
          "<th>Mayor margin</th><th>Councilor ENC</th><th>Unusual?</th></tr>";
      } else {
        localityHowHead.innerHTML = "<tr><th>Year</th><th>Pattern</th><th>" + meta.posLabelSafe +
          " share</th><th>" + meta.posLabelSafe + " margin</th><th>" + meta.posLabelSafe + " ENC</th></tr>";
      }
      localityHowNote.innerHTML = meta.howNote;
    }

    function selectLocality(loc){
      var meta = RACE_META[currentGroup];
      localityBackProvince.textContent = lockedProvince + " (" + currentLocalities.length + ")";
      localityCityName.textContent = loc.c + ", " + loc.p_display;
      localityRegion.textContent = loc.r;

      var yr = latestYearKey(loc);
      localityHeadline.innerHTML = yr ? localityHeadlineHtml(loc, yr) : "No usable election data for this city.";

      localityTimeline.innerHTML = "";
      YEARS.forEach(function(year){
        var yd = loc.y[year];
        var chip = document.createElement("div");
        if (!yd){
          chip.className = "timeline-chip missing";
          chip.textContent = year;
        } else {
          chip.className = "timeline-chip" + (yd.k === 0 ? " landslide" : "") + (yd.o ? " flagged" : "");
          chip.textContent = year;
        }
        wireChipTooltip(chip, year, yd);
        localityTimeline.appendChild(chip);
      });

      if (meta.hasAnomalyStability){
        var narrative = yr ? anomalyNarrative(loc.y[yr]) : null;
        if (narrative){
          localityAnomaly.hidden = false;
          localityAnomaly.innerHTML = "<b>" + narrative.title + "</b>" + narrative.text;
        } else {
          localityAnomaly.hidden = true;
          localityAnomaly.innerHTML = "";
        }
        localityStability.hidden = false;
        localityStability.textContent = stabilitySentence(loc.s);
      } else {
        localityAnomaly.hidden = true;
        localityAnomaly.innerHTML = "";
        localityStability.hidden = true;
        localityStability.textContent = "";
      }

      renderHowTable();
      localityHowBody.innerHTML = "";
      YEARS.forEach(function(year){
        var yd = loc.y[year];
        if (!yd){ return; }
        var tr = document.createElement("tr");
        if (currentGroup === "local"){
          tr.innerHTML = "<td>" + year + "</td>" +
            "<td>" + clusterLabel(yd.k) + "</td>" +
            "<td>" + (yd.ms*100).toFixed(1) + "%</td>" +
            "<td>" + (yd.mm*100).toFixed(1) + " pts</td>" +
            "<td>" + yd.ce.toFixed(1) + "</td>" +
            "<td>" + (yd.o ? "Yes" : "No") + "</td>";
        } else {
          tr.innerHTML = "<td>" + year + "</td>" +
            "<td>" + clusterLabel(yd.k) + "</td>" +
            "<td>" + (yd.s*100).toFixed(1) + "%</td>" +
            "<td>" + (yd.m*100).toFixed(1) + " pts</td>" +
            "<td>" + yd.e.toFixed(1) + "</td>";
        }
        localityHowBody.appendChild(tr);
      });

      showView("locality");
    }

    document.getElementById("locality-back").addEventListener("click", function(){
      showView("province");
    });

    // ---------------------------------------------------------------- race switching
    function applyRace(group){
      currentGroup = group;
      var meta = RACE_META[group];
      recomputeDomain(group);

      legendTitleEl.textContent = meta.legendTitle;
      legendNoteEl.innerHTML = meta.legendNote;
      rankTopTitle.textContent = "Highest " + meta.legendTitle.toLowerCase();
      rankBottomTitle.textContent = "Lowest " + meta.legendTitle.toLowerCase();
      statNLabel.textContent = meta.resultsLabel;
      storyIntro.innerHTML = meta.intro;

      document.getElementById("legend-min").textContent = Math.round(domainMin*100) + "%";
      document.getElementById("legend-max").textContent = Math.round(domainMax*100) + "%";
      document.getElementById("stat-national").textContent = (nationalAvg*100).toFixed(1) + "%";
      document.getElementById("stat-n").textContent = totalN.toLocaleString();
      document.getElementById("stat-provinces").textContent = Object.keys(statsFor(group)).length;

      // re-style the existing map layer's fills from the new group's stats, rather than
      // re-fetching or redrawing geometry
      if (window.__voteShapeLayer){
        window.__voteShapeLayer.eachLayer(function(lyr){
          var provinceName = lyr.feature.properties.p;
          var stat = statsFor(group)[provinceName];
          if (!stat) { lyr.setStyle({ fillOpacity: 0 }); return; }
          lyr.setStyle({ fillColor: window.__voteShapeColorFor(stat.l, domainMin, domainMax), fillOpacity: 0.92 });
          lyr.unbindTooltip();
          lyr.bindTooltip(
            '<span class="tip-name">' + provinceName + '</span><br>' +
            '<span class="tip-share">' + (stat.l*100).toFixed(1) + '% ' + meta.tipUnit + '</span>',
            { className: "province-tip", sticky: true, direction: "top", offset: [0, -6] }
          );
        });
      }

      unlock();
      refreshRankLists();
    }

    raceSelect.innerHTML = "";
    RACE_ORDER.forEach(function(group){
      var opt = document.createElement("option");
      opt.value = group;
      opt.textContent = RACE_META[group].label;
      raceSelect.appendChild(opt);
    });
    // short position-label form used in the how-table header, computed once so it doesn't
    // need HTML-escaping logic sprinkled at render time
    RACE_ORDER.forEach(function(group){ RACE_META[group].posLabelSafe = escapeHtml(RACE_META[group].posLabel || ""); });
    raceSelect.addEventListener("change", function(){ applyRace(raceSelect.value); });

    // ---- the map itself, isolated in its own try/catch: if Leaflet failed to
    // load (blocked CDN, offline, ad-blocker) everything above still works. ----
    try {
      if (typeof L === "undefined") { throw new Error("Leaflet did not load"); }

      // sequential color ramp: viridis (dark purple -> blue -> teal -> green -> yellow), low -> high
      // share. Multi-hue, but still a real sequential ramp -- relative luminance rises
      // monotonically stop to stop (checked directly, not eyeballed), it's built to stay
      // readable under protanopia/deuteranopia, and it degrades gracefully to grayscale if
      // printed -- unlike a literal rainbow/jet ramp, the color never implies a false boundary
      // in the data. Sidebar accents (--seq-* in style.css) are untouched -- this ramp is only
      // ever used for the province choropleth fill and its legend bar.
      var ramp = ["#440154","#482878","#3e4a89","#31688e","#26828e",
                  "#1f9e89","#35b779","#6ece58","#b5de2b","#fde725"];
      var rampRgb = ramp.map(function(h){
        h = h.replace("#","");
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
      });
      function colorFor(v, min, max){
        var t = max > min ? (v - min) / (max - min) : 0;
        t = Math.max(0, Math.min(1, t));
        var pos = t * (rampRgb.length - 1);
        var i = Math.floor(pos);
        var frac = pos - i;
        var a = rampRgb[i], b = rampRgb[Math.min(i+1, rampRgb.length-1)];
        var rgb = [
          Math.round(a[0] + (b[0]-a[0])*frac),
          Math.round(a[1] + (b[1]-a[1])*frac),
          Math.round(a[2] + (b[2]-a[2])*frac)
        ];
        return "rgb(" + rgb.join(",") + ")";
      }
      window.__voteShapeColorFor = colorFor;

      recomputeDomain("local");

      var map = L.map("map", {
        zoomControl: true,
        attributionControl: false,
        minZoom: 5,
        maxZoom: 9,
        zoomSnap: 0.25
      });
      window.__voteShapeMap = map;

      var layer = L.geoJSON(raw, {
        style: function(feature){
          return { fillColor: colorFor(feature.properties.l, domainMin, domainMax), fillOpacity: 0.92, color: oceanColor(), weight: 1.1 };
        },
        onEachFeature: function(feature, lyr){
          var p = feature.properties;
          lyr.bindTooltip(
            '<span class="tip-name">' + p.p + '</span><br>' +
            '<span class="tip-share">' + (p.l*100).toFixed(1) + '% landslide</span>',
            { className: "province-tip", sticky: true, direction: "top", offset: [0, -6] }
          );
          lyr.on("mouseover", function(){
            if (p.p === lockedProvince) { return; }
            styleHover(lyr);
            if (!lockedProvince) { paint(p.p); }
          });
          lyr.on("mouseout", function(){
            if (p.p === lockedProvince) { return; }
            styleDefault(lyr);
            if (!lockedProvince) { paintNational(); }
          });
          lyr.on("click", function(){ lockTo(p.p, lyr, true); });
        }
      }).addTo(map);
      window.__voteShapeLayer = layer;

      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      layer.eachLayer(function(lyr){ byProvince[lyr.feature.properties.p] = lyr; });

      window.addEventListener("resize", function(){ map.invalidateSize(); });
    } catch (err) {
      console.error("Vote-Shape Map: map failed to initialize -", err);
      document.getElementById("map").innerHTML = mapFailureHtml(
        "The map layer failed to load (likely a blocked script host or an offline network). " +
        "The province breakdown and rankings on the right are unaffected. Use those to explore the data."
      );
      recomputeDomain("local");
    }

    // initial paint, independent of whether the map itself loaded
    paintNational();
    refreshRankLists();
    document.getElementById("legend-min").textContent = Math.round(domainMin*100) + "%";
    document.getElementById("legend-max").textContent = Math.round(domainMax*100) + "%";
    document.getElementById("stat-national").textContent = (nationalAvg*100).toFixed(1) + "%";
    document.getElementById("stat-n").textContent = totalN.toLocaleString();
    document.getElementById("stat-provinces").textContent = Object.keys(statsFor("local")).length;
  }
})();
