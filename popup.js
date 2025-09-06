function getFriends() {
  return JSON.parse(localStorage.getItem("friends") || "[]");
}
function saveFriends(friends) {
  localStorage.setItem("friends", JSON.stringify(friends));
}

// ===== Codeforces API =====
async function fetchCodeforcesData(handle) {
  try {
    const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10`);
    const data = await res.json();
    if (data.status !== "OK") return [];

    return data.result.map(sub => ({
      platform: "Codeforces",
      verdict: sub.verdict || "UNKNOWN",
      problem: `${sub.problem.contestId}-${sub.problem.index}: ${sub.problem.name}`,
      time: new Date(sub.creationTimeSeconds * 1000)
    }));
  } catch (err) {
    console.error("CF fetch error:", err);
    return [];
  }
}

async function fetchCFOnlineStatus(handle) {
  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
    const data = await res.json();
    if (data.status!=="OK") return "OFFLINE";

    const lastOnline = data.result[0].lastOnlineTimeSeconds * 1000;
    const diff = Date.now() - lastOnline;

    return diff <= 1 * 60 * 1000 ? "ONLINE" : "OFFLINE";
  } catch (err) {
    console.error("CF status error:", err);
    return "OFFLINE";
  }
}

// ===== LeetCode (scraped) =====
async function fetchLeetCodeData(username) {
  try {
    const res = await fetch(`https://leetcode.com/u/${username}/`);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "text/html");

    const submissions = [...doc.querySelectorAll('[data-title]')].map(el => {
      const problem = el.getAttribute("data-title");
      return {
        platform: "LeetCode",
        verdict: "ACCEPTED",
        problem,
        time: new Date()
      };
    });

    return submissions;
  } catch (err) {
    console.error("LC fetch error:", err);
    return [];
  }
}

// ===== Rendering =====
function renderFriendCard(friend, activities, index) {
  const container = document.createElement("div");
  container.className = "friend-card";
  if (index % 2 === 1) container.classList.add("alt");

  // Name
  const header = document.createElement("h3");
  header.textContent = friend.realName;
  container.appendChild(header);

  // Handles
  const handles = document.createElement("p");
  handles.textContent = `@${friend.codeforces || "N/A"} | @${friend.leetcode || "N/A"}`;
  container.appendChild(handles);

  // Submissions
  const list = document.createElement("ul");
  activities.slice(0, 6).forEach(act => {
    const li = document.createElement("li");
    li.textContent = `[${act.verdict}] ${act.platform} - ${act.problem}`;
    list.appendChild(li);
  });
  if (activities.length > 6) {
    const more = document.createElement("li");
    more.textContent = "more...";
    list.appendChild(more);
  }
  container.appendChild(list);

  // Footer
  const footer = document.createElement("div");
  footer.className = "friend-footer";

  const statusBadge = document.createElement("span");
  statusBadge.className = "status-badge";
  statusBadge.textContent = "Checking...";
  footer.appendChild(statusBadge);

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.textContent = "REMOVE";
  removeBtn.addEventListener("click", () => {
    let friends = getFriends();
    friends = friends.filter(f => f.realName !== friend.realName);
    saveFriends(friends);
    renderFriends();
  });
  footer.appendChild(removeBtn);

  container.appendChild(footer);

  // Fetch online status
  if (friend.codeforces) {
    fetchCFOnlineStatus(friend.codeforces).then(status => {
      statusBadge.textContent = status;
      statusBadge.classList.remove("online", "offline");
      if (status === "ONLINE") statusBadge.classList.add("online");
      else statusBadge.classList.add("offline");
    });
  }

  return container;
}

async function renderFriends() {
  const friendsContainer = document.getElementById("friendsContainer");
  friendsContainer.innerHTML = "";

  const friends = getFriends();
  for (let i = 0; i < friends.length; i++) {
    const friend = friends[i];
    let allActs = [];

    if (friend.codeforces) {
      const cfActs = await fetchCodeforcesData(friend.codeforces);
      allActs = allActs.concat(cfActs);
    }
    if (friend.leetcode) {
      const lcActs = await fetchLeetCodeData(friend.leetcode);
      allActs = allActs.concat(lcActs);
    }

    allActs.sort((a, b) => b.time - a.time);
    const card = renderFriendCard(friend, allActs, i);
    friendsContainer.appendChild(card);
  }
}

// ===== Modal Logic =====
document.getElementById("saveFriendBtn")?.addEventListener("click", () => {
  const realName = document.getElementById("inRealName").value.trim();
  const cfHandle = document.getElementById("inCodeforces").value.trim();
  const lcHandle = document.getElementById("inLeetcode").value.trim();

  if (!realName) return alert("Please enter a real name!");

  const friends = getFriends();
  friends.push({ realName, codeforces: cfHandle, leetcode: lcHandle });
  saveFriends(friends);

  document.getElementById("modal").classList.add("hidden");
  renderFriends();
});

document.getElementById("cancelBtn")?.addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

document.getElementById("addFriendBtn")?.addEventListener("click", () => {
  document.getElementById("modal").classList.remove("hidden");
});

// ===== Init =====
renderFriends();
setInterval(renderFriends, 5 * 60 * 1000); // refresh every 5 mins