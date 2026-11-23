const ASSISTANT = "edutrack";
const messages = [];
const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("message");
const send = document.getElementById("send");
const welcome = document.getElementById("welcome");
function addBubble(role, content) {
  const el = document.createElement("div");
  el.className = "bubble " + role;
  el.textContent = content;
  chat.appendChild(el);
  el.scrollIntoView({behavior:"smooth",block:"end"});
}
async function checkHealth() {
  try {
    const r = await fetch("/api/health"); const d = await r.json();
    document.getElementById("statusDot").style.background = d.ready ? "#00dfa8" : "#e5a33b";
    document.getElementById("statusText").textContent = d.ready ? "AI connected" : "API key not configured";
  } catch {
    document.getElementById("statusText").textContent = "Server not running";
  }
}
function schoolSummary() {
  if (ASSISTANT !== "edutrack") return "";
  try {
    const raw = localStorage.getItem("edutrack_v1");
    if (!raw) return "No EduTrack records were found in this browser.";
    const d = JSON.parse(raw);
    const students = Array.isArray(d.students) ? d.students : [];
    const marks = Array.isArray(d.marks) ? d.marks : [];
    const attendance = Array.isArray(d.attendance) ? d.attendance : [];
    const fees = Array.isArray(d.fees) ? d.fees : [];
    const due = fees.reduce((n,f)=>n+Number(f.due||0),0);
    const paid = fees.reduce((n,f)=>n+Number(f.paid||0),0);
    const classes = [...new Set(students.map(s=>s.className).filter(Boolean))];
    return `Summary only: ${students.length} students; ${classes.length} classes; ${marks.length} mark records; ${attendance.length} attendance records; fees due ${due} RWF; fees paid ${paid} RWF. Do not expose individual student details unless the user provides them in this chat.`;
  } catch { return "EduTrack data could not be read."; }
}
async function sendMessage(text) {
  const value = text.trim(); if (!value) return;
  welcome.style.display = "none";
  messages.push({role:"user",content:value});
  addBubble("user", value);
  input.value = ""; send.disabled = true; send.textContent = "…";
  const pending = document.createElement("div");
  pending.className = "bubble assistant"; pending.textContent = "Thinking…"; chat.appendChild(pending);
  try {
    const response = await fetch("/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({assistant:ASSISTANT,messages,schoolContext:schoolSummary()})
    });
    const data = await response.json();
    pending.remove();
    if (!response.ok) throw new Error(data.error || "Request failed");
    messages.push({role:"assistant",content:data.reply});
    addBubble("assistant",data.reply);
  } catch (err) {
    pending.textContent = "Error: " + err.message;
    pending.style.borderColor = "#8b4a50";
  } finally { send.disabled = false; send.textContent = "Send ↑"; input.focus(); }
}
form.addEventListener("submit",e=>{e.preventDefault();sendMessage(input.value);});
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>sendMessage(b.dataset.prompt)));
document.getElementById("newChat").addEventListener("click",()=>{messages.length=0;chat.innerHTML="";welcome.style.display="block";input.focus();});
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
checkHealth();
