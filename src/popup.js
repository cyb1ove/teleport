import QRCode from "qrcode";
import { Api } from "telegram";
import { parseLink } from "./parseLink.js";
import {
  checkPassword,
  connect,
  getPasswordHint,
  iterHistory,
  loadSettings,
  qrLogin,
  resendCode,
  resolveChannel,
  saveSettings,
  sendCode,
  signIn,
} from "./telegram.js";

const $ = (id) => document.getElementById(id);
let client = null;
let settings = {};
let qrRun = 0; // id of the current QR login; any other value means cancelled

function status(text) {
  $("status").textContent = text;
}

function show(section) {
  for (const id of ["credentials", "login", "qr", "fetch"]) $(id).hidden = id !== section;
}

async function save(values) {
  Object.assign(settings, values);
  await saveSettings(values);
}

// --- Connection and login -------------------------------------------------

async function start() {
  status("Підключення…");
  client = await connect(settings);
  // Persist the auth key right away: a pending login code is tied to it.
  await save({ session: client.session.save() });

  if (await client.checkAuthorization()) return showFetch();
  await showLoginStep();
}

async function showLoginStep() {
  const step = settings.login?.step ?? "phone";
  const input = $("loginInput");
  input.value = "";
  input.type = step === "password" ? "password" : "text";
  $("loginReset").hidden = step === "phone";
  $("loginQr").hidden = step !== "phone";
  $("loginResend").hidden = !(step === "code" && settings.login.canResend);

  if (step === "phone") $("loginLabel").textContent = "Номер телефону (+380…)";
  if (step === "code") {
    $("loginLabel").textContent = `Код для ${settings.login.phone} надіслано ${settings.login.delivery ?? "(спосіб невідомий: натисніть «Інший номер»)"}`;
  }
  if (step === "password") {
    const hint = await getPasswordHint(client);
    $("loginLabel").textContent = hint ? `Пароль 2FA (підказка: ${hint})` : "Пароль 2FA";
  }

  show("login");
  status("");
  input.focus();
}

async function submitLoginStep(value) {
  const step = settings.login?.step ?? "phone";

  if (step === "phone") {
    status("Надсилаю код…");
    const codeStep = await sendCode(client, { ...settings, phone: value });
    // sendCode may move the session to another data center.
    await save({ session: client.session.save(), login: { step: "code", phone: value, ...codeStep } });
    return showLoginStep();
  }

  if (step === "code") {
    status("Перевіряю код…");
    const passwordNeeded = await signIn(client, { ...settings.login, code: value });
    if (passwordNeeded) {
      await save({ login: { ...settings.login, step: "password" } });
      return showLoginStep();
    }
  }

  if (step === "password") {
    status("Перевіряю пароль…");
    await checkPassword(client, value);
  }

  await save({ session: client.session.save(), login: null });
  await showFetch();
}

async function resendLoginCode() {
  status("Надсилаю код іншим способом…");
  const codeStep = await resendCode(client, settings.login);
  await save({ login: { ...settings.login, ...codeStep } });
  await showLoginStep();
}

async function startQrLogin() {
  const run = ++qrRun;
  const cancelled = () => run !== qrRun;
  show("qr");
  status("Готую QR-код…");
  const passwordNeeded = await qrLogin(client, settings, {
    isCancelled: cancelled,
    onQr: async (url, expiresAt) => {
      if (cancelled()) return;
      await QRCode.toCanvas($("qrCanvas"), url, { width: 240, margin: 1 });
      status(`Чекаю на сканування… QR оновиться о ${new Date(expiresAt).toLocaleTimeString()}.`);
    },
  });
  if (cancelled()) return;
  qrRun++;

  // The login may have moved the session to another data center.
  if (passwordNeeded) {
    await save({ session: client.session.save(), login: { step: "password" } });
    return showLoginStep();
  }
  await save({ session: client.session.save(), login: null });
  await showFetch();
}

async function cancelQrLogin() {
  qrRun++;
  await showLoginStep();
}

async function resetLogin() {
  await save({ login: null });
  await showLoginStep();
}

async function showFetch() {
  const me = await client.getMe();
  console.log("[teleport] logged in as", me.username ?? me.phone, me);
  show("fetch");
  status(`Увійшли як ${me.firstName ?? ""} (@${me.username ?? "—"}).`);
}

