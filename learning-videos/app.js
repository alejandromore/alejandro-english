/* Learning Videos — App Logic */
var activeCategory = "grammar";
var watchedVideos = {};
var currentVideoId = null;

/* Gradient colors per category */
var gradients = {
  grammar: "linear-gradient(135deg,#667eea,#764ba2)",
  reading: "linear-gradient(135deg,#f093fb,#f5576c)",
  listening: "linear-gradient(135deg,#4facfe,#00f2fe)",
  speaking: "linear-gradient(135deg,#43e97b,#38f9d7)",
  writing: "linear-gradient(135deg,#fa709a,#fee140)",
  strategy: "linear-gradient(135deg,#30cfd0,#330867)"
};

/* Load watched videos from localStorage */
function loadWatched() {
  try {
    watchedVideos = JSON.parse(localStorage.getItem("toefl_watched_videos") || "{}");
  } catch(e) {
    watchedVideos = {};
  }
}

/* Save watched videos to localStorage */
function saveWatched() {
  localStorage.setItem("toefl_watched_videos", JSON.stringify(watchedVideos));
}

/* Render category tabs */
function renderTabs() {
  var html = '<div class="tab active" data-cat="all" onclick="selectCategory(\'all\')">📚 All</div>';
  categories.forEach(function(c) {
    var count = videos.filter(function(v){return v.cat === c.id}).length;
    html += '<div class="tab" data-cat="'+c.id+'" onclick="selectCategory(\''+c.id+'\')">'+c.icon+' '+c.name+' ('+count+')</div>';
  });
  document.getElementById("tabs").innerHTML = html;
}

/* Select a category */
function selectCategory(catId) {
  activeCategory = catId;
  document.querySelectorAll(".tab").forEach(function(t) {
    t.classList.toggle("active", t.getAttribute("data-cat") === catId);
  });
  renderVideos();
}

/* Render video grid */
function renderVideos() {
  var searchTerm = document.getElementById("searchBar").value.toLowerCase().trim();
  var filtered = videos.filter(function(v) {
    var catMatch = activeCategory === "all" || v.cat === activeCategory;
    var searchMatch = !searchTerm ||
      v.title.toLowerCase().indexOf(searchTerm) > -1 ||
      v.desc.toLowerCase().indexOf(searchTerm) > -1 ||
      v.channel.toLowerCase().indexOf(searchTerm) > -1 ||
      v.search.toLowerCase().indexOf(searchTerm) > -1;
    return catMatch && searchMatch;
  });

  /* Category title */
  if (activeCategory === "all") {
    document.getElementById("catTitle").innerHTML = "📚 All Videos <span class='count'>("+filtered.length+" videos)</span>";
  } else {
    var cat = categories.find(function(c){return c.id === activeCategory});
    document.getElementById("catTitle").innerHTML = cat.icon+" "+cat.name+" — "+cat.desc+" <span class='count'>("+filtered.length+" videos)</span>";
  }

  /* No results */
  document.getElementById("noResults").style.display = filtered.length === 0 ? "block" : "none";

  /* Video cards */
  var html = filtered.map(function(v, i) {
    var isWatched = watchedVideos[v.id];
    return '<div class="video-card'+(isWatched?" watched":"")+'" onclick="openModal(\''+v.id+'\')">'+
      '<div class="thumb" style="background:'+gradients[v.cat]+'">'+getCatIcon(v.cat)+'</div>'+
      '<div class="video-body">'+
        '<h3>'+v.title+'</h3>'+
        '<p>'+v.desc+'</p>'+
        '<div class="video-meta">'+
          '<span class="meta-channel">📺 '+v.channel+'</span>'+
          '<span class="meta-duration">⏱ '+v.duration+'</span>'+
          '<span class="meta-level">'+v.level+'</span>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join("");
  document.getElementById("videoGrid").innerHTML = html;
  updateProgress();
}

/* Get category icon */
function getCatIcon(cat) {
  var c = categories.find(function(x){return x.id === cat});
  return c ? c.icon : "📹";
}

/* Update progress bar */
function updateProgress() {
  var total = videos.length;
  var watched = videos.filter(function(v){return watchedVideos[v.id]}).length;
  var pct = total > 0 ? Math.round(watched / total * 100) : 0;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressText").textContent = watched + " / " + total + " watched (" + pct + "%)";
}

/* Open modal with video */
function openModal(videoId) {
  var v = videos.find(function(x){return x.id === videoId});
  if (!v) return;
  currentVideoId = videoId;
  document.getElementById("modalVideo").src = "https://www.youtube.com/embed/" + v.id + "?autoplay=1&rel=0";
  document.getElementById("modalTitle").textContent = v.title;
  document.getElementById("modalDesc").textContent = v.desc;
  document.getElementById("modalYtLink").href = "https://www.youtube.com/watch?v=" + v.id;
  /* Tags */
  var cat = categories.find(function(c){return c.id === v.cat});
  document.getElementById("modalTags").innerHTML =
    '<span class="meta-channel">📺 '+v.channel+'</span>'+
    '<span class="meta-duration">⏱ '+v.duration+'</span>'+
    '<span class="meta-level">'+v.level+'</span>'+
    '<span class="meta-level">'+(cat?cat.name:"")+'</span>';
  /* Mark button */
  var markBtn = document.getElementById("modalMarkBtn");
  if (watchedVideos[videoId]) {
    markBtn.classList.add("marked");
    markBtn.textContent = "✓ Watched";
  } else {
    markBtn.classList.remove("marked");
    markBtn.textContent = "✓ Mark as Watched";
  }
  document.getElementById("modalOverlay").classList.add("show");
}

/* Close modal */
function closeModal() {
  document.getElementById("modalVideo").src = "";
  document.getElementById("modalOverlay").classList.remove("show");
  currentVideoId = null;
}

/* Toggle watched status */
function toggleWatched() {
  if (!currentVideoId) return;
  if (watchedVideos[currentVideoId]) {
    delete watchedVideos[currentVideoId];
  } else {
    watchedVideos[currentVideoId] = true;
  }
  saveWatched();
  var markBtn = document.getElementById("modalMarkBtn");
  if (watchedVideos[currentVideoId]) {
    markBtn.classList.add("marked");
    markBtn.textContent = "✓ Watched";
  } else {
    markBtn.classList.remove("marked");
    markBtn.textContent = "✓ Mark as Watched";
  }
  renderVideos();
}

/* Render channels */
function renderChannels() {
  var html = channels.map(function(ch) {
    return '<a class="channel-link" href="'+ch.url+'" target="_blank">▶ '+ch.name+' <span style="color:#999">— '+ch.desc+'</span></a>';
  }).join("");
  document.getElementById("channelList").innerHTML = html;
}

/* Search event */
document.getElementById("searchBar").addEventListener("input", renderVideos);

/* Close modal on overlay click */
document.getElementById("modalOverlay").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

/* Close modal on Escape key */
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") closeModal();
});

/* Initialize */
loadWatched();
renderTabs();
renderVideos();
renderChannels();
