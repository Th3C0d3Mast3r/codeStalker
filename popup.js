function getFriends() {
  return JSON.parse(localStorage.getItem("friends") || "[]");
}
function saveFriends(friends) {
  localStorage.setItem("friends", JSON.stringify(friends));
}


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



async function fetchLeetCodeData(username) {
  try {
    const res = await fetch(`https://leetcode.com/u/${username}/`);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "text/html");

    const submissions = [...doc.querySelectorAll('[data-title]')].map(el => {
      const problem = el.getAttribute("data-title");
      const timeText = el.querySelector("span")?.innerText || "";
      return {
        platform: "LeetCode",
        verdict: "ACCEPTED", // only showing solved list
        problem,
        time: new Date(), // fallback since LC doesn't expose exact timestamp in text
        timeText
      };
    });

    return submissions;
  } catch (err) {
    console.error("LC fetch error:", err);
    return [];
  }
}




function renderFriendCard(friend, activities) {
  const container = document.createElement("div");
  container.className = "friend-card";

  // Header
  const header = document.createElement("h3");
  header.textContent = friend.realName;
  container.appendChild(header);

  const codeforcesId=document.createElement("p");
  codeforcesId.textContent=`@${friend.codeforces || "N/A"}`;
  container.appendChild(codeforcesId);

  const leetcodeId=document.createElement("p");
  leetcodeId.textContent=`@${friend.leetcode || "N/A"}`;
  container.appendChild(leetcodeId);

  // make the leetcodeID and codeforcesID on the same line
    codeforcesId.style.display="inline-block";
    leetcodeId.style.display="inline-block";
    leetcodeId.style.marginLeft="10px";
    codeforcesId.style.marginRight="10px";
    codeforcesId.style.fontWeight="light";
    leetcodeId.style.fontWeight="light";
    

  // Stats List
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

  // here, I want to add a horizontal divider
    const hr = document.createElement("hr");
    container.appendChild(hr);

    // now, I want to show, if he is ACTIVE or INACTIVE on Codeforces
    const status = document.createElement("p");
    const now = new Date();
    const lastCfAct = activities.find(act => act.platform === "Codeforces");
    if (lastCfAct && (now - lastCfAct.time) < 7 * 24 * 60 * 60 * 1000) {
      status.textContent = "Status: ACTIVE on Codeforces";
      status.style.color = "green";
    } else {
      status.textContent = "Status: INACTIVE on Codeforces";
      status.style.color = "red";
    }

  container.appendChild(list);
  return container;
}



async function renderFriends() {
  const friendsContainer = document.getElementById("friendsContainer");
  friendsContainer.innerHTML = "";

  const friends = getFriends();
  for (let friend of friends) {
    let allActs = [];

    if (friend.codeforces) {
      const cfActs = await fetchCodeforcesData(friend.codeforces);
      allActs = allActs.concat(cfActs);
    }
    if (friend.leetcode) {
      const lcActs = await fetchLeetCodeData(friend.leetcode);
      allActs = allActs.concat(lcActs);
    }

    // Sort by time (newest first)
    allActs.sort((a, b) => b.time - a.time);

    const card = renderFriendCard(friend, allActs);
    friendsContainer.appendChild(card);
  }
}

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