async function logOut() {
  await client.invoke(new Api.auth.LogOut());
  await client.disconnect();
  await save({ session: "", login: null });
  client = null;
  show("credentials");
  status("Сесію завершено.");
}

// --- Loading messages -----------------------------------------------------

function summarize(message) {
  return {
    id: message.id,
    date: new Date(message.date * 1000).toISOString(),
    text: message.message,
    views: message.views,
    forwards: message.forwards,
    media: message.media?.className ?? null,
    groupedId: message.groupedId?.toString() ?? null,
  };
}

// Mirrors a batch of messages into the tab's own DevTools console.
// Fails silently on pages the extension has no host permission for.
async function logToTab(tabId, title, rows) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [title, rows],
      func: (title, rows) => {
        console.groupCollapsed(title);
        for (const row of rows) console.log(`#${row.id} ${row.date}\n${row.text}`, row);
        console.groupEnd();
      },
    });
  } catch {}
}

// Small batches: the popup may close at any moment, and whatever was sent stays in the tab.
const TAB_BATCH = 20;

async function loadFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const ref = tab?.url ? parseLink(tab.url) : null;
  if (!ref) {
    status(`У вкладці немає посилання на канал:\n${tab?.url ?? "—"}`);
    return;
  }

  status(`Шукаю канал: ${JSON.stringify(ref)}…`);
  const entity = await resolveChannel(client, ref);
  const name = entity.title ?? entity.username ?? String(entity.id);
  console.log(`[teleport] channel «${name}»`, entity);

  const limit = Number($("limit").value) || 0;
  let count = 0;
  let batch = [];
  const flush = async () => {
    if (!batch.length) return;
    await logToTab(tab.id, `[teleport] «${name}» ${count - batch.length + 1}–${count}`, batch);
    batch = [];
  };

  for await (const message of iterHistory(client, entity, { limit })) {
    const row = summarize(message);
    console.log(`[teleport] #${row.id} ${row.date}\n${row.text}`, message);
    batch.push(row);
    count++;
    if (batch.length === TAB_BATCH) {
      await flush();
      status(`«${name}»: отримано ${count}…`);
    }
  }
  await flush();

  console.log(`[teleport] done: ${count} messages from «${name}»`);
  status(`«${name}»: отримано ${count} повідомлень. Дивіться консоль вкладки (F12).`);
}

// --- Wiring ---------------------------------------------------------------

function formatWait(seconds) {
  if (seconds < 60) return `${seconds} с`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} хв`;
  return `${Math.floor(seconds / 3600)} год ${Math.ceil((seconds % 3600) / 60)} хв`;
}

function guard(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error("[teleport]", error);
      const message = error.errorMessage ?? error.message;
      if (error.seconds !== undefined && /FLOOD/.test(message)) {
        const until = new Date(Date.now() + error.seconds * 1000).toLocaleTimeString();
        status(`Забагато спроб. Telegram просить зачекати ${formatWait(error.seconds)} (до ${until}).`);
        return;
      }
      status(`Помилка: ${message}`);
      // An expired or invalid code can't be retried: start over from the phone number.
      if (/PHONE_CODE_EXPIRED|PHONE_CODE_HASH_EMPTY/.test(message)) await resetLogin();
    }
  };
}

$("credentials").onsubmit = guard(async (event) => {
  event.preventDefault();
  const apiId = $("apiId").value.trim();
  const apiHash = $("apiHash").value.trim();
  if (!apiId || !apiHash) return status("Вкажіть api_id та api_hash.");
  await save({ apiId, apiHash });
  await start();
});

$("login").onsubmit = guard(async (event) => {
  event.preventDefault();
  const value = $("loginInput").value.trim();
  if (value) await submitLoginStep(value);
});

$("loginReset").onclick = guard(resetLogin);
$("loginResend").onclick = guard(resendLoginCode);
$("loginQr").onclick = guard(startQrLogin);
$("qrCancel").onclick = guard(cancelQrLogin);
$("load").onclick = guard(loadFromActiveTab);
$("logout").onclick = guard(logOut);

guard(async () => {
  settings = await loadSettings();
  $("apiId").value = settings.apiId ?? "";
  $("apiHash").value = settings.apiHash ?? "";
  show("credentials"); // stays visible if connecting fails, so the keys can be fixed
  if (settings.apiId && settings.apiHash) await start();
})();
