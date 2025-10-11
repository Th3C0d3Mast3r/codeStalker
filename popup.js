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
      problem: `${sub.problem.contestId}-${sub.problem.index}`,
      time: new Date(sub.creationTimeSeconds * 1000)
    }));
  } catch (err) {
    console.error("CF fetch error:", err);
    return [];
  }
}

async function fetchCFOnlineStatus(handle) {
  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}?`);
    const data = await res.json();
    if (data.status !== "OK" || !data.result || !data.result.length) return "UNKNOWN";

    const onlineTime = data.result[0].lastOnlineTimeSeconds; // already in seconds
    const currentTime = Math.floor(Date.now()/1000); // convert ms to seconds

    // make the below to last online time in minutes
    console.log(`${handle} last online: ${Math.floor((currentTime-onlineTime)/60)} minutes ago`);

    return (currentTime-onlineTime<=25*60) ? "ONLINE" : (currentTime-onlineTime>25*60 && currentTime-onlineTime<=40*60)?"RECENTLY ONLINE":"OFFLINE";
  } catch (err) {
    console.error("CF status fetch error:", err);
    return "UNKNOWN";
  }
}


// ===== LeetCode (scraped) =====
async function fetchLeetCodeData(username) {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        query:`
          query recentAcSubmissions($username: String!) {
            recentAcSubmissionList(username: $username) {
              title
              timestamp
            }
          }
        `,
        variables:{ username }
      })
    });
    const data=await res.json();
    return data.data.recentAcSubmissionList.map(sub=>({
      platform:"LeetCode",
      verdict:"ACCEPTED",
      problem:sub.title,
      time:new Date(sub.timestamp*1000)
    }));
  } catch(err) {
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

  // Submissions List
  const list = document.createElement("ul");
  activities.slice(0,6).forEach(act => {
    const li = document.createElement("li");
    const verdictSpan = document.createElement("span");
    verdictSpan.textContent = `[${act.verdict}] `;

    // Verdict colors
    if(act.verdict === "OK"){
      verdictSpan.style.color = "#01d556ff"; // green
      verdictSpan.style.fontWeight = "bold";
    }
    else if(act.verdict === "WRONG_ANSWER"){
      verdictSpan.style.color = "#ce0000ff"; // red
      verdictSpan.style.fontWeight = "bold";
    }
    else if(act.verdict === "TIME_LIMIT_EXCEEDED"){
      verdictSpan.style.color = "#c59d00ff"; // yellow
      verdictSpan.style.fontWeight = "bold";
    }
    else if(act.verdict === "ACCEPTED"){
      verdictSpan.style.color = "#01d556ff"; // green
      verdictSpan.style.fontWeight = "bold";
    }
    else {
      verdictSpan.style.color = "#bbb"; // fallback grey
      verdictSpan.style.fontWeight = "bold";
    }

    li.appendChild(verdictSpan);
    const dateStr=act.time.toLocaleString().substring(0,9); // submission date
    const grayDate=`%c(${dateStr})`;
    const normalText=`${act.platform} - ${act.problem} `;
    const text=document.createTextNode(`${normalText}`);
    li.appendChild(text);

    // create a span just for the gray date
    const dateSpan=document.createElement("span");
    dateSpan.textContent=`(${dateStr})`;
    dateSpan.style.color="gray";

    li.appendChild(dateSpan);
    list.appendChild(li);
  });
  if (activities.length > 6) {
    const more = document.createElement("li");
    more.textContent = "more...";
    list.appendChild(more);
  }

  // Collapse submissions for non-ONLINE friends
  if(friend.status !== "ONLINE"){
    list.style.display="none";
    let expanded=false;
    container.addEventListener("click",()=>{
      expanded=!expanded;
      list.style.display=expanded?"block":"none";
    });
  }

  container.appendChild(list);

  // Footer: status + remove
  const footer = document.createElement("div");
  footer.className = "friend-footer";

  const statusBadge = document.createElement("span");
  statusBadge.className = "status-badge";
  statusBadge.textContent = friend.status || "UNKNOWN";

  if(friend.status === "ONLINE") statusBadge.classList.add("online");
  else if(friend.status === "OFFLINE") statusBadge.classList.add("offline");
  else if(friend.status === "RECENTLY ONLINE") statusBadge.classList.add("recently-online");

  footer.appendChild(statusBadge);

  // this is the place where I add the EDIT BUTTON
  const editBtn=document.createElement("button");
  editBtn.className="edit-btn";
  editBtn.textContent="EDIT";
  editBtn.addEventListener("click",()=>{
    document.getElementById("friendName").value=friend.realName;
    document.getElementById("cfHandle").value=friend.codeforces || "";
    document.getElementById("lcHandle").value=friend.leetcode || "";
    saveFriends(getFriends().filter(f=>f.realName!==friend.realName)); // remove old entry
    modal.style.display="block";
    backdrop.style.display="block";
  });
  footer.appendChild(editBtn);

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

  return container;
}

async function renderFriends() {
  const friendsContainer = document.getElementById("friendsContainer");
  friendsContainer.innerHTML = "";

  const friends = getFriends();

  const friendsWithStatus = await Promise.all(
    friends.map(async friend => {
      let status = "UNKNOWN";
      if (friend.codeforces) {
        status = await fetchCFOnlineStatus(friend.codeforces);
      }
      return { ...friend, status };
    })
  );

  friendsWithStatus.sort((a, b) => {
    const priority = s => s === "ONLINE" ? 0 : s === "RECENTLY ONLINE" ? 1 : 2;
    return priority(a.status) - priority(b.status);
  });

  for (let i = 0; i < friendsWithStatus.length; i++) {
    const friend = friendsWithStatus[i];
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
  const realName = document.getElementById("friendName").value.trim();
  const cfHandle = document.getElementById("cfHandle").value.trim();
  const lcHandle = document.getElementById("lcHandle").value.trim();

  if (!realName) return alert("Please enter a real name!");

  const friends = getFriends();
  friends.push({ realName, codeforces: cfHandle, leetcode: lcHandle });
  saveFriends(friends);

  document.getElementById("friendName").value = "";
  document.getElementById("cfHandle").value = "";
  document.getElementById("lcHandle").value = "";

  modal.style.display = "none";
  backdrop.style.display = "none";
  renderFriends();
});

const addFriendBtn = document.getElementById("addFriendBtn"); // your existing button
const modal = document.getElementById("addFriendModal");
const backdrop = document.getElementById("modalBackdrop");
const cancelBtn = document.getElementById("cancelFriendBtn");

addFriendBtn.addEventListener("click", () => {
  modal.style.display = "block";
  backdrop.style.display = "block";
});

cancelBtn.addEventListener("click", () => {
  modal.style.display = "none";
  backdrop.style.display = "none";
});

// close if backdrop clicked
backdrop.addEventListener("click", () => {
  modal.style.display = "none";
  backdrop.style.display = "none";
});

// ===== Init =====
renderFriends();
setInterval(renderFriends, 2 * 60 * 1000); // refresh every 2 mins